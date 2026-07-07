"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Button, Checkbox, Empty, Input, Modal, Spin, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import {
  getAnthropicPptJob,
  getGoogleDriveDownloadUrl,
  listAnthropicPptJobs,
  listGoogleDriveFiles,
  startAnthropicPptJob,
} from "@/lib/api";
import type { AnthropicPptJob } from "@/types/anthropic";
import type { GoogleDriveFile } from "@/types/googleDrive";
import styles from "./ClaudeFolderModal.module.css";

const DEFAULT_PROMPT =
  "첨부한 스타일 스펙 md에 정의된 스타일/레이아웃/서식 그대로, 체크한 제안서 첨부파일을 페이지별로 PPT 슬라이드로 만들어줘.";

const BUNDLED_PPT_TEMPLATE_NAME = "ppt_styled_template_v2.md";

type PptFolderModalProps = {
  folder: GoogleDriveFile | null;
  activeJob: AnthropicPptJob | null;
  onClose: () => void;
  onJobStarted?: (job: AnthropicPptJob) => void;
  onJobUpdated?: (job: AnthropicPptJob) => void;
  onFolderFilesChanged?: () => void;
};

function formatFileSize(size: number | null) {
  if (size == null || size <= 0) {
    return "-";
  }
  const units = ["B", "KB", "MB", "GB"];
  let value = size;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function isPptResultFile(fileName: string) {
  return /^claude-ppt-.*\.pptx$/i.test(fileName);
}

function isClaudeResultFile(fileName: string) {
  return /^claude-.*\.md$/i.test(fileName);
}

function isProposalSourceFile(file: GoogleDriveFile) {
  const lowerName = file.name.toLowerCase();
  if (isClaudeResultFile(file.name) || isPptResultFile(file.name)) {
    return false;
  }
  return lowerName.endsWith(".md") || lowerName.endsWith(".markdown") || lowerName.endsWith(".txt");
}

function selectionStorageKey(folderId: string) {
  return `ppt-modal-selection:${folderId}`;
}

function loadSavedSelection(folderId: string, files: GoogleDriveFile[]) {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.sessionStorage.getItem(selectionStorageKey(folderId));
    if (!raw) {
      return [];
    }
    const savedIds = JSON.parse(raw) as string[];
    const validIds = new Set(files.map((file) => file.id));
    return savedIds.filter((id) => validIds.has(id));
  } catch {
    return [];
  }
}

function saveSelection(folderId: string, ids: string[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(selectionStorageKey(folderId), JSON.stringify(ids));
}

function defaultSelectedAttachmentIds(files: GoogleDriveFile[]) {
  const proposalFiles = files.filter(isProposalSourceFile);
  if (proposalFiles.length === 0) {
    return [];
  }
  const primary = [...proposalFiles].sort((left, right) => (right.size ?? 0) - (left.size ?? 0))[0];
  return primary ? [primary.id] : [];
}

function resolveInitialSelection(folderId: string, files: GoogleDriveFile[]) {
  const saved = loadSavedSelection(folderId, files);
  if (saved.length > 0) {
    return saved;
  }
  return defaultSelectedAttachmentIds(files);
}

function isJobActive(status: string | undefined) {
  return status === "pending" || status === "in_progress";
}

export default function PptFolderModal({
  folder,
  activeJob,
  onClose,
  onJobStarted,
  onJobUpdated,
  onFolderFilesChanged,
}: PptFolderModalProps) {
  const { message } = App.useApp();
  const [folderFiles, setFolderFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnthropicPptJob | null>(null);
  const [latestSavedFileName, setLatestSavedFileName] = useState<string | null>(null);

  const pptResultFiles = useMemo(
    () =>
      folderFiles
        .filter((file) => isPptResultFile(file.name))
        .sort((left, right) => right.name.localeCompare(left.name)),
    [folderFiles]
  );

  const selectableFiles = useMemo(
    () => folderFiles.filter((file) => !isPptResultFile(file.name)),
    [folderFiles]
  );

  const loadModalData = useCallback(
    async (targetFolder: GoogleDriveFile) => {
      setIsLoadingModal(true);
      try {
        const [folderListing, folderJobs] = await Promise.all([
          listGoogleDriveFiles(targetFolder.id),
          listAnthropicPptJobs({ driveFolderIds: [targetFolder.id] }),
        ]);
        const files = folderListing.files.filter((file) => !file.folder);
        const initialSelection = resolveInitialSelection(targetFolder.id, files);
        setFolderFiles(files);
        setSelectedAttachmentIds(initialSelection);
        saveSelection(targetFolder.id, initialSelection);
        setPrompt(DEFAULT_PROMPT);

        const latestJob = folderJobs[0] ?? null;
        setCurrentJob(latestJob);
        if (latestJob?.savedDriveFileName) {
          setLatestSavedFileName(latestJob.savedDriveFileName);
        }
      } catch (error) {
        setFolderFiles([]);
        setSelectedAttachmentIds([]);
        setPrompt(DEFAULT_PROMPT);
        setCurrentJob(null);
        message.error(error instanceof Error ? error.message : "PPT 모달 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoadingModal(false);
      }
    },
    [message]
  );

  useEffect(() => {
    if (!folder) {
      setFolderFiles([]);
      setSelectedAttachmentIds([]);
      setPrompt(DEFAULT_PROMPT);
      setCurrentJob(null);
      setLatestSavedFileName(null);
      return;
    }
    void loadModalData(folder);
  }, [folder?.id, loadModalData]);

  useEffect(() => {
    if (!activeJob || !folder || activeJob.driveFolderId !== folder.id) {
      return;
    }
    setCurrentJob(activeJob);
  }, [activeJob, folder]);

  useEffect(() => {
    if (!folder || !currentJob || !isJobActive(currentJob.status)) {
      return;
    }

    const intervalId = window.setInterval(async () => {
      try {
        const updated = await getAnthropicPptJob(currentJob.jobId);
        setCurrentJob(updated);
        onJobUpdated?.(updated);

        if (updated.status === "completed") {
          setLatestSavedFileName(updated.savedDriveFileName ?? null);
          const folderListing = await listGoogleDriveFiles(folder.id);
          setFolderFiles(folderListing.files.filter((file) => !file.folder));
          onFolderFilesChanged?.();
          message.success(`PPT 생성이 완료되었습니다: ${updated.savedDriveFileName ?? "파일"}`);
        } else if (updated.status === "failed") {
          message.error(updated.errorMessage || "PPT 생성에 실패했습니다.");
        }
      } catch {
        // 폴링 실패는 조용히 무시하고 다음 주기에 재시도
      }
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [currentJob?.jobId, currentJob?.status, folder, message, onFolderFilesChanged, onJobUpdated]);

  const toggleAttachment = (fileId: string, checked: boolean) => {
    setSelectedAttachmentIds((current) => {
      const next = checked
        ? current.includes(fileId)
          ? current
          : [...current, fileId]
        : current.filter((id) => id !== fileId);
      if (folder) {
        saveSelection(folder.id, next);
      }
      return next;
    });
  };

  const handleStart = async () => {
    if (!folder) {
      return;
    }
    if (isJobActive(currentJob?.status)) {
      message.info("이미 PPT 생성 작업이 진행 중입니다.");
      return;
    }

    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      message.warning("프롬프트를 입력해 주세요.");
      return;
    }
    if (selectedAttachmentIds.length === 0) {
      message.warning("PPT 생성에 사용할 첨부파일을 하나 이상 선택해 주세요.");
      return;
    }

    setIsStarting(true);
    try {
      const job = await startAnthropicPptJob({
        projectName: folder.name,
        driveFolderId: folder.id,
        prompt: trimmedPrompt,
        attachmentFileIds: selectedAttachmentIds,
      });
      saveSelection(folder.id, selectedAttachmentIds);
      setCurrentJob(job);
      onJobStarted?.(job);
      message.success("PPT 생성 작업을 백그라운드에서 시작했습니다. 페이지를 새로고침해도 계속 진행됩니다.");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "PPT 생성 작업 시작에 실패했습니다.");
    } finally {
      setIsStarting(false);
    }
  };

  const jobStatusTag = () => {
    if (!currentJob) {
      return null;
    }
    if (currentJob.status === "pending" || currentJob.status === "in_progress") {
      return (
        <Tag color="processing" icon={<Spin size="small" />}>
          PPT 생성 중
        </Tag>
      );
    }
    if (currentJob.status === "completed") {
      return <Tag color="success">완료</Tag>;
    }
    if (currentJob.status === "failed") {
      return <Tag color="error">실패</Tag>;
    }
    return null;
  };

  return (
    <Modal
      title={folder ? `PPT 생성 — ${folder.name}` : "PPT 생성"}
      open={folder != null}
      onCancel={onClose}
      width={720}
      footer={
        <Button type="primary" onClick={onClose}>
          닫기
        </Button>
      }
      destroyOnHidden={false}
    >
      {isLoadingModal ? (
        <div className={styles.loading}>
          <Spin />
          <span>폴더 파일을 불러오는 중...</span>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.headerRow}>
            {jobStatusTag()}
            <span className={styles.hint}>
              <code>{BUNDLED_PPT_TEMPLATE_NAME}</code> 스타일 템플릿은 서버에 고정 저장되어 요청마다 자동 첨부됩니다.
              아래에서 체크한 제안서 파일과 함께 Claude가 PPT를 생성합니다.
            </span>
          </div>

          {currentJob?.status === "failed" && currentJob.errorMessage ? (
            <div className={styles.resultHint}>{currentJob.errorMessage}</div>
          ) : null}

          <div className={styles.section}>
            <div className={styles.sectionTitle}>생성된 PPT 파일</div>
            {pptResultFiles.length === 0 ? (
              <div className={styles.resultHint}>
                PPT 생성이 완료되면 이 공유 드라이브 폴더에 <code>claude-ppt-*.pptx</code> 파일이 자동 저장됩니다.
              </div>
            ) : (
              <div className={styles.resultFileList}>
                {pptResultFiles.map((file) => (
                  <div
                    key={file.id}
                    className={
                      latestSavedFileName === file.name
                        ? `${styles.resultFileItem} ${styles.resultFileItemHighlight}`
                        : styles.resultFileItem
                    }
                  >
                    <span className={styles.resultFileName}>{file.name}</span>
                    <Button
                      size="small"
                      icon={<DownloadOutlined />}
                      href={getGoogleDriveDownloadUrl(file.id)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      다운로드
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>고정 첨부 (자동)</div>
            <div className={styles.attachmentList}>
              <label className={styles.attachmentItem}>
                <Checkbox checked disabled />
                <span className={styles.attachmentName}>{BUNDLED_PPT_TEMPLATE_NAME}</span>
                <span className={styles.attachmentMeta}>서버 템플릿</span>
              </label>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>제안서 첨부 파일</div>
            <div className={styles.resultHint}>
              처음 열면 가장 큰 제안서 md 1개만 선택됩니다. 선택은 모달을 닫았다 열어도 유지됩니다.
            </div>
            {selectableFiles.length === 0 ? (
              <Empty description="이 폴더에 첨부할 파일이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className={styles.attachmentList}>
                {selectableFiles.map((file) => (
                  <label key={file.id} className={styles.attachmentItem}>
                    <Checkbox
                      checked={selectedAttachmentIds.includes(file.id)}
                      disabled={isJobActive(currentJob?.status)}
                      onChange={(event) => toggleAttachment(file.id, event.target.checked)}
                    />
                    <span className={styles.attachmentName}>{file.name}</span>
                    <span className={styles.attachmentMeta}>{formatFileSize(file.size)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>프롬프트</div>
            <Input.TextArea
              className={styles.promptTextarea}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              disabled={isStarting || isJobActive(currentJob?.status)}
            />
            <div className={styles.actions}>
              <Button
                type="primary"
                loading={isStarting || isJobActive(currentJob?.status)}
                disabled={isJobActive(currentJob?.status)}
                onClick={() => void handleStart()}
              >
                PPT 생성 시작
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Checkbox, Empty, Input, Modal, Spin, Tag } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  getAnthropicConversationHistory,
  getGoogleDriveDownloadUrl,
  listGoogleDriveFiles,
  sendAnthropicProjectMessage,
} from "@/lib/api";
import type { AnthropicConversationMessage } from "@/types/anthropic";
import type { GoogleDriveFile } from "@/types/googleDrive";
import styles from "./ClaudeFolderModal.module.css";

const DEFAULT_PROMPT = `심사위원이 제안서 체점을 한다고 하였을때, 회사 신용등급, 인력구성 등 어쩔수 없는 부분들은 제외하고
제안서 내용으로서의 점수를 평가해주고 약점을 보완해주길 바래.
만점이 되면 제안서md파일 내용에 대한 수정본을 md파일로 다운로드 할수 있게 해주고

6명의 각기 다른 심사위원이 있다는 가정하에 진행해줘`;

const CONTINUE_PROMPT =
  "이전 응답에서 중단된 제안서 수정본 마크다운을 이어서 작성해줘. 이미 작성한 내용은 반복하지 말고, ```markdown 코드 블록 안의 본문만 완성할 때까지 계속 작성해줘.";

type ClaudeFolderModalProps = {
  folder: GoogleDriveFile | null;
  onClose: () => void;
  onConversationUpdated?: () => void;
};

function downloadMarkdown(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

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

function isClaudeResultFile(fileName: string) {
  return /^claude-.*\.md$/i.test(fileName);
}

export default function ClaudeFolderModal({ folder, onClose, onConversationUpdated }: ClaudeFolderModalProps) {
  const { message } = App.useApp();
  const [messages, setMessages] = useState<AnthropicConversationMessage[]>([]);
  const [folderFiles, setFolderFiles] = useState<GoogleDriveFile[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [isLoadingModal, setIsLoadingModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [latestSavedFileName, setLatestSavedFileName] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const claudeResultFiles = useMemo(
    () =>
      folderFiles
        .filter((file) => isClaudeResultFile(file.name))
        .sort((left, right) => right.name.localeCompare(left.name)),
    [folderFiles]
  );

  const loadModalData = useCallback(
    async (targetFolder: GoogleDriveFile) => {
      setIsLoadingModal(true);
      try {
        const [historyResult, folderListing] = await Promise.all([
          getAnthropicConversationHistory(targetFolder.name),
          listGoogleDriveFiles(targetFolder.id),
        ]);
        const files = folderListing.files.filter((file) => !file.folder);
        setMessages(historyResult.messages);
        setFolderFiles(files);
        setSelectedAttachmentIds(files.filter((file) => !isClaudeResultFile(file.name)).map((file) => file.id));
        setPrompt(DEFAULT_PROMPT);
      } catch (error) {
        setMessages([]);
        setFolderFiles([]);
        setSelectedAttachmentIds([]);
        setPrompt(DEFAULT_PROMPT);
        message.error(error instanceof Error ? error.message : "Claude 모달 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoadingModal(false);
      }
    },
    [message]
  );

  useEffect(() => {
    if (!folder) {
      setMessages([]);
      setFolderFiles([]);
      setSelectedAttachmentIds([]);
      setPrompt(DEFAULT_PROMPT);
      setLatestSavedFileName(null);
      return;
    }
    void loadModalData(folder);
  }, [folder?.id, loadModalData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSubmitting]);

  const handleClose = () => {
    onClose();
  };

  const toggleAttachment = (fileId: string, checked: boolean) => {
    setSelectedAttachmentIds((current) => {
      if (checked) {
        return current.includes(fileId) ? current : [...current, fileId];
      }
      return current.filter((id) => id !== fileId);
    });
  };

  const selectedAttachments = useMemo(
    () => folderFiles.filter((file) => selectedAttachmentIds.includes(file.id)),
    [folderFiles, selectedAttachmentIds]
  );

  const selectedAttachmentSize = useMemo(
    () => selectedAttachments.reduce((sum, file) => sum + (file.size ?? 0), 0),
    [selectedAttachments]
  );

  const submitPrompt = useCallback(
    async (promptText: string, options?: { resetPromptToDefault?: boolean }) => {
      const trimmedPrompt = promptText.trim();
      if (!folder || !trimmedPrompt) {
        message.warning("프롬프트를 입력해 주세요.");
        return;
      }

      const optimisticUserMessage: AnthropicConversationMessage = {
        role: "user",
        content:
          selectedAttachmentIds.length > 0
            ? `[첨부: ${selectedAttachments.map((file) => file.name).join(", ")}]\n\n${trimmedPrompt}`
            : trimmedPrompt,
        createdAt: new Date().toISOString(),
      };
      setMessages((current) => [...current, optimisticUserMessage]);
      setIsSubmitting(true);

      try {
        const result = await sendAnthropicProjectMessage(
          folder.name,
          trimmedPrompt,
          selectedAttachmentIds,
          folder.id
        );
        const [historyResult, folderListing] = await Promise.all([
          getAnthropicConversationHistory(folder.name),
          listGoogleDriveFiles(folder.id),
        ]);
        const files = folderListing.files.filter((file) => !file.folder);
        setMessages(historyResult.messages);
        setFolderFiles(files);
        setSelectedAttachmentIds(files.filter((file) => !isClaudeResultFile(file.name)).map((file) => file.id));
        if (options?.resetPromptToDefault !== false) {
          setPrompt(DEFAULT_PROMPT);
        }

        if (result.savedDriveFileName) {
          setLatestSavedFileName(result.savedDriveFileName);
          message.success(`공유 드라이브 폴더에 저장했습니다: ${result.savedDriveFileName}`);
        } else if (result.driveSaveError) {
          message.warning(`Claude 응답은 받았지만 드라이브 저장에 실패했습니다. ${result.driveSaveError}`);
        } else {
          message.warning("Claude 응답은 받았지만 드라이브에 저장되지 않았습니다. 대화 기록의 MD 다운로드를 이용해 주세요.");
        }

        if (result.stopReason === "max_tokens") {
          message.warning(
            "응답이 출력 한도에 도달했습니다. 아래 '계속 작성' 버튼으로 수정본을 이어서 작성해 주세요."
          );
        }

        onConversationUpdated?.();
      } catch (error) {
        setMessages((current) => current.filter((item) => item !== optimisticUserMessage));
        message.error(error instanceof Error ? error.message : "Claude 요청에 실패했습니다.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [folder, message, onConversationUpdated, selectedAttachmentIds, selectedAttachments]
  );

  const handleSubmit = async () => {
    await submitPrompt(prompt);
  };

  const handleContinueWriting = async () => {
    setPrompt(CONTINUE_PROMPT);
    await submitPrompt(CONTINUE_PROMPT, { resetPromptToDefault: true });
  };

  return (
    <Modal
      title={folder ? `Claude — ${folder.name}` : "Claude"}
      open={folder != null}
      onCancel={handleClose}
      width={860}
      footer={
        <Button type="primary" onClick={handleClose}>
          닫기
        </Button>
      }
      destroyOnHidden={false}
    >
      {isLoadingModal ? (
        <div className={styles.loading}>
          <Spin />
          <span>폴더 파일과 대화 기록을 불러오는 중...</span>
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.headerRow}>
            <Tag color="purple">Claude API</Tag>
            <span className={styles.hint}>
              체크한 파일은 Claude 요청 시 첨부됩니다. 대용량 제안서(수십~수백 KB)는 자동 이어쓰기 후 완성본만 드라이브에 저장됩니다.
              {selectedAttachmentSize >= 100 * 1024 ? " 대용량 첨부가 선택되어 응답에 수 분이 걸릴 수 있습니다." : ""}
            </span>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Claude 결과 파일</div>
            {claudeResultFiles.length === 0 ? (
              <div className={styles.resultHint}>
                Claude 응답이 완료되면 이 공유 드라이브 폴더에 <code>claude-*.md</code> 파일이 자동 저장됩니다.
              </div>
            ) : (
              <div className={styles.resultFileList}>
                {claudeResultFiles.map((file) => (
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
            <div className={styles.sectionTitle}>첨부 파일</div>
            {folderFiles.length === 0 ? (
              <Empty description="이 폴더에 첨부할 파일이 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div className={styles.attachmentList}>
                {folderFiles.map((file) => (
                  <label key={file.id} className={styles.attachmentItem}>
                    <Checkbox
                      checked={selectedAttachmentIds.includes(file.id)}
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
              rows={5}
              disabled={isSubmitting}
            />
            <div className={styles.actions}>
              <Button onClick={() => void handleContinueWriting()} disabled={isSubmitting || messages.length === 0}>
                계속 작성
              </Button>
              <Button type="primary" loading={isSubmitting} onClick={() => void handleSubmit()}>
                Claude에게 요청
              </Button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>대화 기록</div>
            <div className={styles.chatList}>
              {messages.length === 0 ? (
                <Empty description="아직 대화가 없습니다." image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                messages.map((item, index) => (
                  <div
                    key={`${item.createdAt}-${index}`}
                    className={item.role === "user" ? styles.userBubble : styles.assistantBubble}
                  >
                    <div className={styles.bubbleRole}>{item.role === "user" ? "나" : "Claude"}</div>
                    {item.role === "assistant" ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
                    ) : (
                      <p className={styles.userText}>{item.content}</p>
                    )}
                    {item.role === "assistant" && item.content.trim() ? (
                      <div className={styles.bubbleActions}>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() =>
                            downloadMarkdown(`claude-${folder?.name ?? "result"}-${index + 1}.md`, item.content)
                          }
                        >
                          MD 다운로드
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
              {isSubmitting ? (
                <div className={styles.loading}>
                  <Spin size="small" />
                  <span>Claude가 응답을 작성하고 있습니다. 대용량 제안서는 자동 이어쓰기로 수 분 걸릴 수 있습니다...</span>
                </div>
              ) : null}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

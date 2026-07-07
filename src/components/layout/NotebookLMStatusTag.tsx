"use client";

import { useCallback, useEffect, useState } from "react";
import { App, Input, Modal, Spin, Tag, Upload } from "antd";
import type { UploadFile } from "antd";
import {
  getNotebookLMStatus,
  importNotebookLMAuth,
  startNotebookLMLogin,
} from "@/lib/api";
import type { NotebookLMStatus } from "@/types/notebooklm";
import styles from "./NotebookLMStatusTag.module.css";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTagLabel(status: NotebookLMStatus | null) {
  if (!status) {
    return "NotebookLM 확인 중";
  }
  if (status.loginInProgress) {
    return "NotebookLM 연동 중";
  }
  if (status.authenticated) {
    return "NotebookLM 연동됨";
  }
  if (!status.pythonAvailable) {
    return "NotebookLM 미설정";
  }
  return "NotebookLM 미연동";
}

function getTagClassName(status: NotebookLMStatus | null) {
  if (!status) {
    return styles.notebookTagPending;
  }
  if (status.loginInProgress) {
    return styles.notebookTagPending;
  }
  if (status.authenticated) {
    return styles.notebookTagConnected;
  }
  return styles.notebookTagDisconnected;
}

export default function NotebookLMStatusTag() {
  const { message } = App.useApp();
  const [status, setStatus] = useState<NotebookLMStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [masterTokenFile, setMasterTokenFile] = useState<UploadFile[]>([]);
  const [storageStateFile, setStorageStateFile] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);

  const refreshStatus = useCallback(async () => {
    try {
      const next = await getNotebookLMStatus();
      setStatus(next);
      if (next.accountEmail) {
        setAccountEmail(next.accountEmail);
      }
      return next;
    } catch (error) {
      const text = error instanceof Error ? error.message : "NotebookLM 상태를 불러오지 못했습니다.";
      setStatus(null);
      message.error(text);
      return null;
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!modalOpen || !status?.loginInProgress) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt < 90; attempt += 1) {
        await sleep(2000);
        if (cancelled) {
          return;
        }
        const next = await refreshStatus();
        if (next?.authenticated) {
          message.success("NotebookLM 연동이 완료되었습니다.");
          setConnecting(false);
          return;
        }
        if (!next?.loginInProgress) {
          setConnecting(false);
          return;
        }
      }
      setConnecting(false);
      message.warning("연동 확인 시간이 초과되었습니다. 잠시 후 다시 확인해 주세요.");
    })();

    return () => {
      cancelled = true;
    };
  }, [modalOpen, status?.loginInProgress, refreshStatus, message]);

  const handleOpenModal = () => {
    setModalOpen(true);
    void refreshStatus();
  };

  const handleStartLogin = async () => {
    const email = accountEmail.trim();
    if (!email) {
      message.warning("Google 계정 이메일을 입력해 주세요.");
      return;
    }

    setConnecting(true);
    try {
      await startNotebookLMLogin(email);
      message.info("서버에서 브라우저가 열리면 Google 로그인을 완료해 주세요.");
      await refreshStatus();
    } catch (error) {
      const text = error instanceof Error ? error.message : "NotebookLM 연동 시작에 실패했습니다.";
      message.error(text);
      setConnecting(false);
    }
  };

  const handleImportAuth = async () => {
    const masterToken = masterTokenFile[0]?.originFileObj;
    const storageState = storageStateFile[0]?.originFileObj;
    if (!masterToken || !storageState) {
      message.warning("master_token.json과 storage_state.json을 모두 선택해 주세요.");
      return;
    }

    setImporting(true);
    try {
      await importNotebookLMAuth(masterToken, storageState);
      message.success("인증 파일을 등록했습니다.");
      await refreshStatus();
    } catch (error) {
      const text = error instanceof Error ? error.message : "인증 파일 업로드에 실패했습니다.";
      message.error(text);
    } finally {
      setImporting(false);
    }
  };

  const tagLabel = getTagLabel(status);

  return (
    <>
      <button
        type="button"
        className={`${styles.notebookTag} ${getTagClassName(status)}`}
        onClick={handleOpenModal}
        aria-label="NotebookLM 연동 상태"
      >
        {loading ? <Spin size="small" /> : <span className={styles.notebookDot} aria-hidden />}
        {tagLabel}
      </button>

      <Modal
        title="NotebookLM 연동"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <div className={styles.modalBody}>
          <div className={styles.statusBox}>
            <div>
              상태:{" "}
              {status?.authenticated ? (
                <Tag color="success">연동됨</Tag>
              ) : status?.loginInProgress ? (
                <Tag color="processing">연동 중</Tag>
              ) : (
                <Tag color="error">미연동</Tag>
              )}
            </div>
            {status?.accountEmail && <div>계정: {status.accountEmail}</div>}
            <div>{status?.message || "NotebookLM 연동 상태를 확인할 수 없습니다."}</div>
          </div>

          {!status?.authenticated && (
            <>
              <div>
                <div className={styles.uploadLabel}>1. Google 계정으로 연동 (로컬 서버 권장)</div>
                <Input
                  value={accountEmail}
                  onChange={(event) => setAccountEmail(event.target.value)}
                  placeholder="you@gmail.com"
                  disabled={connecting || status?.loginInProgress}
                />
              </div>

              <button
                type="button"
                className={styles.notebookTag}
                onClick={handleStartLogin}
                disabled={connecting || status?.loginInProgress || !status?.pythonAvailable}
              >
                {connecting || status?.loginInProgress ? "로그인 대기 중..." : "연동 시작"}
              </button>

              <ul className={styles.hintList}>
                <li>연동 시작을 누르면 서버 PC에 Chrome 창이 열립니다.</li>
                <li>그 창에서 Google 로그인을 완료하면 태그가 연동됨으로 바뀝니다.</li>
                <li>Python이 없다면 프로젝트에서 `scripts/notebooklm/setup.ps1`을 먼저 실행하세요.</li>
              </ul>

              <div className={styles.uploadRow}>
                <div className={styles.uploadLabel}>2. 클라우드 서버용 인증 파일 업로드</div>
                <Upload
                  accept=".json,application/json"
                  maxCount={1}
                  fileList={masterTokenFile}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setMasterTokenFile(fileList)}
                >
                  <button type="button">master_token.json 선택</button>
                </Upload>
                <Upload
                  accept=".json,application/json"
                  maxCount={1}
                  fileList={storageStateFile}
                  beforeUpload={() => false}
                  onChange={({ fileList }) => setStorageStateFile(fileList)}
                >
                  <button type="button">storage_state.json 선택</button>
                </Upload>
                <button
                  type="button"
                  className={styles.notebookTag}
                  onClick={handleImportAuth}
                  disabled={importing}
                >
                  {importing ? "업로드 중..." : "인증 파일 등록"}
                </button>
              </div>

              <ul className={styles.hintList}>
                <li>클라우드에는 브라우저가 없어서, 로컬 PC에서 1회 인증 후 JSON 파일을 업로드합니다.</li>
                <li>업로드 후에는 서버가 자동으로 세션을 갱신합니다.</li>
              </ul>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}

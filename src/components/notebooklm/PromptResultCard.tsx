"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { Button, Spin, Tag } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  buildMarkdownPreviewFromPrompt,
  downloadNotebookPromptMarkdown,
  resolveNotebookPromptTitle,
} from "@/components/notebooklm/notebooklmPrompt";
import type { NotebookLMProjectPrompt } from "@/types/notebooklm";
import styles from "./PromptResultCard.module.css";

type PromptResultCardProps = {
  prompt: NotebookLMProjectPrompt;
  onOpenFullscreen: (preview: { title: string; content: string }) => void;
};

export default function PromptResultCard({ prompt, onOpenFullscreen }: PromptResultCardProps) {
  const title = resolveNotebookPromptTitle(prompt.question, prompt.turn);
  const answer = prompt.answer?.trim() ?? "";
  const isRunning = prompt.status === "running";
  const isFailed = prompt.status === "failed";

  return (
    <div className={`${styles.card} ${isFailed ? styles.cardFailed : ""}`}>
      <div className={styles.turn}>#{prompt.turn}</div>
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <div className={styles.title}>{title}</div>
          {isRunning ? <Tag color="processing">실행 중</Tag> : null}
          {isFailed ? <Tag color="error">실패</Tag> : null}
        </div>

        {isRunning ? (
          <div className={styles.runningState}>
            <Spin size="small" />
            <span>NotebookLM 응답을 생성하고 있습니다.</span>
          </div>
        ) : isFailed ? (
          <p className={styles.failedMessage}>{prompt.message || answer || "프롬프트 실행에 실패했습니다."}</p>
        ) : answer ? (
          <>
            <div className={styles.answerPreview}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
            </div>
            <div className={styles.actions}>
              <Button
                size="small"
                type="primary"
                onClick={() => onOpenFullscreen(buildMarkdownPreviewFromPrompt(prompt))}
              >
                크게 보기
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadNotebookPromptMarkdown(prompt)}
              >
                MD 다운로드
              </Button>
            </div>
          </>
        ) : (
          <p className={styles.pending}>응답이 아직 없습니다. STEP 실행이 완료되면 이곳에 표시됩니다.</p>
        )}

        <details className={styles.requestDetails}>
          <summary className={styles.requestSummary}>요청 프롬프트</summary>
          <div className={styles.requestText}>{prompt.question}</div>
        </details>
      </div>
    </div>
  );
}

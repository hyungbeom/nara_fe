"use client";

import { Spin } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./NotebookSummaryPanel.module.css";

type NotebookSummaryPanelProps = {
  title?: string;
  summary?: string;
  message?: string;
  loading?: boolean;
};

export default function NotebookSummaryPanel({ title = "첨부파일 요약", summary, message, loading = false }: NotebookSummaryPanelProps) {
  return (
    <div className={styles.summarySection}>
      <div className={styles.summaryTitle}>{title}</div>
      {loading ? (
        <div className={styles.summaryLoading}>
          <Spin size="small" />
          <span>요약을 불러오는 중입니다.</span>
        </div>
      ) : summary ? (
        <div className={styles.summaryBody}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      ) : (
        <p className={styles.summaryMessage}>{message ?? "요약을 생성하는 중입니다."}</p>
      )}
    </div>
  );
}

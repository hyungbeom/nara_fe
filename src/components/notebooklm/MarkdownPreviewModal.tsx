"use client";

import { Button, Empty, Modal } from "antd";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styles from "./MarkdownPreviewModal.module.css";

type MarkdownPreviewModalProps = {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
};

export default function MarkdownPreviewModal({ open, title, content, onClose }: MarkdownPreviewModalProps) {
  const trimmedContent = content.trim();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onClose}
      width={920}
      footer={
        <Button type="primary" onClick={onClose}>
          닫기
        </Button>
      }
      destroyOnHidden
    >
      {trimmedContent ? (
        <div className={styles.markdownBody}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{trimmedContent}</ReactMarkdown>
        </div>
      ) : (
        <Empty description="표시할 마크다운 내용이 없습니다." />
      )}
    </Modal>
  );
}

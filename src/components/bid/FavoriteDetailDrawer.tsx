"use client";

import { useCallback, useState } from "react";
import { App, Button, Descriptions, Drawer, Tooltip } from "antd";
import { FilePdfOutlined, PaperClipOutlined } from "@ant-design/icons";
import {
  convertFavoriteAttachmentToPdf,
  getFavoriteAttachmentDownloadUrl,
  uploadFavoriteAttachmentToGoogleDrive,
} from "@/lib/api";
import type { BidFavorite, BidFavoriteAttachment } from "@/types/bid";
import styles from "./BidDetailDrawer.module.css";

type FavoriteDetailDrawerProps = {
  favorite: BidFavorite | null;
  open: boolean;
  onClose: () => void;
  onAttachmentsChange?: () => Promise<BidFavorite | null | void>;
};

function GoogleDriveIcon() {
  return (
    <svg className={styles.googleDriveIcon} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M7.71 2.5 1.15 12l3.43 5.5h6.56L17.6 12 12.27 2.5z" />
      <path fill="#FBBC05" d="M16.29 2.5H7.71l5.33 9.5h10.62z" />
      <path fill="#34A853" d="M1.15 12 6.71 22.5h10.62L12.27 12z" />
      <path fill="#EA4335" d="M12.27 12 17.6 2.5H7.71L1.15 12z" />
    </svg>
  );
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function renderDetailContent(content?: string) {
  if (!content) {
    return <div className={styles.detailContent}>저장된 상세 내용이 없습니다.</div>;
  }

  if (content.includes("<")) {
    return (
      <div
        className={`${styles.detailContent} ${styles.detailContentHtml}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return <div className={styles.detailContent}>{content}</div>;
}

function formatFileSize(size?: number) {
  if (!size) {
    return "";
  }
  if (size < 1024) {
    return `${size}B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function getDisplayFileName(file: BidFavoriteAttachment) {
  if (file.convertedFromHwpx) {
    return file.fileName || file.originalFileName.replace(/\.(hwpx|hwp)$/i, ".pdf");
  }
  return file.originalFileName || file.fileName;
}

function getAttachmentLabel(file: BidFavoriteAttachment) {
  if (file.convertedFromHwpx) {
    return "PDF 변환본";
  }
  if (file.fileName.toLowerCase().endsWith(".hwpx") || file.fileName.toLowerCase().endsWith(".hwp")) {
    return "한글 원본";
  }
  if (file.fileName.toLowerCase().endsWith(".pdf")) {
    return "PDF";
  }
  return "원본";
}

function isHancomDocument(file: BidFavoriteAttachment) {
  const name = (file.originalFileName || file.fileName).toLowerCase();
  return name.endsWith(".hwpx") || name.endsWith(".hwp");
}

function hasConvertedPdf(file: BidFavoriteAttachment, attachments: BidFavoriteAttachment[]) {
  const originalName = file.originalFileName || file.fileName;
  return attachments.some(
    (item) => item.convertedFromHwpx && item.originalFileName === originalName
  );
}

function canConvertToPdf(file: BidFavoriteAttachment, attachments: BidFavoriteAttachment[]) {
  return !file.convertedFromHwpx && isHancomDocument(file) && !hasConvertedPdf(file, attachments);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGoogleDriveUpload(
  attachmentSeq: number,
  refresh?: () => Promise<BidFavorite | null | void>,
  maxAttempts = 60,
  intervalMs = 2000
) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const updatedFavorite = await refresh?.();
    const attachment = updatedFavorite?.attachments?.find(
      (item) => item.attachmentSeq === attachmentSeq
    );
    if (attachment?.googleDriveFileId) {
      return attachment;
    }
    await sleep(intervalMs);
  }
  return null;
}

export default function FavoriteDetailDrawer({
  favorite,
  open,
  onClose,
  onAttachmentsChange,
}: FavoriteDetailDrawerProps) {
  const { message } = App.useApp();
  const [convertingSeq, setConvertingSeq] = useState<number | null>(null);
  const [uploadingSeqs, setUploadingSeqs] = useState<Set<number>>(() => new Set());
  const attachments = favorite?.attachments ?? [];

  const markUploading = useCallback((attachmentSeq: number, uploading: boolean) => {
    setUploadingSeqs((current) => {
      const next = new Set(current);
      if (uploading) {
        next.add(attachmentSeq);
      } else {
        next.delete(attachmentSeq);
      }
      return next;
    });
  }, []);

  const handleConvertToPdf = async (file: BidFavoriteAttachment) => {
    setConvertingSeq(file.attachmentSeq);
    try {
      await convertFavoriteAttachmentToPdf(file.attachmentSeq);
      message.success("PDF로 변환해 저장했습니다.");
      await onAttachmentsChange?.();
    } catch (error) {
      const text = error instanceof Error ? error.message : "PDF 변환에 실패했습니다.";
      message.error(text);
    } finally {
      setConvertingSeq(null);
    }
  };

  const handleUploadToGoogleDrive = (file: BidFavoriteAttachment) => {
    if (uploadingSeqs.has(file.attachmentSeq) || file.googleDriveFileId) {
      return;
    }

    markUploading(file.attachmentSeq, true);

    void (async () => {
      try {
        await uploadFavoriteAttachmentToGoogleDrive(file.attachmentSeq);
        const uploaded = await waitForGoogleDriveUpload(file.attachmentSeq, onAttachmentsChange);
        if (uploaded) {
          message.success("구글 드라이브에 저장했습니다.");
        } else {
          message.error(
            "구글 드라이브 저장이 완료되지 않았거나 결과 확인에 실패했습니다. 잠시 후 목록을 새로고침해 주세요."
          );
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "구글 드라이브 저장에 실패했습니다.";
        message.error(text);
      } finally {
        markUploading(file.attachmentSeq, false);
      }
    })();
  };

  return (
    <Drawer
      title={<span className={styles.drawerTitleText}>{favorite?.bidName ?? "저장된 공고"}</span>}
      size={760}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {favorite && (
        <>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="공고번호">{favorite.bidNo}</Descriptions.Item>
            <Descriptions.Item label="업종">{favorite.industry || "-"}</Descriptions.Item>
            <Descriptions.Item label="계약방법">{favorite.contractMethod || "-"}</Descriptions.Item>
            <Descriptions.Item label="공고일자">{favorite.announceDate}</Descriptions.Item>
            <Descriptions.Item label="개찰일시">{favorite.openingDate || "-"}</Descriptions.Item>
            <Descriptions.Item label="추정가격">{formatPrice(favorite.estimatedPrice)}</Descriptions.Item>
            <Descriptions.Item label="공고기관">{favorite.agency || "-"}</Descriptions.Item>
            <Descriptions.Item label="담당자">
              <div>
                <div>{favorite.contactName || "-"}</div>
                {favorite.contactPhone && (
                  <div className={styles.contactPhone}>{favorite.contactPhone}</div>
                )}
              </div>
            </Descriptions.Item>
          </Descriptions>

          <h3 className={styles.sectionTitle}>공고 상세내용</h3>
          {renderDetailContent(favorite.detailContent)}

          <h3 className={styles.sectionTitle}>저장된 첨부파일</h3>
          {attachments.length > 0 ? (
            <ul className={styles.attachmentList}>
              {attachments.map((file) => (
                <li key={file.attachmentSeq} className={styles.attachmentItem}>
                  <div className={styles.attachmentRow}>
                    <a
                      href={getFavoriteAttachmentDownloadUrl(file.attachmentSeq)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.attachmentLink}
                    >
                      <PaperClipOutlined />{" "}
                      <span className={styles.fileName}>
                        {getDisplayFileName(file)}
                      </span>
                      <span className={styles.attachmentMeta}>
                        [{getAttachmentLabel(file)}]
                        {file.fileSize ? ` ${formatFileSize(file.fileSize)}` : ""}
                      </span>
                    </a>
                    <div className={styles.attachmentActions}>
                      {canConvertToPdf(file, attachments) && (
                        <Tooltip title="PDF로 변환저장">
                          <Button
                            type="text"
                            className={`${styles.attachmentActionButton} ${styles.pdfActionButton}`}
                            icon={<FilePdfOutlined />}
                            loading={convertingSeq === file.attachmentSeq}
                            onClick={() => handleConvertToPdf(file)}
                            aria-label="PDF로 변환저장"
                          />
                        </Tooltip>
                      )}
                      {!file.googleDriveFileId && (
                        <Tooltip title="구글 드라이브에 저장">
                          <Button
                            type="text"
                            className={styles.attachmentActionButton}
                            icon={<GoogleDriveIcon />}
                            loading={uploadingSeqs.has(file.attachmentSeq)}
                            disabled={uploadingSeqs.has(file.attachmentSeq)}
                            onClick={() => handleUploadToGoogleDrive(file)}
                            aria-label="구글 드라이브에 저장"
                          />
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyAttachments}>저장된 첨부파일이 없습니다.</div>
          )}

          {favorite.detailUrl && (
            <div className={styles.externalLink}>
              <a href={favorite.detailUrl} target="_blank" rel="noreferrer">
                나라장터에서 보기 →
              </a>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

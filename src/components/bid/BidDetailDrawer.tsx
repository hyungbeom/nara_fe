"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Descriptions, Drawer, Spin, message } from "antd";
import { PaperClipOutlined, StarFilled, StarOutlined } from "@ant-design/icons";
import { addBidFavorite, checkBidFavorite, getBidDetail, removeBidFavorite } from "@/lib/api";
import type { BidDetail } from "@/types/bid";
import type { BidSearchResult } from "@/types/bid";
import styles from "./BidDetailDrawer.module.css";

type BidDetailDrawerProps = {
  bid: BidSearchResult | null;
  open: boolean;
  industryCode?: string;
  industryName?: string;
  onClose: () => void;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function renderDetailContent(content: string) {
  if (!content) {
    return <div className={styles.detailContent}>상세 내용이 없습니다.</div>;
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

export default function BidDetailDrawer({
  bid,
  open,
  industryCode,
  industryName,
  onClose,
}: BidDetailDrawerProps) {
  const [detail, setDetail] = useState<BidDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  useEffect(() => {
    if (!open || !bid) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setDetail(null);
    setIsFavorite(false);

    getBidDetail(bid.bidNo, bid.bidOrd, bid.announceDate, industryCode, industryName)
      .then(setDetail)
      .catch((error) => {
        const message = error instanceof Error ? error.message : "상세 정보를 불러오지 못했습니다.";
        setErrorMessage(message);
      })
      .finally(() => setIsLoading(false));

    checkBidFavorite(bid.bidNo, bid.bidOrd, bid.announceDate)
      .then((result) => setIsFavorite(result.favorited))
      .catch(() => setIsFavorite(false));
  }, [bid, industryCode, industryName, open]);

  const handleToggleFavorite = useCallback(async () => {
    if (!bid || isFavoriteLoading) {
      return;
    }

    setIsFavoriteLoading(true);

    try {
      if (isFavorite) {
        await removeBidFavorite(bid.bidNo, bid.bidOrd, bid.announceDate);
        setIsFavorite(false);
        message.success("즐겨찾기에서 삭제했습니다.");
      } else {
        await addBidFavorite(bid);
        setIsFavorite(true);
        message.success("즐겨찾기에 저장했습니다.");
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "즐겨찾기 처리에 실패했습니다.";
      message.error(text);
    } finally {
      setIsFavoriteLoading(false);
    }
  }, [bid, isFavorite, isFavoriteLoading]);

  const displayBidNo = detail?.bidNo ?? bid?.bidNo ?? "-";
  const displayIndustry = detail?.industry ?? bid?.industry ?? "-";
  const displayContractMethod = detail?.contractMethod ?? bid?.contractMethod ?? "-";
  const displayAnnounceDate = detail?.announceDate ?? bid?.announceDate ?? "-";
  const displayOpeningDate = detail?.openingDate ?? bid?.openingDate ?? "-";
  const displayEstimatedPrice = detail?.estimatedPrice ?? bid?.estimatedPrice ?? 0;
  const displayAgency = detail?.agency ?? bid?.agency ?? "-";
  const displayDetailUrl = detail?.detailUrl ?? bid?.detailUrl;

  return (
    <Drawer
      title={
        <div className={styles.drawerTitle}>
          <span className={styles.drawerTitleText}>{bid?.bidName ?? "공고 상세"}</span>
          {bid && (
            <Button
              type="text"
              className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ""}`}
              icon={isFavorite ? <StarFilled /> : <StarOutlined />}
              loading={isFavoriteLoading}
              aria-label={isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
              onClick={handleToggleFavorite}
            />
          )}
        </div>
      }
      size={760}
      open={open}
      onClose={onClose}
      destroyOnHidden
    >
      {bid && (
        <>
          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="공고번호">{displayBidNo}</Descriptions.Item>
            <Descriptions.Item label="업종">{displayIndustry}</Descriptions.Item>
            <Descriptions.Item label="계약방법">{displayContractMethod}</Descriptions.Item>
            <Descriptions.Item label="공고일자">{displayAnnounceDate}</Descriptions.Item>
            <Descriptions.Item label="개찰일시">{displayOpeningDate || "-"}</Descriptions.Item>
            <Descriptions.Item label="추정가격">{formatPrice(displayEstimatedPrice)}</Descriptions.Item>
            <Descriptions.Item label="공고기관">{displayAgency}</Descriptions.Item>
            {detail && (
              <>
                <Descriptions.Item label="입찰마감">{detail.bidCloseDate || "-"}</Descriptions.Item>
                <Descriptions.Item label="예산금액">
                  {detail.budgetAmount > 0 ? formatPrice(detail.budgetAmount) : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="수요기관">{detail.demandAgency || "-"}</Descriptions.Item>
                <Descriptions.Item label="담당자">
                  <div>
                    <div>{detail.contactName || "-"}</div>
                    {detail.contactPhone && (
                      <div className={styles.contactPhone}>{detail.contactPhone}</div>
                    )}
                  </div>
                </Descriptions.Item>
                <Descriptions.Item label="지역제한">
                  <span style={{ whiteSpace: "pre-line" }}>{detail.regionRestriction || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="업종제한사항">
                  <span style={{ whiteSpace: "pre-line" }}>{detail.industryRestriction || "-"}</span>
                </Descriptions.Item>
                <Descriptions.Item label="낙찰방법">{detail.successBidMethod || "-"}</Descriptions.Item>
                <Descriptions.Item label="입찰방식">{detail.bidMethod || "-"}</Descriptions.Item>
              </>
            )}
          </Descriptions>

          {isLoading && (
            <div className={styles.loadingBar}>
              <Spin size="small" /> <span>첨부파일·상세 정보 불러오는 중…</span>
            </div>
          )}

          {errorMessage && <Alert type="error" message={errorMessage} showIcon className={styles.error} />}

          {detail && (
            <>
              <h3 className={styles.sectionTitle}>공고 상세내용</h3>
              {renderDetailContent(detail.detailContent)}

              <h3 className={styles.sectionTitle}>첨부파일</h3>
              {detail.attachments.length > 0 ? (
                <ul className={styles.attachmentList}>
                  {detail.attachments.map((file) => (
                    <li key={`${file.fileName}-${file.fileUrl}`} className={styles.attachmentItem}>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer">
                        <PaperClipOutlined /> <span className={styles.fileName}>{file.fileName}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={styles.emptyAttachments}>첨부파일이 없습니다.</div>
              )}
            </>
          )}

          {displayDetailUrl && (
            <div className={styles.externalLink}>
              <a href={displayDetailUrl} target="_blank" rel="noreferrer">
                나라장터에서 보기 →
              </a>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}

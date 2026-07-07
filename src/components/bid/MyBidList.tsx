"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { App, Button, Popconfirm, Spin, Table } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import FavoriteDetailDrawer from "@/components/bid/FavoriteDetailDrawer";
import { getBidFavorites, removeBidFavorite } from "@/lib/api";
import type { BidFavorite } from "@/types/bid";
import styles from "./MyBidList.module.css";

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("ko-KR");
}

function buildRowKey(record: BidFavorite) {
  return `${record.favoriteSeq}-${record.bidNo}-${record.bidOrd}-${record.announceDate}`;
}

export default function MyBidList() {
  const { message } = App.useApp();
  const [favorites, setFavorites] = useState<BidFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedBid, setSelectedBid] = useState<BidFavorite | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);
  const suppressRowClickRef = useRef(false);

  const loadFavorites = useCallback(async () => {
    setErrorMessage("");

    try {
      const data = await getBidFavorites();
      setFavorites(data);
      return data;
    } catch (error) {
      const text = error instanceof Error ? error.message : "즐겨찾기 목록을 불러오지 못했습니다.";
      setErrorMessage(text);
      setFavorites([]);
      return [];
    }
  }, []);

  const refreshFavorites = useCallback(async (): Promise<BidFavorite | null> => {
    const data = await loadFavorites();
    let updated: BidFavorite | null = null;
    setSelectedBid((current) => {
      if (!current) {
        return current;
      }
      updated = data.find((item) => item.favoriteSeq === current.favoriteSeq) ?? current;
      return updated;
    });
    return updated;
  }, [loadFavorites]);

  useEffect(() => {
    setIsLoading(true);
    loadFavorites().finally(() => setIsLoading(false));
  }, [loadFavorites]);

  const openDetail = (record: BidFavorite) => {
    setSelectedBid(record);
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSelectedBid(null);
  };

  const handleRemove = useCallback(async (record: BidFavorite) => {
    const rowKey = buildRowKey(record);
    setRemovingKey(rowKey);

    try {
      await removeBidFavorite(record.bidNo, record.bidOrd, record.announceDate);
      setFavorites((prev) => prev.filter((item) => buildRowKey(item) !== rowKey));
      setSelectedBid((current) => {
        if (current?.favoriteSeq === record.favoriteSeq) {
          setDrawerOpen(false);
          return null;
        }
        return current;
      });
      message.success("즐겨찾기에서 삭제했습니다.");
    } catch (error) {
      const text = error instanceof Error ? error.message : "삭제에 실패했습니다.";
      message.error(text);
    } finally {
      setRemovingKey(null);
    }
  }, [message]);

  const handleConfirmRemove = useCallback(
    (record: BidFavorite) => {
      suppressRowClickRef.current = true;
      void handleRemove(record).finally(() => {
        window.setTimeout(() => {
          suppressRowClickRef.current = false;
        }, 150);
      });
    },
    [handleRemove]
  );

  const shouldIgnoreRowClick = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    return Boolean(
      target.closest("button")
      || target.closest("a")
      || target.closest(".ant-popconfirm")
      || target.closest(".ant-popover")
    );
  }, []);

  const columns = useMemo<TableColumnsType<BidFavorite>>(
    () => [
      {
        title: "공고번호",
        dataIndex: "bidNo",
        key: "bidNo",
        width: 120,
        fixed: "left",
      },
      {
        title: "공고명",
        dataIndex: "bidName",
        key: "bidName",
        width: 320,
        ellipsis: true,
        render: (value: string, record) =>
          record.detailUrl ? (
            <a
              href={record.detailUrl}
              target="_blank"
              rel="noreferrer"
              className={styles.link}
              onClick={(event) => event.stopPropagation()}
            >
              {value}
            </a>
          ) : (
            value
          ),
      },
      {
        title: "업종",
        dataIndex: "industry",
        key: "industry",
        width: 150,
        ellipsis: true,
      },
      {
        title: "계약방법",
        dataIndex: "contractMethod",
        key: "contractMethod",
        width: 120,
      },
      {
        title: "공고일자",
        dataIndex: "announceDate",
        key: "announceDate",
        width: 120,
      },
      {
        title: "개찰일자",
        dataIndex: "openingDate",
        key: "openingDate",
        width: 120,
      },
      {
        title: "추정가격",
        dataIndex: "estimatedPrice",
        key: "estimatedPrice",
        width: 120,
        align: "right",
        render: (value: number) => formatPrice(value),
      },
      {
        title: "공고기관",
        dataIndex: "agency",
        key: "agency",
        width: 150,
        ellipsis: true,
      },
      {
        title: "첨부",
        key: "attachments",
        width: 72,
        align: "center",
        render: (_, record) => (record.attachments?.length ?? 0).toLocaleString("ko-KR"),
      },
      {
        title: "저장일시",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        render: (value: string) => formatCreatedAt(value),
      },
      {
        title: "",
        key: "actions",
        width: 72,
        fixed: "right",
        render: (_, record) => (
          <span
            className={styles.actionCell}
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Popconfirm
              title="즐겨찾기에서 삭제할까요?"
              okText="삭제"
              cancelText="취소"
              onConfirm={() => handleConfirmRemove(record)}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                loading={removingKey === buildRowKey(record)}
                aria-label="즐겨찾기 삭제"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              />
            </Popconfirm>
          </span>
        ),
      },
    ],
    [handleConfirmRemove, removingKey]
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>목록을 불러오지 못했습니다</p>
        <p className={styles.emptyDesc}>{errorMessage}</p>
        <Button type="primary" onClick={() => { setIsLoading(true); loadFavorites().finally(() => setIsLoading(false)); }} className={styles.retryButton}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>저장된 공고가 없습니다</p>
        <p className={styles.emptyDesc}>
          <Link href="/bids/search">공고검색</Link>에서 관심 공고를 즐겨찾기에 추가해 보세요.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>내 공고리스트</span>
        <span className={styles.count}>총 {favorites.length.toLocaleString("ko-KR")}건</span>
      </div>
      <Table<BidFavorite>
        className={styles.table}
        rowKey={buildRowKey}
        columns={columns}
        dataSource={favorites}
        size="middle"
        bordered
        scroll={{ x: 1400 }}
        rowClassName={() => styles.clickableRow}
        onRow={(record) => ({
          onClick: (event) => {
            if (suppressRowClickRef.current || shouldIgnoreRowClick(event.target)) {
              return;
            }
            openDetail(record);
          },
        })}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          pageSizeOptions: ["20", "50", "100"],
          showTotal: (total) => `총 ${total.toLocaleString("ko-KR")}건`,
        }}
      />
      <FavoriteDetailDrawer
        favorite={selectedBid}
        open={drawerOpen}
        onClose={closeDetail}
        onAttachmentsChange={refreshFavorites}
      />
    </div>
  );
}

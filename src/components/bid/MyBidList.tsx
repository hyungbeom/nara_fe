"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Table } from "antd";
import type { TableColumnsType } from "antd";
import { StarFilled } from "@ant-design/icons";
import BidDetailDrawer from "@/components/bid/BidDetailDrawer";
import { getBidFavorites, removeBidFavorite } from "@/lib/api";
import type { BidFavorite } from "@/types/bid";
import styles from "./MyBidList.module.css";

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function buildRowKey(record: BidFavorite) {
  return `${record.bidNo}-${record.bidOrd}-${record.announceDate}`;
}

export default function MyBidList() {
  const [favorites, setFavorites] = useState<BidFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBid, setSelectedBid] = useState<BidFavorite | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const loadFavorites = useCallback(() => {
    setIsLoading(true);
    getBidFavorites()
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const openDetail = (record: BidFavorite) => {
    setSelectedBid(record);
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSelectedBid(null);
    loadFavorites();
  };

  const handleRemove = async (record: BidFavorite) => {
    const key = buildRowKey(record);
    setRemovingKey(key);
    try {
      await removeBidFavorite(record.bidNo, record.bidOrd, record.announceDate);
      setFavorites((prev) => prev.filter((item) => buildRowKey(item) !== key));
    } finally {
      setRemovingKey(null);
    }
  };

  const columns = useMemo<TableColumnsType<BidFavorite>>(
    () => [
      {
        title: "공고번호",
        dataIndex: "bidNo",
        key: "bidNo",
        width: 120,
      },
      {
        title: "공고명",
        dataIndex: "bidName",
        key: "bidName",
        ellipsis: true,
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
        render: (value: string) => value || "-",
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
        title: "",
        key: "actions",
        width: 56,
        align: "center",
        render: (_, record) => (
          <Button
            type="text"
            icon={<StarFilled className={styles.removeFavoriteIcon} />}
            loading={removingKey === buildRowKey(record)}
            aria-label="즐겨찾기 해제"
            onClick={(event) => {
              event.stopPropagation();
              handleRemove(record);
            }}
          />
        ),
      },
    ],
    [removingKey]
  );

  if (!isLoading && favorites.length === 0) {
    return (
      <section className={styles.empty}>
        <p className={styles.emptyTitle}>저장된 공고가 없습니다</p>
        <p className={styles.emptyDesc}>
          <Link href="/bids/search">공고검색</Link>에서 관심 공고를 저장하면 이곳에서 확인할 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <div className={styles.wrap}>
      <Table<BidFavorite>
        rowKey={buildRowKey}
        columns={columns}
        dataSource={favorites}
        loading={isLoading}
        size="middle"
        bordered
        pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ["20", "50"] }}
        rowClassName={() => styles.clickableRow}
        onRow={(record) => ({
          onClick: () => openDetail(record),
        })}
      />
      <BidDetailDrawer bid={selectedBid} open={drawerOpen} onClose={closeDetail} />
    </div>
  );
}

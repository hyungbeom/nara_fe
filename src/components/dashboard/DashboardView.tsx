"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Spin, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import {
  CloudOutlined,
  FileOutlined,
  FolderOpenOutlined,
  SearchOutlined,
  StarOutlined,
} from "@ant-design/icons";
import { getBidFavorites, getCurrentUser, getGoogleDriveStatus } from "@/lib/api";
import type { LoginUser } from "@/types/auth";
import type { BidFavorite } from "@/types/bid";
import type { GoogleDriveStatus } from "@/types/googleDrive";
import styles from "./DashboardView.module.css";

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

function parseBidDate(value?: string) {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) {
    return null;
  }
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6)) - 1;
  const day = Number(digits.slice(6, 8));
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countAttachments(favorites: BidFavorite[]) {
  return favorites.reduce((sum, favorite) => sum + (favorite.attachments?.length ?? 0), 0);
}

function countDriveSynced(favorites: BidFavorite[]) {
  return favorites.reduce(
    (sum, favorite) =>
      sum + (favorite.attachments?.filter((file) => file.googleDriveFileId).length ?? 0),
    0
  );
}

function countUpcomingOpenings(favorites: BidFavorite[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return favorites.filter((favorite) => {
    const openingDate = parseBidDate(favorite.openingDate);
    return openingDate != null && openingDate >= today;
  }).length;
}

export default function DashboardView() {
  const [user, setUser] = useState<LoginUser | null>(null);
  const [favorites, setFavorites] = useState<BidFavorite[]>([]);
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setErrorMessage("");
    try {
      const [currentUser, favoriteList, status] = await Promise.all([
        getCurrentUser(),
        getBidFavorites(),
        getGoogleDriveStatus(),
      ]);
      setUser(currentUser);
      setFavorites(favoriteList);
      setDriveStatus(status);
    } catch (error) {
      const text = error instanceof Error ? error.message : "대시보드 정보를 불러오지 못했습니다.";
      setErrorMessage(text);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadDashboard().finally(() => setIsLoading(false));
  }, [loadDashboard]);

  const recentFavorites = useMemo(
    () =>
      [...favorites]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [favorites]
  );

  const stats = useMemo(
    () => ({
      favorites: favorites.length,
      attachments: countAttachments(favorites),
      driveSynced: countDriveSynced(favorites),
      upcomingOpenings: countUpcomingOpenings(favorites),
    }),
    [favorites]
  );

  const columns = useMemo<TableColumnsType<BidFavorite>>(
    () => [
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
        width: 110,
      },
      {
        title: "개찰일시",
        dataIndex: "openingDate",
        key: "openingDate",
        width: 140,
        render: (value?: string) => value || "-",
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
        width: 150,
        render: (value: string) => formatCreatedAt(value),
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={styles.errorPanel}>
        <p className={styles.errorTitle}>대시보드를 불러오지 못했습니다</p>
        <p className={styles.errorDesc}>{errorMessage}</p>
        <Button type="primary" onClick={() => { setIsLoading(true); loadDashboard().finally(() => setIsLoading(false)); }}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div>
          <h1 className={styles.pageTitle}>대시보드</h1>
          <p className={styles.heroText}>
            {user?.userName ?? "사용자"}님, 나라장터 입찰공고 관리 현황입니다.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/bids/search" className={styles.primaryAction}>
            <SearchOutlined /> 공고 검색
          </Link>
          <Link href="/my-bids" className={styles.secondaryAction}>
            <StarOutlined /> 내 공고리스트
          </Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>저장된 공고</span>
          <strong className={styles.statValue}>{stats.favorites.toLocaleString("ko-KR")}</strong>
          <span className={styles.statHint}>내 공고리스트</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>저장된 첨부파일</span>
          <strong className={styles.statValue}>{stats.attachments.toLocaleString("ko-KR")}</strong>
          <span className={styles.statHint}>HWPX/PDF 포함</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>드라이브 동기화</span>
          <strong className={styles.statValue}>{stats.driveSynced.toLocaleString("ko-KR")}</strong>
          <span className={styles.statHint}>구글 드라이브 업로드 완료</span>
        </article>
        <article className={styles.statCard}>
          <span className={styles.statLabel}>개찰 예정</span>
          <strong className={styles.statValue}>{stats.upcomingOpenings.toLocaleString("ko-KR")}</strong>
          <span className={styles.statHint}>오늘 이후 개찰 공고</span>
        </article>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2 className={styles.panelTitle}>최근 저장 공고</h2>
            <Link href="/my-bids" className={styles.panelLink}>
              전체 보기 →
            </Link>
          </div>
          {recentFavorites.length > 0 ? (
            <Table<BidFavorite>
              className={styles.table}
              rowKey={(record) => `${record.favoriteSeq}`}
              columns={columns}
              dataSource={recentFavorites}
              size="small"
              pagination={false}
            />
          ) : (
            <div className={styles.emptyBox}>
              <p>아직 저장된 공고가 없습니다.</p>
              <Link href="/bids/search">공고검색에서 즐겨찾기 추가하기</Link>
            </div>
          )}
        </section>

        <div className={styles.sideColumn}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>빠른 메뉴</h2>
            <div className={styles.quickLinks}>
              <Link href="/bids/search" className={styles.quickLink}>
                <SearchOutlined />
                <span>공고검색</span>
              </Link>
              <Link href="/my-bids" className={styles.quickLink}>
                <StarOutlined />
                <span>내 공고리스트</span>
              </Link>
              <Link href="/google-drive" className={styles.quickLink}>
                <CloudOutlined />
                <span>구글드라이브</span>
              </Link>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>구글 드라이브</h2>
            <div className={styles.driveStatus}>
              <Tag color={driveStatus?.available ? "success" : "default"}>
                {driveStatus?.available ? "연결됨" : "미설정"}
              </Tag>
              <p className={styles.driveText}>
                {driveStatus?.available
                  ? "공고명 폴더에 첨부파일을 저장하고, 내 공고리스트 삭제 시 폴더도 함께 삭제됩니다."
                  : "서비스 계정과 공유 드라이브 설정이 필요합니다."}
              </p>
              <Link href="/google-drive" className={styles.panelLink}>
                드라이브 열기 →
              </Link>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>주요 기능</h2>
            <ul className={styles.featureList}>
              <li>
                <FileOutlined />
                한글 첨부파일 HWPX → PDF 변환 저장
              </li>
              <li>
                <FolderOpenOutlined />
                공고명 기준 구글 드라이브 폴더 자동 생성
              </li>
              <li>
                <StarOutlined />
                공고 상세·첨부파일·담당자 정보 일괄 저장
              </li>
            </ul>
          </section>
        </div>
      </div>

      {stats.favorites > 0 && (
        <section className={styles.summaryBar}>
          <span>
            저장 공고 추정가격 합계{" "}
            <strong>
              {formatPrice(
                favorites.reduce((sum, favorite) => sum + (favorite.estimatedPrice ?? 0), 0)
              )}
            </strong>
          </span>
        </section>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Calendar, Spin } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import FavoriteDetailDrawer from "@/components/bid/FavoriteDetailDrawer";
import { getBidFavorites } from "@/lib/api";
import type { BidFavorite } from "@/types/bid";
import { formatScheduleDateTime, parseScheduleDateKey } from "@/utils/scheduleDate";
import styles from "./ScheduleCalendar.module.css";

function buildRowKey(record: BidFavorite) {
  return `${record.favoriteSeq}-${record.bidNo}-${record.bidOrd}-${record.announceDate}`;
}

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

export default function ScheduleCalendar() {
  const [favorites, setFavorites] = useState<BidFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs());
  const [selectedBid, setSelectedBid] = useState<BidFavorite | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loadFavorites = useCallback(async () => {
    setErrorMessage("");
    try {
      const data = await getBidFavorites();
      setFavorites(data);
      return data;
    } catch (error) {
      const text = error instanceof Error ? error.message : "내 공고 목록을 불러오지 못했습니다.";
      setErrorMessage(text);
      setFavorites([]);
      return [];
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    loadFavorites().finally(() => setIsLoading(false));
  }, [loadFavorites]);

  const scheduledFavorites = useMemo(
    () =>
      favorites.filter((favorite) => parseScheduleDateKey(favorite.bidCloseDate) != null),
    [favorites]
  );

  const unscheduledCount = favorites.length - scheduledFavorites.length;

  const bidsByDate = useMemo(() => {
    const map = new Map<string, BidFavorite[]>();
    for (const favorite of scheduledFavorites) {
      const dateKey = parseScheduleDateKey(favorite.bidCloseDate);
      if (!dateKey) {
        continue;
      }
      const current = map.get(dateKey) ?? [];
      current.push(favorite);
      map.set(dateKey, current);
    }
    for (const [, items] of map) {
      items.sort((a, b) => a.bidName.localeCompare(b.bidName, "ko"));
    }
    return map;
  }, [scheduledFavorites]);

  const selectedDateKey = selectedDate.format("YYYY-MM-DD");
  const selectedDateBids = bidsByDate.get(selectedDateKey) ?? [];

  const openDetail = (favorite: BidFavorite) => {
    setSelectedBid(favorite);
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSelectedBid(null);
  };

  const cellRender = (current: Dayjs, info: { type: string }) => {
    if (info.type !== "date") {
      return null;
    }

    const dateKey = current.format("YYYY-MM-DD");
    const items = bidsByDate.get(dateKey) ?? [];
    if (items.length === 0) {
      return null;
    }

    const visibleItems = items.slice(0, 2);
    return (
      <ul className={styles.eventList}>
        {visibleItems.map((item) => (
          <li key={buildRowKey(item)} className={styles.eventItem}>
            <button
              type="button"
              className={styles.eventButton}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedDate(current);
                openDetail(item);
              }}
            >
              {item.bidName}
            </button>
          </li>
        ))}
        {items.length > visibleItems.length ? (
          <li className={styles.moreLabel}>+{items.length - visibleItems.length}건</li>
        ) : null}
      </ul>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <>
      {errorMessage ? <Alert type="error" message={errorMessage} showIcon className={styles.error} /> : null}

      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>제출일 등록 공고 {scheduledFavorites.length}건</div>
        {unscheduledCount > 0 ? (
          <div className={styles.summaryItem}>제출일 미확인 {unscheduledCount}건</div>
        ) : null}
        <div className={styles.legend}>
          <Badge status="processing" />
          <span>제안서 제출 마감일 기준</span>
        </div>
      </div>

      <div className={styles.wrap}>
        <section className={styles.calendarCard}>
          <div className={styles.calendarHeader}>
            <span className={styles.calendarHeaderTitle}>제안서 제출 일정</span>
          </div>
          <div className={styles.calendarBody}>
            <Calendar
              value={selectedDate}
              onSelect={setSelectedDate}
              onPanelChange={setSelectedDate}
              cellRender={cellRender}
            />
          </div>
        </section>

        <section className={styles.sideCard}>
          <div className={styles.sideHeader}>
            <span className={styles.sideHeaderTitle}>{selectedDate.format("YYYY년 M월 D일")}</span>
            <Badge count={selectedDateBids.length} showZero color="#2563eb" />
          </div>
          <div className={styles.sideBody}>
            {selectedDateBids.length === 0 ? (
              <div className={styles.emptySide}>이 날짜에 제출 예정인 공고가 없습니다.</div>
            ) : (
              selectedDateBids.map((favorite) => (
                <div key={buildRowKey(favorite)} className={styles.bidCard}>
                  <button type="button" className={styles.bidNameButton} onClick={() => openDetail(favorite)}>
                    {favorite.bidName}
                  </button>
                  <div className={styles.bidMeta}>
                    <div>제출 마감: {formatScheduleDateTime(favorite.bidCloseDate)}</div>
                    <div>공고기관: {favorite.agency || "-"}</div>
                    <div>추정가격: {formatPrice(favorite.estimatedPrice ?? 0)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <FavoriteDetailDrawer
        favorite={selectedBid}
        open={drawerOpen}
        onClose={closeDetail}
        onAttachmentsChange={async () => {
          await loadFavorites();
          return selectedBid;
        }}
      />
    </>
  );
}

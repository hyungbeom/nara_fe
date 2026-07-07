"use client";

import { useCallback, useRef, useState } from "react";
import BidSearchForm from "@/components/bid/BidSearchForm";
import BidSearchResults from "@/components/bid/BidSearchResults";
import { searchBids } from "@/lib/api";
import type { BidSearchPage, BidSearchRequest } from "@/types/bid";
import styles from "./page.module.css";

const EMPTY_PAGE: BidSearchPage = {
  items: [],
  totalCount: 0,
  fetchedCount: 0,
  pageNo: 1,
  pageSize: 100,
  truncated: false,
};

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

export default function BidSearchPage() {
  const [criteria, setCriteria] = useState<BidSearchRequest | null>(null);
  const [page, setPage] = useState<BidSearchPage>(EMPTY_PAGE);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pollVersionRef = useRef(0);

  const pollAccurateTotal = useCallback(
    async (
      version: number,
      searchCriteria: BidSearchRequest,
      pageNo: number,
      pageSize: number
    ) => {
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (pollVersionRef.current !== version) {
          return;
        }

        try {
          const updated = await searchBids({
            ...searchCriteria,
            pageNo,
            pageSize,
          });
          if (pollVersionRef.current !== version) {
            return;
          }

          setPage((prev) => ({
            ...updated,
            items: prev.items,
            fetchedCount: prev.fetchedCount,
          }));

          if (!updated.countApproximate) {
            return;
          }
        } catch {
          return;
        }
      }
    },
    []
  );

  const fetchPage = useCallback(
    async (searchCriteria: BidSearchRequest, pageNo: number, pageSize: number) => {
      const version = pollVersionRef.current + 1;
      pollVersionRef.current = version;

      setIsLoading(true);
      setErrorMessage("");

      try {
        const nextPage = await searchBids({
          ...searchCriteria,
          pageNo,
          pageSize,
        });
        setPage(nextPage);
        setHasSearched(true);

        if (nextPage.countApproximate) {
          void pollAccurateTotal(version, searchCriteria, pageNo, pageSize);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "검색에 실패했습니다.";
        setErrorMessage(message);
        setPage(EMPTY_PAGE);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    },
    [pollAccurateTotal]
  );

  const handleSearch = (searchCriteria: BidSearchRequest) => {
    setCriteria(searchCriteria);
    void fetchPage(searchCriteria, 1, 100);
  };

  const handlePageChange = (pageNo: number, pageSize: number) => {
    if (criteria) {
      void fetchPage(criteria, pageNo, pageSize);
    }
  };

  return (
    <>
      <h1 className={styles.pageTitle}>공고검색</h1>

      <BidSearchForm onSearch={handleSearch} isSearching={isLoading} />
      {errorMessage && <div className={styles.error}>{errorMessage}</div>}
      <BidSearchResults
        page={page}
        hasSearched={hasSearched}
        isLoading={isLoading}
        industryCode={criteria?.industryCode}
        industryName={criteria?.industry}
        onPageChange={handlePageChange}
      />
    </>
  );
}

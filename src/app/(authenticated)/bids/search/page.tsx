"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import BidSearchForm from "@/components/bid/BidSearchForm";
import BidSearchResults from "@/components/bid/BidSearchResults";
import { searchBids } from "@/lib/api";
import type { BidSearchPage, BidSearchRequest } from "@/types/bid";
import { DEFAULT_INDUSTRY_CODE, DEFAULT_INDUSTRY_NAME } from "@/types/bid";
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
const DEFAULT_PAGE_SIZE = 100;

function buildUrlSearchParams(criteria: BidSearchRequest, pageNo: number, pageSize: number) {
  const params = new URLSearchParams();
  params.set("page", String(pageNo));
  params.set("pageSize", String(pageSize));
  params.set("dateType", criteria.dateType ?? "announceDate");
  params.set("startDate", criteria.startDate);
  params.set("endDate", criteria.endDate);
  params.set("contractMethod", criteria.contractMethod);
  params.set("industry", criteria.industry ?? DEFAULT_INDUSTRY_NAME);
  params.set("industryCode", criteria.industryCode ?? DEFAULT_INDUSTRY_CODE);
  if (criteria.bidName) {
    params.set("bidName", criteria.bidName);
  }
  if (criteria.minPrice != null) {
    params.set("minPrice", String(criteria.minPrice));
  }
  if (criteria.maxPrice != null) {
    params.set("maxPrice", String(criteria.maxPrice));
  }
  return params;
}

function parseCriteriaFromUrl(searchParams: URLSearchParams): BidSearchRequest | null {
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) {
    return null;
  }

  const dateType = searchParams.get("dateType");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  return {
    bidName: searchParams.get("bidName") ?? undefined,
    industry: searchParams.get("industry") ?? DEFAULT_INDUSTRY_NAME,
    industryCode: searchParams.get("industryCode") ?? DEFAULT_INDUSTRY_CODE,
    contractMethod: (searchParams.get("contractMethod") as BidSearchRequest["contractMethod"]) ?? "전체",
    dateType: dateType === "openingDate" ? "openingDate" : "announceDate",
    startDate,
    endDate,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
  };
}

function BidSearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlCriteria = useMemo(() => parseCriteriaFromUrl(searchParams), [searchParams]);
  const [criteria, setCriteria] = useState<BidSearchRequest | null>(urlCriteria);
  const [page, setPage] = useState<BidSearchPage>(EMPTY_PAGE);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const pollVersionRef = useRef(0);
  const initializedFromUrlRef = useRef(false);

  const updateUrl = useCallback(
    (searchCriteria: BidSearchRequest, pageNo: number, pageSize: number) => {
      const query = buildUrlSearchParams(searchCriteria, pageNo, pageSize).toString();
      router.replace(`/bids/search?${query}`, { scroll: false });
    },
    [router]
  );

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

  useEffect(() => {
    if (initializedFromUrlRef.current) {
      return;
    }
    initializedFromUrlRef.current = true;

    const parsed = parseCriteriaFromUrl(searchParams);
    if (!parsed) {
      return;
    }

    const pageNo = Math.max(Number(searchParams.get("page") ?? 1), 1);
    const pageSize = Math.max(Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE), 1);
    setCriteria(parsed);
    void fetchPage(parsed, pageNo, pageSize);
  }, [fetchPage, searchParams]);

  const handleSearch = (searchCriteria: BidSearchRequest) => {
    setCriteria(searchCriteria);
    updateUrl(searchCriteria, 1, DEFAULT_PAGE_SIZE);
    void fetchPage(searchCriteria, 1, DEFAULT_PAGE_SIZE);
  };

  const handlePageChange = (pageNo: number, pageSize: number) => {
    if (!criteria) {
      return;
    }
    updateUrl(criteria, pageNo, pageSize);
    void fetchPage(criteria, pageNo, pageSize);
  };

  return (
    <>
      <h1 className={styles.pageTitle}>공고검색</h1>

      <BidSearchForm initialCriteria={urlCriteria} onSearch={handleSearch} isSearching={isLoading} />
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

export default function BidSearchPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>검색 페이지를 불러오는 중...</div>}>
      <BidSearchPageContent />
    </Suspense>
  );
}

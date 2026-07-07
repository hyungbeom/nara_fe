"use client";

import { FormEvent, useMemo, useState } from "react";
import type { BidSearchRequest, DateQueryType } from "@/types/bid";
import { DEFAULT_INDUSTRY_CODE, DEFAULT_INDUSTRY_NAME } from "@/types/bid";
import styles from "./BidSearchForm.module.css";

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string) {
  return value.replaceAll("-", "/");
}

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 14);
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

type BidSearchFormProps = {
  onSearch: (criteria: BidSearchRequest) => void;
  isSearching: boolean;
};

export default function BidSearchForm({ onSearch, isSearching }: BidSearchFormProps) {
  const defaultRange = useMemo(() => getDefaultDateRange(), []);

  const [bidName, setBidName] = useState("");
  const [industry, setIndustry] = useState(DEFAULT_INDUSTRY_NAME);
  const [industryCode, setIndustryCode] = useState(DEFAULT_INDUSTRY_CODE);
  const [dateType, setDateType] = useState<DateQueryType>("announceDate");
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const applyMonthRange = (months: number) => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - months);
    setStartDate(formatDate(start));
    setEndDate(formatDate(end));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch({
      bidName: bidName.trim() || undefined,
      industry: industry.trim() || DEFAULT_INDUSTRY_NAME,
      industryCode: industryCode.trim() || DEFAULT_INDUSTRY_CODE,
      contractMethod: "전체",
      dateType,
      startDate,
      endDate,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="bidName">
            공고명
          </label>
          <input
            id="bidName"
            className={styles.input}
            type="text"
            placeholder="입찰공고"
            value={bidName}
            onChange={(event) => setBidName(event.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="industry">
            업종
          </label>
          <div className={styles.industryGroup}>
            <input
              id="industry"
              className={styles.input}
              type="text"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
            />
            <input
              id="industryCode"
              className={styles.industryCodeInput}
              type="text"
              value={industryCode}
              onChange={(event) => setIndustryCode(event.target.value)}
              aria-label="업종코드"
            />
          </div>
        </div>
      </div>

      <div className={styles.rowSplit}>
        <div className={styles.fieldInline}>
          <span className={styles.label}>
            일자<span className={styles.required}>*</span>
          </span>
          <div className={styles.dateGroup}>
            <select
              className={styles.select}
              value={dateType}
              onChange={(event) => setDateType(event.target.value as DateQueryType)}
              aria-label="일자 구분"
            >
              <option value="announceDate">공고일자</option>
              <option value="openingDate">개찰일자</option>
            </select>
            <div className={styles.dateRange}>
              <input
                className={styles.dateInput}
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
              <span className={styles.dateSeparator}>~</span>
              <input
                className={styles.dateInput}
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                required
              />
            </div>
            <div className={styles.monthButtons}>
              <button className={styles.monthButton} type="button" onClick={() => applyMonthRange(1)}>
                1개월
              </button>
              <button className={styles.monthButton} type="button" onClick={() => applyMonthRange(3)}>
                3개월
              </button>
              <button className={styles.monthButton} type="button" onClick={() => applyMonthRange(6)}>
                6개월
              </button>
            </div>
          </div>
          <span className={styles.dateHint}>
            {formatDisplayDate(startDate)} ~ {formatDisplayDate(endDate)}
          </span>
        </div>

        <div className={styles.fieldInline}>
          <span className={styles.label}>추정가격</span>
          <div className={styles.priceGroup}>
            <input
              className={styles.priceInput}
              type="number"
              min="0"
              placeholder=""
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
            <span className={styles.priceUnit}>원 이상</span>
            <input
              className={styles.priceInput}
              type="number"
              min="0"
              placeholder=""
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
            <span className={styles.priceUnit}>원 이하</span>
          </div>
        </div>
      </div>

      <div className={styles.submitWrap}>
        <button className={styles.submit} type="submit" disabled={isSearching}>
          {isSearching ? "나라장터 조회 중..." : "검색하기"}
        </button>
      </div>
    </form>
  );
}

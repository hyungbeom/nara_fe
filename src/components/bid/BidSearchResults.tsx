"use client";

import { useMemo, useState } from "react";
import { Button, Input, Space, Table } from "antd";
import type { TableColumnsType, TableColumnType } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import BidDetailDrawer from "@/components/bid/BidDetailDrawer";
import type { BidSearchPage, BidSearchResult } from "@/types/bid";
import styles from "./BidSearchResults.module.css";

type BidSearchResultsProps = {
  page: BidSearchPage;
  hasSearched: boolean;
  isLoading: boolean;
  industryCode?: string;
  industryName?: string;
  onPageChange: (pageNo: number, pageSize: number) => void;
};

function formatPrice(price: number) {
  return `${price.toLocaleString("ko-KR")}원`;
}

function buildRowKey(record: BidSearchResult) {
  return `${record.bidNo}-${record.bidOrd}-${record.announceDate}`;
}

function buildUniqueFilters(data: BidSearchResult[], key: keyof BidSearchResult) {
  return [...new Set(data.map((item) => String(item[key] ?? "")).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ko"))
    .map((value) => ({ text: value, value }));
}

function getTextFilterProps(
  dataIndex: keyof BidSearchResult
): Pick<
  TableColumnType<BidSearchResult>,
  "filterDropdown" | "filterIcon" | "onFilter"
> {
  return {
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters, close }) => (
      <div className={styles.filterDropdown} onKeyDown={(event) => event.stopPropagation()}>
        <Input
          placeholder="검색"
          value={String(selectedKeys[0] ?? "")}
          onChange={(event) =>
            setSelectedKeys(event.target.value ? [event.target.value] : [])
          }
          onPressEnter={() => confirm()}
          className={styles.filterInput}
        />
        <Space>
          <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => confirm()}>
            검색
          </Button>
          <Button
            size="small"
            onClick={() => {
              clearFilters?.();
              confirm();
            }}
          >
            초기화
          </Button>
          <Button type="link" size="small" onClick={() => close()}>
            닫기
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined className={filtered ? styles.filterIconActive : styles.filterIcon} />
    ),
    onFilter: (value, record) =>
      String(record[dataIndex] ?? "")
        .toLowerCase()
        .includes(String(value).toLowerCase()),
  };
}

export default function BidSearchResults({
  page,
  hasSearched,
  isLoading,
  industryCode,
  industryName,
  onPageChange,
}: BidSearchResultsProps) {
  const { items: results, totalCount, fetchedCount, truncated, pageNo, pageSize, countApproximate } = page;
  const [selectedBid, setSelectedBid] = useState<BidSearchResult | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openDetail = (record: BidSearchResult) => {
    setSelectedBid(record);
    setDrawerOpen(true);
  };

  const closeDetail = () => {
    setDrawerOpen(false);
    setSelectedBid(null);
  };

  const columns = useMemo<TableColumnsType<BidSearchResult>>(
    () => [
      {
        title: "공고번호",
        dataIndex: "bidNo",
        key: "bidNo",
        width: 120,
        fixed: "left",
        sorter: (a, b) => a.bidNo.localeCompare(b.bidNo, "ko"),
        ...getTextFilterProps("bidNo"),
      },
      {
        title: "공고명",
        dataIndex: "bidName",
        key: "bidName",
        width: 320,
        ellipsis: true,
        sorter: (a, b) => a.bidName.localeCompare(b.bidName, "ko"),
        ...getTextFilterProps("bidName"),
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
        sorter: (a, b) => a.industry.localeCompare(b.industry, "ko"),
        filters: buildUniqueFilters(results, "industry"),
        filterSearch: true,
        onFilter: (value, record) => record.industry === value,
      },
      {
        title: "계약방법",
        dataIndex: "contractMethod",
        key: "contractMethod",
        width: 120,
        sorter: (a, b) => a.contractMethod.localeCompare(b.contractMethod, "ko"),
        filters: buildUniqueFilters(results, "contractMethod"),
        filterSearch: true,
        onFilter: (value, record) => record.contractMethod === value,
      },
      {
        title: "공고일자",
        dataIndex: "announceDate",
        key: "announceDate",
        width: 120,
        sorter: (a, b) => a.announceDate.localeCompare(b.announceDate),
        defaultSortOrder: "descend",
      },
      {
        title: "개찰일자",
        dataIndex: "openingDate",
        key: "openingDate",
        width: 120,
        sorter: (a, b) => a.openingDate.localeCompare(b.openingDate),
      },
      {
        title: "추정가격",
        dataIndex: "estimatedPrice",
        key: "estimatedPrice",
        width: 120,
        align: "right",
        sorter: (a, b) => a.estimatedPrice - b.estimatedPrice,
        render: (value: number) => formatPrice(value),
      },
      {
        title: "공고기관",
        dataIndex: "agency",
        key: "agency",
        width: 150,
        ellipsis: true,
        sorter: (a, b) => a.agency.localeCompare(b.agency, "ko"),
        filters: buildUniqueFilters(results, "agency"),
        filterSearch: true,
        onFilter: (value, record) => record.agency === value,
      },
    ],
    [results]
  );

  if (!hasSearched) {
    return null;
  }

  if (!isLoading && results.length === 0) {
    return <div className={styles.empty}>검색 결과가 없습니다.</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span>검색 결과</span>
        <span className={styles.count}>
          {truncated
            ? `${countApproximate ? "약 " : ""}전체 ${totalCount.toLocaleString("ko-KR")}건 중 ${((pageNo - 1) * pageSize + fetchedCount).toLocaleString("ko-KR")}건까지 표시`
            : `${countApproximate ? "약 " : ""}전체 ${totalCount.toLocaleString("ko-KR")}건`}
          {countApproximate && " (정확한 건수 집계 중…)"}
        </span>
      </div>
      <Table<BidSearchResult>
        className={styles.table}
        rowKey={buildRowKey}
        columns={columns}
        dataSource={results}
        size="middle"
        bordered
        scroll={{ x: 1320 }}
        loading={isLoading}
        rowClassName={() => styles.clickableRow}
        onRow={(record) => ({
          onClick: () => openDetail(record),
        })}
        pagination={{
          current: pageNo,
          pageSize,
          total: totalCount,
          showSizeChanger: true,
          pageSizeOptions: ["20", "50", "100"],
          showTotal: (total) =>
            countApproximate
              ? `약 ${total.toLocaleString("ko-KR")}건`
              : `총 ${total.toLocaleString("ko-KR")}건`,
          onChange: (nextPage, nextPageSize) => onPageChange(nextPage, nextPageSize),
        }}
      />
      <BidDetailDrawer
        bid={selectedBid}
        open={drawerOpen}
        industryCode={industryCode}
        industryName={industryName}
        onClose={closeDetail}
      />
    </div>
  );
}

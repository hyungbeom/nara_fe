"use client";



import { useCallback, useEffect, useMemo, useState } from "react";

import { App, Button, Input, Space, Table, Tag } from "antd";

import type { TableColumnsType, TableColumnType } from "antd";

import { SearchOutlined } from "@ant-design/icons";

import QualificationResultModal from "@/components/anthropic/QualificationResultModal";

import BidDetailDrawer from "@/components/bid/BidDetailDrawer";

import {

  getAnthropicStatus,

  listAnthropicQualificationJobs,

  startAnthropicQualificationJob,

} from "@/lib/api";

import type { AnthropicQualificationJob } from "@/types/anthropic";

import type { BidSearchPage, BidSearchResult } from "@/types/bid";

import { buildBidKey } from "@/types/bid";

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

  const { message } = App.useApp();

  const { items: results, totalCount, fetchedCount, truncated, pageNo, pageSize, countApproximate } = page;

  const [selectedBid, setSelectedBid] = useState<BidSearchResult | null>(null);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const [anthropicConfigured, setAnthropicConfigured] = useState(false);

  const [qualificationByBidKey, setQualificationByBidKey] = useState<Record<string, AnthropicQualificationJob>>({});

  const [isLoadingQualification, setIsLoadingQualification] = useState(false);

  const [startingQualificationBidKey, setStartingQualificationBidKey] = useState<string | null>(null);

  const [qualificationModalBid, setQualificationModalBid] = useState<BidSearchResult | null>(null);

  const [qualificationModalJob, setQualificationModalJob] = useState<AnthropicQualificationJob | null>(null);



  const openDetail = (record: BidSearchResult) => {

    setSelectedBid(record);

    setDrawerOpen(true);

  };



  const closeDetail = () => {

    setDrawerOpen(false);

    setSelectedBid(null);

  };



  const loadQualificationStatus = useCallback(async (items: BidSearchResult[]) => {

    const bidKeys = items.map(buildBidKey);

    if (bidKeys.length === 0) {

      setQualificationByBidKey({});

      return;

    }



    setIsLoadingQualification(true);

    try {

      const jobs = await listAnthropicQualificationJobs({ bidKeys });

      const nextMap: Record<string, AnthropicQualificationJob> = {};

      for (const job of jobs) {

        if (job.bidKey) {

          nextMap[job.bidKey] = job;

        }

      }

      setQualificationByBidKey(nextMap);

    } catch {

      setQualificationByBidKey({});

    } finally {

      setIsLoadingQualification(false);

    }

  }, []);



  const openQualificationModal = useCallback(

    (bid: BidSearchResult, job?: AnthropicQualificationJob | null) => {

      setQualificationModalBid(bid);

      setQualificationModalJob(job ?? qualificationByBidKey[buildBidKey(bid)] ?? null);

    },

    [qualificationByBidKey]

  );



  const startQualificationCheck = useCallback(

    async (bid: BidSearchResult) => {

      if (!anthropicConfigured) {

        message.warning("Claude API 연동이 필요합니다.");

        return;

      }



      const bidKey = buildBidKey(bid);

      setStartingQualificationBidKey(bidKey);

      openQualificationModal(bid);

      try {

        const job = await startAnthropicQualificationJob({

          sourceType: "bid",

          projectName: bid.bidName,

          bidNo: bid.bidNo,

          bidOrd: bid.bidOrd,

          announceDate: bid.announceDate,

          industryCode,

          industryName,

        });

        setQualificationByBidKey((prev) => ({

          ...prev,

          [bidKey]: job,

        }));

        setQualificationModalJob(job);

        message.success("지원상태 검사를 시작했습니다.");

      } catch (error) {

        message.error(error instanceof Error ? error.message : "지원상태 검사를 시작하지 못했습니다.");

      } finally {

        setStartingQualificationBidKey(null);

      }

    },

    [anthropicConfigured, industryCode, industryName, message, openQualificationModal]

  );



  useEffect(() => {

    if (!hasSearched) {

      return;

    }

    void getAnthropicStatus()

      .then((status) => setAnthropicConfigured(status.enabled && status.configured))

      .catch(() => setAnthropicConfigured(false));

  }, [hasSearched]);



  useEffect(() => {

    if (!hasSearched || results.length === 0) {

      return;

    }

    void loadQualificationStatus(results);

  }, [hasSearched, loadQualificationStatus, results]);



  useEffect(() => {

    if (!qualificationModalBid) {

      return;

    }

    const latestJob = qualificationByBidKey[buildBidKey(qualificationModalBid)];

    if (latestJob) {

      setQualificationModalJob(latestJob);

    }

  }, [qualificationByBidKey, qualificationModalBid]);



  useEffect(() => {

    const hasActiveJobs = Object.values(qualificationByBidKey).some(

      (job) => job.status === "pending" || job.status === "in_progress"

    );

    if (!hasActiveJobs) {

      return;

    }



    const intervalId = setInterval(() => {

      void (async () => {

        try {

          const activeJobs = await listAnthropicQualificationJobs({ activeOnly: true });

          if (activeJobs.length === 0) {

            const bidKeys = results.map(buildBidKey);

            if (bidKeys.length > 0) {

              const jobs = await listAnthropicQualificationJobs({ bidKeys });

              setQualificationByBidKey((prev) => {

                const next = { ...prev };

                for (const job of jobs) {

                  if (job.bidKey) {

                    next[job.bidKey] = job;

                  }

                }

                return next;

              });

            }

            return;

          }



          setQualificationByBidKey((prev) => {

            const next = { ...prev };

            for (const job of activeJobs) {

              if (job.bidKey) {

                next[job.bidKey] = job;

              }

            }

            return next;

          });

        } catch {

          // ignore polling errors

        }

      })();

    }, 3000);



    return () => clearInterval(intervalId);

  }, [qualificationByBidKey, results]);



  const columns = useMemo<TableColumnsType<BidSearchResult>>(

    () => [

      {

        title: "순번",

        key: "rowNo",

        width: 64,

        fixed: "left",

        align: "center",

        render: (_value, _record, index) => (pageNo - 1) * pageSize + index + 1,

      },

      {

        title: "공고번호",

        dataIndex: "bidNo",

        key: "bidNo",

        width: 120,

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

        title: "공동수급",

        dataIndex: "jointSupply",

        key: "jointSupply",

        width: 140,

        ellipsis: true,

        sorter: (a, b) => (a.jointSupply ?? "").localeCompare(b.jointSupply ?? "", "ko"),

        filters: buildUniqueFilters(results, "jointSupply"),

        filterSearch: true,

        onFilter: (value, record) => record.jointSupply === value,

        render: (value: string) => value || "-",

      },

      {

        title: "입찰방식",

        dataIndex: "bidMethod",

        key: "bidMethod",

        width: 120,

        ellipsis: true,

        sorter: (a, b) => (a.bidMethod ?? "").localeCompare(b.bidMethod ?? "", "ko"),

        filters: buildUniqueFilters(results, "bidMethod"),

        filterSearch: true,

        onFilter: (value, record) => record.bidMethod === value,

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

      {

        title: "지원상태",

        key: "qualification",

        width: 110,

        fixed: "right",

        align: "center",

        render: (_, record) => {

          if (!anthropicConfigured) {

            return <Tag>미연동</Tag>;

          }



          const bidKey = buildBidKey(record);

          const job = qualificationByBidKey[bidKey];

          const isStarting = startingQualificationBidKey === bidKey;



          if (isLoadingQualification && !job) {

            return <Tag color="processing">확인 중</Tag>;

          }



          if (isStarting || job?.status === "pending" || job?.status === "in_progress") {

            return (

              <Tag

                color="processing"

                className={styles.qualificationAnalyzeTag}

                onClick={(event) => {

                  event.stopPropagation();

                  openQualificationModal(record, job);

                }}

              >

                분석

              </Tag>

            );

          }



          if (job?.status === "completed") {

            if (job.resultStatus === "qualified") {

              return (

                <Tag

                  color="success"

                  className={styles.qualificationTag}

                  onClick={(event) => {

                    event.stopPropagation();

                    openQualificationModal(record, job);

                  }}

                >

                  적격

                </Tag>

              );

            }

            return (

              <Tag

                color="error"

                className={styles.qualificationTag}

                onClick={(event) => {

                  event.stopPropagation();

                  openQualificationModal(record, job);

                }}

              >

                부적격

              </Tag>

            );

          }



          return (

            <Tag

              color="default"

              className={styles.qualificationAnalyzeTag}

              onClick={(event) => {

                event.stopPropagation();

                void startQualificationCheck(record);

              }}

            >

              분석

            </Tag>

          );

        },

      },

    ],

    [

      anthropicConfigured,

      isLoadingQualification,

      openQualificationModal,

      pageNo,

      pageSize,

      qualificationByBidKey,

      results,

      startQualificationCheck,

      startingQualificationBidKey,

    ]

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

        scroll={{ x: 1754 }}

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

        onQualificationJobChange={(bidKey, job) => {
          setQualificationByBidKey((prev) => ({
            ...prev,
            [bidKey]: job,
          }));
        }}

      />

      <QualificationResultModal

        open={qualificationModalBid != null}

        projectName={qualificationModalBid?.bidName}

        job={qualificationModalJob}

        onClose={() => {

          setQualificationModalBid(null);

          setQualificationModalJob(null);

        }}

        reanalyzing={

          qualificationModalBid != null &&

          startingQualificationBidKey === buildBidKey(qualificationModalBid)

        }

        onReanalyze={

          qualificationModalBid

            ? () => {

                void startQualificationCheck(qualificationModalBid);

              }

            : undefined

        }

      />

    </div>

  );

}



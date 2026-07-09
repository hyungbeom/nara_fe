"use client";

import { useCallback, useEffect, useState } from "react";
import { App } from "antd";
import { getAnthropicStatus, listAnthropicQualificationJobs, startAnthropicQualificationJob } from "@/lib/api";
import type { AnthropicQualificationJob } from "@/types/anthropic";
import type { BidSearchResult } from "@/types/bid";
import { buildBidKey } from "@/types/bid";

type UseBidQualificationAnalysisOptions = {
  bid: BidSearchResult | null;
  industryCode?: string;
  industryName?: string;
  enabled?: boolean;
  onJobChange?: (bidKey: string, job: AnthropicQualificationJob) => void;
};

export function useBidQualificationAnalysis({
  bid,
  industryCode,
  industryName,
  enabled = true,
  onJobChange,
}: UseBidQualificationAnalysisOptions) {
  const { message } = App.useApp();
  const [anthropicConfigured, setAnthropicConfigured] = useState(false);
  const [currentJob, setCurrentJob] = useState<AnthropicQualificationJob | null>(null);
  const [isLoadingJob, setIsLoadingJob] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const bidKey = bid ? buildBidKey(bid) : null;

  const loadJob = useCallback(async (targetBid: BidSearchResult) => {
    const key = buildBidKey(targetBid);
    setIsLoadingJob(true);
    try {
      const jobs = await listAnthropicQualificationJobs({ bidKeys: [key] });
      const job = jobs[0] ?? null;
      setCurrentJob(job);
      if (job) {
        onJobChange?.(key, job);
      }
      return job;
    } catch {
      setCurrentJob(null);
      return null;
    } finally {
      setIsLoadingJob(false);
    }
  }, [onJobChange]);

  const openModal = useCallback(
    (targetBid: BidSearchResult, job?: AnthropicQualificationJob | null) => {
      setModalOpen(true);
      if (job !== undefined) {
        setCurrentJob(job);
      } else if (bidKey === buildBidKey(targetBid) && currentJob) {
        // keep current
      } else {
        void loadJob(targetBid);
      }
    },
    [bidKey, currentJob, loadJob]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const startAnalysis = useCallback(
    async (targetBid: BidSearchResult) => {
      if (!anthropicConfigured) {
        message.warning("Claude API 연동이 필요합니다.");
        return;
      }

      setIsStarting(true);
      setModalOpen(true);
      try {
        const job = await startAnthropicQualificationJob({
          sourceType: "bid",
          projectName: targetBid.bidName,
          bidNo: targetBid.bidNo,
          bidOrd: targetBid.bidOrd,
          announceDate: targetBid.announceDate,
          industryCode,
          industryName,
        });
        const key = buildBidKey(targetBid);
        setCurrentJob(job);
        onJobChange?.(key, job);
        message.success("지원상태 분석을 시작했습니다.");
      } catch (error) {
        message.error(error instanceof Error ? error.message : "지원상태 분석을 시작하지 못했습니다.");
      } finally {
        setIsStarting(false);
      }
    },
    [anthropicConfigured, industryCode, industryName, message, onJobChange]
  );

  const handleAnalysisClick = useCallback(
    async (targetBid: BidSearchResult) => {
      if (currentJob?.status === "completed" || currentJob?.status === "failed") {
        openModal(targetBid, currentJob);
        return;
      }
      if (currentJob?.status === "pending" || currentJob?.status === "in_progress" || isStarting) {
        openModal(targetBid, currentJob);
        return;
      }
      await startAnalysis(targetBid);
    },
    [currentJob, isStarting, openModal, startAnalysis]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    void getAnthropicStatus()
      .then((status) => setAnthropicConfigured(status.enabled && status.configured))
      .catch(() => setAnthropicConfigured(false));
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !bid) {
      setCurrentJob(null);
      return;
    }
    void loadJob(bid);
  }, [bid, enabled, loadJob]);

  useEffect(() => {
    if (!enabled || !bidKey) {
      return;
    }
    const isActive =
      isStarting || currentJob?.status === "pending" || currentJob?.status === "in_progress";
    if (!isActive) {
      return;
    }

    const intervalId = setInterval(() => {
      void (async () => {
        try {
          const activeJobs = await listAnthropicQualificationJobs({ activeOnly: true });
          const activeForBid = activeJobs.find((job) => job.bidKey === bidKey);
          if (activeForBid) {
            setCurrentJob(activeForBid);
            onJobChange?.(bidKey, activeForBid);
            return;
          }
          if (bid) {
            const job = await loadJob(bid);
            if (job?.status === "completed" || job?.status === "failed") {
              setCurrentJob(job);
            }
          }
        } catch {
          // ignore polling errors
        }
      })();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [bid, bidKey, currentJob?.status, enabled, isStarting, loadJob, onJobChange]);

  const isAnalyzing =
    isStarting || currentJob?.status === "pending" || currentJob?.status === "in_progress";

  return {
    anthropicConfigured,
    currentJob,
    isLoadingJob,
    isStarting,
    isAnalyzing,
    modalOpen,
    openModal,
    closeModal,
    startAnalysis,
    handleAnalysisClick,
  };
}

"use client";

import { Modal, Spin, Tag } from "antd";
import { QUALIFICATION_SUPPORT_CONDITIONS } from "@/constants/qualificationConditions";
import type { AnthropicQualificationJob } from "@/types/anthropic";
import styles from "./QualificationResultModal.module.css";

type QualificationResultModalProps = {
  open: boolean;
  projectName?: string;
  job: AnthropicQualificationJob | null;
  onClose: () => void;
  onReanalyze?: () => void;
  reanalyzing?: boolean;
};

function getConditionTagColor(status: string) {
  switch (status) {
    case "qualified":
      return "success";
    case "disqualified":
      return "error";
    default:
      return "warning";
  }
}

function getConditionLabel(status: string) {
  switch (status) {
    case "qualified":
      return "적격";
    case "disqualified":
      return "부적격";
    default:
      return "확인불가";
  }
}

function isAnalyzing(job: AnthropicQualificationJob | null, reanalyzing: boolean) {
  if (reanalyzing) {
    return true;
  }
  return job?.status === "pending" || job?.status === "in_progress";
}

export default function QualificationResultModal({
  open,
  projectName,
  job,
  onClose,
  onReanalyze,
  reanalyzing = false,
}: QualificationResultModalProps) {
  const title = projectName ? `${projectName} 지원조건 · 적격 검사` : "지원조건 · 적격 검사";
  const analyzing = isAnalyzing(job, reanalyzing);
  const hasCompletedResult = job?.status === "completed";

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      onOk={onClose}
      okText="닫기"
      cancelButtonProps={{ style: { display: "none" } }}
      footer={(_, { OkBtn }) => (
        <>
          {onReanalyze ? (
            <button
              type="button"
              className="ant-btn"
              disabled={reanalyzing}
              onClick={onReanalyze}
              style={{ marginRight: 8 }}
            >
              {reanalyzing ? "분석 중..." : "다시 분석"}
            </button>
          ) : null}
          <OkBtn />
        </>
      )}
      width={800}
    >
      <div className={styles.container}>
        <section className={styles.supportSection}>
          <h4 className={styles.sectionTitle}>지원조건</h4>
          <ul className={styles.supportList}>
            {QUALIFICATION_SUPPORT_CONDITIONS.map((condition, index) => (
              <li key={condition.id} className={styles.supportItem}>
                <span className={styles.supportIndex}>{index + 1}</span>
                <div className={styles.supportContent}>
                  <p className={styles.supportItemTitle}>{condition.title}</p>
                  <p className={styles.supportItemDescription}>{condition.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {analyzing ? (
          <div className={styles.analyzingBox}>
            <Spin size="small" style={{ marginRight: 8 }} />
            첨부파일을 Claude가 검토 중입니다. 완료되면 적격 판정과 제안서 목차가 표시됩니다.
          </div>
        ) : null}

        {job ? (
          <section className={styles.resultSection}>
            <h4 className={styles.sectionTitle}>검사 결과</h4>

            <div>
              <strong>전체 판정: </strong>
              {job.resultStatus === "qualified" ? (
                <Tag color="success">적격</Tag>
              ) : job.resultStatus === "disqualified" ? (
                <Tag color="error">부적격</Tag>
              ) : job.status === "failed" ? (
                <Tag color="error">분석 실패</Tag>
              ) : (
                <Tag>{job.status}</Tag>
              )}
            </div>

            {hasCompletedResult && job.summary ? (
              <p className={styles.summaryText}>{job.summary}</p>
            ) : null}

            {job.attachmentCount != null ? (
              <p className={styles.metaText}>검사 첨부파일 {job.attachmentCount}개</p>
            ) : null}

            {job.errorMessage ? <p className={styles.errorText}>{job.errorMessage}</p> : null}

            {hasCompletedResult && job.conditions && job.conditions.length > 0 ? (
              <div className={styles.conditionList}>
                {job.conditions.map((condition) => (
                  <div key={condition.id} className={styles.conditionCard}>
                    <div className={styles.conditionHeader}>
                      <strong>{condition.title}</strong>
                      <Tag color={getConditionTagColor(condition.status)}>{getConditionLabel(condition.status)}</Tag>
                    </div>
                    <p className={styles.conditionReason}>{condition.reason || "-"}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {hasCompletedResult && job?.proposalOutline ? (
          <section className={styles.outlineSection}>
            <h4 className={styles.sectionTitle}>제안서 목차</h4>
            <pre className={styles.outlineContent}>{job.proposalOutline}</pre>
          </section>
        ) : null}
      </div>
    </Modal>
  );
}

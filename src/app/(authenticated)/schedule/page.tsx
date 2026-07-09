import ScheduleCalendar from "@/components/schedule/ScheduleCalendar";
import styles from "./page.module.css";

export default function SchedulePage() {
  return (
    <>
      <h1 className={styles.pageTitle}>스케줄</h1>
      <p className={styles.pageDesc}>
        내 공고리스트의 제안서 제출 마감일을 캘린더에서 확인할 수 있습니다.
      </p>
      <ScheduleCalendar />
    </>
  );
}

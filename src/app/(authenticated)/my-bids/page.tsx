import Link from "next/link";
import styles from "./page.module.css";

export default function MyBidsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>내 공고리스트</h1>

      <section className={styles.empty}>
        <p className={styles.emptyTitle}>저장된 공고가 없습니다</p>
        <p className={styles.emptyDesc}>
          <Link href="/bids/search">공고검색</Link>에서 관심 공고를 저장하면 이곳에서 확인할
          수 있습니다.
        </p>
      </section>
    </>
  );
}

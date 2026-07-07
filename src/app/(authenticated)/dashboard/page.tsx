import Link from "next/link";
import styles from "./page.module.css";

export default function DashboardPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>대시보드</h1>

      <section className={styles.welcome}>
        <p className={styles.welcomeText}>
          나라장터 입찰공고 조회 시스템입니다. 상단 메뉴에서 공고 검색 또는 내 공고리스트를
          이용할 수 있습니다.
        </p>
      </section>

      <section className={styles.grid}>
        <article className={styles.card}>
          <h2 className={styles.cardTitle}>공고검색</h2>
          <p className={styles.cardDesc}>
            업종, 계약방법, 일자, 추정가격 등 조건으로 나라장터 입찰공고를 검색합니다.
          </p>
          <Link href="/bids/search" className={styles.cardLink}>
            검색하러 가기 →
          </Link>
        </article>

        <article className={styles.card}>
          <h2 className={styles.cardTitle}>내 공고리스트</h2>
          <p className={styles.cardDesc}>
            관심 공고를 저장하고 관리합니다. 저장된 공고 목록을 확인할 수 있습니다.
          </p>
          <Link href="/my-bids" className={styles.cardLink}>
            리스트 보기 →
          </Link>
        </article>
      </section>
    </>
  );
}

import MyBidList from "@/components/bid/MyBidList";
import styles from "./page.module.css";

export default function MyBidsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>내 공고리스트</h1>
      <MyBidList />
    </>
  );
}

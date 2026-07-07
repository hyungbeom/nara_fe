import GoogleDriveExplorer from "@/components/google-drive/GoogleDriveExplorer";
import styles from "./page.module.css";

export default function GoogleDrivePage() {
  return (
    <>
      <h1 className={styles.pageTitle}>구글드라이브</h1>
      <GoogleDriveExplorer />
    </>
  );
}

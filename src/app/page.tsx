import LoginForm from "@/components/auth/LoginForm";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.page}>
      <LoginForm />
    </main>
  );
}

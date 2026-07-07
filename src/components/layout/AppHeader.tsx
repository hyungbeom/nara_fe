"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LoginUser } from "@/types/auth";
import { NAV_ITEMS } from "./navItems";
import styles from "./AppHeader.module.css";

type AppHeaderProps = {
  user: LoginUser;
  onLogout: () => void;
};

export default function AppHeader({ user, onLogout }: AppHeaderProps) {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/dashboard" className={styles.brand}>
        NARA
      </Link>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navLink} ${isActive ? styles.navLinkActive : ""}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className={styles.userArea}>
        <span className={styles.userName}>
          {user.userName}({user.userId})
        </span>
        <button className={styles.logoutButton} type="button" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}

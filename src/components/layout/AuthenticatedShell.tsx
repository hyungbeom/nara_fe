"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/layout/AppHeader";
import { getCurrentUser, logout } from "@/lib/api";
import type { LoginUser } from "@/types/auth";
import styles from "./AuthenticatedShell.module.css";

type AuthenticatedShellProps = {
  children: React.ReactNode;
};

export default function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<LoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => router.replace("/"))
      .finally(() => setIsLoading(false));
  }, [router]);

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  };

  if (isLoading) {
    return <main className={styles.loading}>로딩 중...</main>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <AppHeader user={user} onLogout={handleLogout} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import styles from "./LoginForm.module.css";

type FormErrors = {
  userId?: string;
  password?: string;
  form?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (!userId.trim()) {
      nextErrors.userId = "아이디를 입력해 주세요.";
    }

    if (!password.trim()) {
      nextErrors.password = "비밀번호를 입력해 주세요.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      await login({ userId, password });
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "로그인에 실패했습니다.";
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h1 className={styles.title}>로그인</h1>

      {errors.form && <div className={styles.alert}>{errors.form}</div>}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="userId">
          아이디
        </label>
        <input
          id="userId"
          className={`${styles.input} ${errors.userId ? styles.inputError : ""}`}
          type="text"
          name="userId"
          autoComplete="username"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
        />
        {errors.userId && <span className={styles.errorText}>{errors.userId}</span>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="password">
          비밀번호
        </label>
        <input
          id="password"
          className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {errors.password && <span className={styles.errorText}>{errors.password}</span>}
      </div>

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
    </form>
  );
}

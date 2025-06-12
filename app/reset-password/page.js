'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();

  const handleReset = (e) => {
    e.preventDefault();
    // TODO: 여기에 실제 비밀번호 재설정 요청 로직 구현
    alert('비밀번호 재설정 이메일 발송');
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <button onClick={() => router.back()} className={styles.backButton}>&lt;</button>
        <h2 className={styles.title}>Reset Password</h2>
        
        <form onSubmit={handleReset} className={styles.form}>
          <label className={styles.inputLabel}>Email</label>
          <input type="email" placeholder="abcd@gmail.com" className={styles.input} required />
          
          <label className={styles.inputLabel}>Full Name</label>
          <input type="text" placeholder="John Doe" className={styles.input} required />

          <label className={styles.inputLabel}>Phone Number</label>
          <input type="tel" placeholder="+10 1 4561 4567" className={styles.input} required />
          
          <button type="submit" className={styles.button}>Next</button>
        </form>

         <div className={styles.footer}>
          Remember your password?
          <Link href="/" className={`${styles.link} ${styles.primaryLink}`}>
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter import
import styles from './auth.module.css';

export default function LoginPage() {
  const router = useRouter(); // useRouter 훅 사용
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false); // 체크박스 상태 추가
  
  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: 여기에 실제 Firebase 또는 백엔드 로그인 로직을 구현합니다.
    console.log({ email, password, stayLoggedIn });

    if (stayLoggedIn) {
      // "Stay logged in"이 체크된 경우 localStorage에 세션 정보 저장
      // 실제 앱에서는 토큰이나 사용자 정보를 저장합니다.
      localStorage.setItem('ums-shop-user-session', JSON.stringify({ email: email, isLoggedIn: true }));
    }

    // window.location.href 대신 router.push 사용
    router.push('/home');
  };

  const isFormValid = email.trim() !== '' && password.trim() !== '';

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.logo}>UMS SHOP</h1>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={styles.input}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={styles.input}
            required
          />
          
          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input 
                type="checkbox"
                checked={stayLoggedIn}
                onChange={(e) => setStayLoggedIn(e.target.checked)}
              />
              Stay logged in
            </label>
            <Link href="/reset-password" className={styles.link}>
              Forgot password?
            </Link>
          </div>
          
          <button type="submit" className={styles.button} disabled={!isFormValid}>
            Sign in
          </button>
        </form>

        <div className={styles.footer} style={{ marginTop: '20px' }}>
          Don't have an account?
          <Link href="/register" className={`${styles.link} ${styles.primaryLink}`}>
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
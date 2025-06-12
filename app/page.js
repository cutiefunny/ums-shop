// /app/page.js (수정)
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from './auth.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = (e) => {
    e.preventDefault();
    // TODO: 여기에 실제 Firebase 또는 백엔드 로그인 로직을 구현합니다.
    console.log({ email, password });

    //일단 /home으로 이동
    window.location.href = '/home';

    //alert('로그인 시도');
  };

  // [추가] 이메일과 비밀번호가 모두 입력되었는지 확인하는 변수
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
              <input type="checkbox" />
              Stay logged in
            </label>
            <Link href="/reset-password" className={styles.link}>
              Forgot password?
            </Link>
          </div>
          
          {/* [수정] disabled 속성 추가 */}
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
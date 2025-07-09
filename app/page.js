// app/page.js
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // useRouter import
import styles from './auth.module.css';
import { useAuth } from '@/contexts/AuthContext'; // AuthContext 훅 임포트
import { useModal } from '@/contexts/ModalContext'; // ModalContext 훅 임포트 (알림용)

export default function LoginPage() {
  const router = useRouter(); // useRouter 훅 사용
  const { login } = useAuth(); // AuthContext에서 login 함수 가져오기
  const { showModal } = useModal(); // ModalContext에서 showModal 함수 가져오기

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false); // 체크박스 상태 추가
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(''); // 에러 메시지 상태

  const handleLogin = async (e) => { // async 함수로 변경
    e.preventDefault();
    setError(''); // 이전 에러 메시지 초기화
    setLoading(true); // 로딩 시작

    try {
      const response = await fetch('/api/auth/login', { // 새로 생성한 API 라우트 호출
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, stayLoggedIn }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const responseData = await response.json();
      // AuthContext의 login 함수를 호출하여 전역 상태 및 localStorage 업데이트
      login(responseData.user); // API 응답에서 사용자 정보만 전달

      console.log('Login successful!');
      router.push('/home'); // 로그인 성공 시 /home으로 이동
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
      showModal(err.message || '로그인 중 오류가 발생했습니다.'); // 사용자에게 알림 모달 표시
    } finally {
      setLoading(false); // 로딩 종료
    }
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

          {error && <p className={styles.errorMessage}>{error}</p>} {/* 에러 메시지 표시 */}
          <button type="submit" className={styles.button} disabled={!isFormValid || loading}>
            {loading ? 'Signing in...' : 'Sign in'}
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

// app/admin/page.js
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css'; // CSS Modules 임포트

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 이미 로그인되어 있는지 확인 (페이지 로드 시)
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setLoading(true);
        // 클라이언트에서 직접 Auth.currentAuthenticatedUser()를 호출하거나,
        // 미들웨어에서 인증을 처리하고 리다이렉트되지 않았다면 이미 인증된 것으로 간주할 수 있습니다.
        // 여기서는 예시로 `/api/admin/check-auth`를 호출합니다.
        const response = await fetch('/api/admin/check-auth'); // 인증 확인 API 호출 (이전 안내의 8단계)
        if (response.ok) {
          router.push('/admin/dashboard'); // 이미 로그인되어 있다면 대시보드로 이동
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    // Amplify 라이브러리가 설정된 후에만 인증 상태 확인 시도
    // (Auth 객체가 제대로 초기화되지 않았을 경우 오류 방지)
    if (typeof window !== 'undefined' && typeof Auth !== 'undefined' && Auth.configure) {
      checkAuthStatus();
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      console.log('Login successful!');
      router.push('/admin/dashboard'); // 로그인 성공 시 관리자 대시보드로 리다이렉트
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    // style 대신 className 사용
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.logo}>ADMIN LOGIN</h1> {/* 오류 발생 라인 수정 */}
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input} // style 대신 className 사용
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input} // style 대신 className 사용
            required
          />
          {error && <p className={styles.errorMessage}>{error}</p>} {/* style 대신 className 사용 */}
          <button type="submit" className={styles.button} disabled={loading}> {/* style 대신 className 사용 */}
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

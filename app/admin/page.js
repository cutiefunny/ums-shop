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
        // 클라이언트에서 서버의 /api/admin/check-auth API를 호출하여
        // HttpOnly 쿠키(admin_jwt)의 존재 및 유효성을 간접적으로 확인합니다.
        const response = await fetch('/api/admin/check-auth');
        if (response.ok) {
          // 쿠키가 유효하여 인증된 상태라면 대시보드로 이동
          router.push('/admin/dashboard'); 
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        // 에러 발생 시 (예: 네트워크 문제) 로딩 상태만 해제
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
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
      // 로그인 성공 시 새로고침
      window.location.reload();
      //router.push('/admin/dashboard'); 
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formWrapper}>
        <h1 className={styles.logo}>ADMIN LOGIN</h1>
        <form onSubmit={handleLogin} className={styles.form}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input}
            required
          />
          {error && <p className={styles.errorMessage}>{error}</p>}
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

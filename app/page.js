// app/page.js
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './auth.module.css';
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { messaging } from '@/utils/firebaseConfig'; // firebaseConfig에서 messaging 인스턴스 임포트
import { getToken, onMessage } from 'firebase/messaging';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, isLoggedIn } = useAuth(); // isLoggedIn 상태 추가
  const { showModal } = useModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [stayLoggedIn, setStayLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // FCM 관련 상태
  const [currentFcmToken, setCurrentFcmToken] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // FCM 토큰을 서버에 전송하는 함수 (컴포넌트 최상위 레벨로 이동)
  const sendTokenToServer = useCallback(async (token) => {
    // user 객체가 존재하고 user.seq가 유효한지 확인
    if (!user?.seq) {
      console.warn('User ID is not available. Cannot send FCM token to server.');
      setErrorMessage('User information is not available, cannot save FCM token. Please try again after logging in.');
      return;
        }

        try {
      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fcmToken: token }),
      });

      if (response.ok) {
        console.log('FCM token successfully sent to server for user:', user.seq);
      } else {
        const errorData = await response.json();
        console.error('Failed to send FCM token to server:', errorData.message);
        setErrorMessage(`Failed to save token: ${errorData.message}`);
      }
        } catch (error) {
      console.error('Error sending FCM token to server:', error);
      setErrorMessage(`Network error while sending token: ${error.message}`);
    }
  }, [user?.seq]); // user.seq가 변경될 때마다 함수 재생성

  // FCM 관련 useEffect 훅 (컴포넌트 최상위 레벨로 이동)
  useEffect(() => {
    // 클라이언트 환경에서만 실행되도록 조건 추가
    if (typeof window !== 'undefined' && messaging && isLoggedIn && user?.seq) {
      if (!('Notification' in window)) {
        setErrorMessage('This browser does not support notifications.');
        return;
      }
      if (!('serviceWorker' in navigator)) {
        setErrorMessage('This browser does not support service workers. PWA push notifications are not available.');
        return;
      }

      const setupNotifications = async () => {
        try {
          // 서비스 워커 등록 (public/firebase-messaging-sw.js 또는 public/sw.js)
          // Next.js 환경에서는 public/firebase-messaging-sw.js가 일반적으로 사용됩니다.
          // 만약 sw.js로 사용하고 있다면 해당 파일로 경로를 맞춰주세요.
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Service Worker registered:', registration);

          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setPermissionGranted(true);
            console.log('Notification permission granted.');

            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                setErrorMessage('VAPID key is not set. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.');
              console.error('VAPID key is not set. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.');
              return;
            }

            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) {
              console.log('FCM Registration Token:', currentToken);
              setCurrentFcmToken(currentToken);
              sendTokenToServer(currentToken); // 토큰을 서버에 전송
            } else {
              console.log('No FCM registration token available. Request permission to generate one.');
                setErrorMessage('Failed to retrieve FCM registration token. Please allow notification permissions.');
            }

            // 포그라운드 메시지 수신 처리
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground. ', payload);
                const { title, body } = payload.notification || { title: 'New Notification', body: 'A new message has arrived.' };
              const notificationBody = payload.data?.body || body;
              showModal(`${title}: ${notificationBody}`); // 모달로 알림 표시
            });
          } else if (permission === 'denied') {
            setPermissionGranted(false);
            setErrorMessage('Notification permission denied. Please allow permission in your browser settings to receive notifications.');
            console.log('Notification permission denied.');
            } else {
            setPermissionGranted(false);
            setErrorMessage('Notification permission status is uncertain.');
            console.log('Notification permission unknown.');
            }
          } catch (error) {
            console.error('Error during notification setup:', error);
            setErrorMessage(`An error occurred while setting up notifications: ${error.message}`);
          }
          };

          setupNotifications();
        } else if (!isLoggedIn) {
          setErrorMessage('You can use push notifications after logging in.');
          setCurrentFcmToken('');
          setPermissionGranted(false);
        } else if (!user?.seq) {
          setErrorMessage('Loading user information...');
    }
  }, [messaging, isLoggedIn, user?.seq, sendTokenToServer, showModal]); // 의존성 배열에 필요한 모든 값 포함

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, stayLoggedIn }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const responseData = await response.json();
      login(responseData.user); // AuthContext의 login 함수 호출

      console.log('Login successful!');
      router.push('/home'); // 로그인 성공 시 /home으로 이동
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login.');
      showModal(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
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

          {error && <p className={styles.errorMessage}>{error}</p>}
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
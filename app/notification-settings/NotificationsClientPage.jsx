'use client'; // 이 컴포넌트가 클라이언트에서만 실행됨을 명시

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './notifications.module.css'; // 기존 CSS 모듈 경로 유지
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
// FCM 관련 임포트 제거: import { messaging } from '@/utils/firebaseConfig';
// FCM 관련 임포트 제거: import { getToken, onMessage } from 'firebase/messaging';

export default function NotificationsClientPage() { // 컴포넌트 이름을 NotificationsClientPage로 변경
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth(); // useAuth 훅에서 user와 isLoggedIn 가져오기
  const { showModal } = useModal();

  // 탭 상태 관리: 'settings'로 고정
  const [activeTab, setActiveTab] = useState('settings');

  // 알림 설정 상태 (Settings 탭)
  const [notificationSettings, setNotificationSettings] = useState({
    all: true,
    order: true,
    payment: true,
    delivery: true,
    qna: true,
  });

  console.log('Current user in NotificationsClientPage1:', user);

  // 공통 로딩 상태 (설정 저장 등)
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);

  // FCM 관련 상태 제거:
  // const [currentFcmToken, setCurrentFcmToken] = useState('');
  // const [permissionGranted, setPermissionGranted] = useState(false);
  // const [errorMessage, setErrorMessage] = useState('');

  // FCM 토큰을 서버에 전송하는 함수 제거:
  // const sendTokenToServer = useCallback(async (token) => {
  //   if (!user?.seq) {
  //     console.warn('User ID is not available. Cannot send FCM token to server.');
  //     setErrorMessage('사용자 정보가 없어 FCM 토큰을 저장할 수 없습니다. 로그인 후 다시 시도해주세요.');
  //     return;
  //   }
  //
  //   try {
  //     const response = await fetch(`/api/users/${user.seq}`, {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify({ fcmToken: token }),
  //     });
  //
  //     if (response.ok) {
  //       console.log('FCM token successfully sent to server for user:', user.seq);
  //     } else {
  //       const errorData = await response.json();
  //       console.error('Failed to send FCM token to server:', errorData.message);
  //       setErrorMessage(`토큰 저장 실패: ${errorData.message}`);
  //     }
  //   } catch (error) {
  //     console.error('Error sending FCM token to server:', error);
  //     setErrorMessage(`토큰 전송 중 네트워크 오류: ${error.message}`);
  //   }
  // }, [user?.seq]);

  // FCM 관련 useEffect 훅 제거:
  // useEffect(() => {
  //   if (typeof window !== 'undefined' && messaging && isLoggedIn && user?.seq) {
  //     if (!('Notification' in window)) {
  //       setErrorMessage('이 브라우저는 알림을 지원하지 않습니다.');
  //       return;
  //     }
  //     if (!('serviceWorker' in navigator)) {
  //       setErrorMessage('이 브라우저는 서비스 워커를 지원하지 않습니다. PWA 푸시 알림을 사용할 수 없습니다.');
  //       return;
  //     }
  //
  //     const setupNotifications = async () => {
  //       try {
  //         const registration = await navigator.serviceWorker.register('/sw.js');
  //         console.log('Service Worker registered:', registration);
  //
  //         const permission = await Notification.requestPermission();
  //         if (permission === 'granted') {
  //           setPermissionGranted(true);
  //           console.log('Notification permission granted.');
  //
  //           const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  //           if (!vapidKey) {
  //               setErrorMessage('VAPID 키가 설정되지 않았습니다. Firebase 콘솔에서 VAPID 키를 가져와 환경 변수에 설정해주세요.');
  //               console.error('VAPID key is not set. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.');
  //               return;
  //           }
  //
  //           const currentToken = await getToken(messaging, { vapidKey: vapidKey });
  //           if (currentToken) {
  //             console.log('FCM Registration Token:', currentToken);
  //             setCurrentFcmToken(currentToken);
  //             sendTokenToServer(currentToken);
  //           } else {
  //             console.log('No FCM registration token available. Request permission to generate one.');
  //             setErrorMessage('FCM 등록 토큰을 가져올 수 없습니다. 알림 권한을 허용해주세요.');
  //           }
  //
  //           onMessage(messaging, (payload) => {
  //             console.log('Message received in foreground. ', payload);
  //             const { title, body } = payload.notification || { title: '새 알림', body: '새로운 메시지가 도착했습니다.' };
  //             const notificationBody = payload.data?.body || body;
  //             showModal(`${title}: ${notificationBody}`);
  //           });
  //         } else if (permission === 'denied') {
  //           setPermissionGranted(false);
  //           setErrorMessage('알림 권한이 거부되었습니다. 알림을 받으려면 브라우저 설정에서 권한을 허용해주세요.');
  //           console.log('Notification permission denied.');
  //         } else {
  //           setPermissionGranted(false);
  //           setErrorMessage('알림 권한 상태가 불확실합니다.');
  //           console.log('Notification permission unknown.');
  //         }
  //       } catch (error) {
  //         console.error('Error during notification setup:', error);
  //         setErrorMessage(`알림 설정 중 오류가 발생했습니다: ${error.message}`);
  //       }
  //     };
  //
  //     setupNotifications();
  //   } else if (!isLoggedIn) {
  //       setErrorMessage('로그인 후 푸시 알림 기능을 사용할 수 있습니다.');
  //       setCurrentFcmToken('');
  //       setPermissionGranted(false);
  //   } else if (!user?.seq) {
  //       setErrorMessage('사용자 정보를 불러오는 중입니다...');
  //   }
  // }, [messaging, isLoggedIn, user?.seq, sendTokenToServer, showModal]);

  // URL 검색 매개변수에 따라 탭 활성화 (클라이언트에서만 실행) - Settings 탭만 있으므로 'settings'로 고정
  useEffect(() => {
    setActiveTab('settings'); // 항상 settings 탭이 활성화되도록 고정
  }, [searchParams]);

  // 사용자 알림 설정을 불러오는 함수
  const fetchNotificationSettings = useCallback(async () => {
    if (!isLoggedIn || !user?.seq) {
      setSettingsLoading(false);
      return;
    }
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const response = await fetch(`/api/users/${user.seq}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const userData = await response.json();
      const userNotifications = userData.notifications || {}; // notifications 필드가 없을 경우 빈 객체

      // DynamoDB에서 가져온 값으로 상태 업데이트
      const newSettings = {
        order: userNotifications.order === true,
        payment: userNotifications.payment === true,
        delivery: userNotifications.delivery === true,
        qna: userNotifications.qna === true,
      };

      // "All" 토글 상태 계산
      newSettings.all = newSettings.order && newSettings.payment && newSettings.delivery && newSettings.qna;
      
      setNotificationSettings(newSettings);

    } catch (err) {
      console.error("Error fetching notification settings:", err);
      setSettingsError("Unable to load settings. Try again later.");
      showModal("Unable to load settings. Try again later.");
    } finally {
      setSettingsLoading(false);
    }
  }, [isLoggedIn, user?.seq, showModal]);

  // 알림 설정을 DynamoDB에 저장하는 함수
  const saveNotificationPreferences = useCallback(async (updatedSettings) => {
    if (!isLoggedIn || !user?.seq) {
      showModal("로그인 후 이용 가능한 서비스입니다.");
      router.replace('/');
      return;
    }
    setSettingsLoading(true);
    setSettingsError(null);
    try {
      const payload = {
        notifications: {
          order: updatedSettings.order,
          payment: updatedSettings.payment,
          delivery: updatedSettings.delivery,
          qna: updatedSettings.qna,
        }
      };

      const response = await fetch(`/api/users/${user.seq}`, {
        method: 'PUT', // PUT 요청으로 사용자 정보 업데이트
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save notification preferences: ${response.status}`);
      }
      showModal("Notification preferences saved successfully!");

    } catch (err) {
      console.error("Error saving notification preferences:", err);
      setSettingsError("Failed to save notification preferences. Please try again.");
      showModal("Failed to save notification preferences. Please try again.");
    } finally {
      setSettingsLoading(false);
    }
  }, [isLoggedIn, user?.seq, showModal, router]);


  // "All" 토글 변경 시 모든 개별 토글 상태 변경
  const handleAllToggle = (e) => {
    const isChecked = e.target.checked;
    const newSettings = {
      all: isChecked,
      order: isChecked,
      payment: isChecked,
      delivery: isChecked,
      qna: isChecked,
    };
    setNotificationSettings(newSettings);
    saveNotificationPreferences(newSettings); // 변경 사항 저장
  };

  // 개별 토글 변경 시 해당 토글 상태 변경 및 "All" 토글 상태 업데이트
  const handleIndividualToggle = (category) => (e) => {
    const isChecked = e.target.checked;
    const newSettings = {
      ...notificationSettings,
      [category]: isChecked,
    };

    // 모든 개별 토글이 활성화되면 "All" 토글도 활성화
    const allChecked = newSettings.order && newSettings.payment && newSettings.delivery && newSettings.qna;
    newSettings.all = allChecked;

    setNotificationSettings(newSettings);
    saveNotificationPreferences(newSettings); // 변경 사항 저장
  };

  // 로그인 상태가 아니면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, router]);

  // "Settings" 탭이 활성화될 때 알림 설정 불러오기
  useEffect(() => {
    if (activeTab === 'settings') {
      fetchNotificationSettings();
    }
  }, [activeTab, fetchNotificationSettings]);

  if (!isLoggedIn) {
    return null; // 로그인되지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 처리)
  }

  return (
      <main className={styles.mainContent}>
        {settingsLoading ? (
          <div className={styles.notificationList}><div className={styles.emptyMessage}>설정을 불러오는 중...</div></div>
        ) : settingsError ? (
          <div className={`${styles.notificationList} ${styles.emptyMessage} ${styles.errorText}`}>오류: {settingsError}</div>
        ) : (
          <ul className={styles.notificationList}>
            {/* FCM 토큰 및 권한 상태 표시 (관련 코드 제거) */}
            {/* <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>푸시 알림 상태</span>
              <div className={styles.statusContainer}>
                {!permissionGranted && errorMessage && (
                  <p className={styles.errorMessage}>{errorMessage}</p>
                )}
                {permissionGranted && (
                  <>
                    <p>푸시 알림이 활성화되어 있습니다.</p>
                    <p>현재 FCM 토큰: <span className={styles.fcmToken}>{currentFcmToken || '로딩 중...'}</span></p>
                    <button onClick={() => {
                      if (messaging) {
                          getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration: navigator.serviceWorker.controller?.active }).then((refreshedToken) => {
                              if (refreshedToken) {
                                  console.log('Refreshed FCM Token:', refreshedToken);
                                  setCurrentFcmToken(refreshedToken);
                                  sendTokenToServer(refreshedToken);
                              } else {
                                  console.warn('Failed to refresh token.');
                              }
                          }).catch(error => console.error('Error refreshing token:', error));
                      }
                    }} className={styles.refreshButton}>FCM 토큰 새로고침</button>
                  </>
                )}
              </div>
            </li> */}
            <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>All</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notificationSettings.all}
                  onChange={handleAllToggle}
                />
                <span className={styles.slider}></span>
              </label>
            </li>
            <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>Order</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notificationSettings.order}
                  onChange={handleIndividualToggle('order')}
                />
                <span className={styles.slider}></span>
              </label>
            </li>
            <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>Payment</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notificationSettings.payment}
                  onChange={handleIndividualToggle('payment')}
                />
                <span className={styles.slider}></span>
              </label>
            </li>
            <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>Delivery</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notificationSettings.delivery}
                  onChange={handleIndividualToggle('delivery')}
                />
                <span className={styles.slider}></span>
              </label>
            </li>
            <li className={styles.notificationItem}>
              <span className={styles.notificationLabel}>Q&A</span>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={notificationSettings.qna}
                  onChange={handleIndividualToggle('qna')}
                />
                <span className={styles.slider}></span>
              </label>
            </li>
          </ul>
        )}
      </main>
  );
}

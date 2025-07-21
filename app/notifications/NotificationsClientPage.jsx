// app/notifications/NotificationsClientPage.jsx
'use client'; // 이 컴포넌트가 클라이언트에서만 실행됨을 명시

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './notifications.module.css'; // 기존 CSS 모듈 경로 유지
import { useAuth } from '@/contexts/AuthContext';
import { useModal } from '@/contexts/ModalContext';
import { messaging } from '@/utils/firebaseConfig'; // 생성한 Firebase 초기화 파일 임포트
import { getToken, onMessage } from 'firebase/messaging';

export default function NotificationsClientPage() { // 컴포넌트 이름을 NotificationsClientPage로 변경
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth(); // useAuth 훅에서 user와 isLoggedIn 가져오기
  const { showModal } = useModal();

  // 탭 상태 관리: 'settings' 또는 'alarms'
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

  // 알림 수신 목록 상태 (Alarms 탭)
  const [alarmList, setAlarmList] = useState([]);
  const [alarmFilterCategory, setAlarmFilterCategory] = useState('ALL');
  const [alarmsLoading, setAlarmsLoading] = useState(true);
  const [alarmsError, setAlarmsError] = useState(null);

  // 공통 로딩 상태 (설정 저장 등)
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);

  // FCM 토큰 상태
  const [notifications, setNotifications] = useState([]);
  const [currentFcmToken, setCurrentFcmToken] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // FCM 토큰을 서버에 전송하는 함수
  // user.seq에 의존하도록 useCallback으로 래핑
  const sendTokenToServer = useCallback(async (token) => {
    // user?.seq가 유효한지 다시 한번 확인
    if (!user?.seq) {
      console.warn('User ID is not available. Cannot send FCM token to server.');
      setErrorMessage('사용자 정보가 없어 FCM 토큰을 저장할 수 없습니다. 로그인 후 다시 시도해주세요.');
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.seq}`, { // user.seq 사용
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${user.token}` // 필요한 경우 인증 토큰 추가
        },
        body: JSON.stringify({ fcmToken: token }),
      });

      if (response.ok) {
        console.log('FCM token successfully sent to server for user:', user.seq);
      } else {
        const errorData = await response.json();
        console.error('Failed to send FCM token to server:', errorData.message);
        setErrorMessage(`토큰 저장 실패: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error sending FCM token to server:', error);
      setErrorMessage(`토큰 전송 중 네트워크 오류: ${error.message}`);
    }
  }, [user?.seq]); // user.seq가 변경될 때마다 함수를 새로 생성

  useEffect(() => {
    // 메시징 객체가 로드되었는지 확인
    if (typeof window !== 'undefined' && messaging && isLoggedIn && user?.seq) {
      // Notification API 지원 여부 확인
      if (!('Notification' in window)) {
        setErrorMessage('이 브라우저는 알림을 지원하지 않습니다.');
        return;
      }
      if (!('serviceWorker' in navigator)) {
        setErrorMessage('이 브라우저는 서비스 워커를 지원하지 않습니다. PWA 푸시 알림을 사용할 수 없습니다.');
        return;
      }

      // 서비스 워커 등록 확인 및 FCM 토큰 요청
      const setupNotifications = async () => {
        try {
          // 서비스 워커 등록
          const registration = await navigator.serviceWorker.register('/sw.js'); // Next.js PWA의 기본 서비스 워커 파일
          console.log('Service Worker registered:', registration);

          // 알림 권한 요청
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            setPermissionGranted(true);
            console.log('Notification permission granted.');

            // FCM 토큰 가져오기
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                setErrorMessage('VAPID 키가 설정되지 않았습니다. Firebase 콘솔에서 VAPID 키를 가져와 환경 변수에 설정해주세요.');
                console.error('VAPID key is not set. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY in your .env.local file.');
                return;
            }

            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) {
              console.log('FCM Registration Token:', currentToken);
              setCurrentFcmToken(currentToken);
              sendTokenToServer(currentToken); // 이제 user.seq가 유효한 시점에 호출됩니다.

            } else {
              console.log('No FCM registration token available. Request permission to generate one.');
              setErrorMessage('FCM 등록 토큰을 가져올 수 없습니다. 알림 권한을 허용해주세요.');
            }

            // 포그라운드 메시지 수신 처리 (앱이 열려 있을 때)
            onMessage(messaging, (payload) => {
              console.log('Message received in foreground. ', payload);
              const { title, body } = payload.notification || { title: '새 알림', body: '새로운 메시지가 도착했습니다.' };
              const notificationBody = payload.data?.body || body;

              setNotifications(prev => [...prev, { title, body: notificationBody, timestamp: new Date().toLocaleString() }]);
            });
          } else if (permission === 'denied') {
            setPermissionGranted(false);
            setErrorMessage('알림 권한이 거부되었습니다. 알림을 받으려면 브라우저 설정에서 권한을 허용해주세요.');
            console.log('Notification permission denied.');
          } else {
            setPermissionGranted(false);
            setErrorMessage('알림 권한 상태가 불확실합니다.');
            console.log('Notification permission unknown.');
          }
        } catch (error) {
          console.error('Error during notification setup:', error);
          setErrorMessage(`알림 설정 중 오류가 발생했습니다: ${error.message}`);
        }
      };

      setupNotifications();
    } else if (!isLoggedIn) {
        // 로그인되지 않은 경우 메시지 설정 (옵션)
        setErrorMessage('로그인 후 푸시 알림 기능을 사용할 수 있습니다.');
        setCurrentFcmToken(''); // 토큰 초기화
        setPermissionGranted(false);
    } else if (!user?.seq) {
        // 로그인되었지만 user.seq가 없는 경우 (데이터 로딩 중 등)
        setErrorMessage('사용자 정보를 불러오는 중입니다...');
    }
  }, [messaging, isLoggedIn, user?.seq, sendTokenToServer]); // user.seq와 isLoggedIn이 변경될 때마다 재실행

  // URL 검색 매개변수에 따라 탭 활성화 (클라이언트에서만 실행)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && (tabFromUrl === 'settings' || tabFromUrl === 'alarms')) {
      setActiveTab(tabFromUrl);
    }
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

  // 알림 수신 화면의 알림 목록을 불러오는 함수
  const fetchAlarms = useCallback(async () => {
    setAlarmsLoading(true);
    setAlarmsError(null);
    try {
      // Mock Data (실제 API 응답 형식에 맞춰 조정 필요)
      const mockAlarms = [
        { id: 'a1', category: 'Order', title: 'Order Request', content: 'Your order list has been submitted. Please wait for confirmation.', date: '2025.03.14', isNew: true },
        { id: 'a2', category: 'Order', title: 'Order Confirmed', content: 'Your order has been confirmed and is now in process.', date: '2025.03.14', isNew: true },
        { id: 'a3', category: 'Payment', title: 'Invoice Issued', content: 'Invoice has been issued. Please proceed with payment.', date: '2025.03.14', isNew: false },
        { id: 'a4', category: 'Delivery', title: 'Shipment Prepared', content: 'Payment completed. Preparing your shipment now.', date: '2025.03.14', isNew: false },
        { id: 'a5', category: 'Q&A', title: 'New Answer', content: 'Your Q&A has been answered. Please check it.', date: '2025.03.13', isNew: false },
        { id: 'a6', category: 'Order', title: 'Order Delivered', content: 'Your order has been successfully delivered.', date: '2025.03.12', isNew: false },
      ];
      setAlarmList(mockAlarms);
    } catch (err) {
      console.error("Error fetching alarms:", err);
      setAlarmsError("Unable to load settings. Try again later.");
      showModal("Unable to load settings. Try again later.");
    } finally {
      setAlarmsLoading(false);
    }
  }, [showModal]);

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

  // "Alarms" 탭이 활성화될 때 알림 목록 불러오기
  useEffect(() => {
    if (activeTab === 'alarms') {
      fetchAlarms();
    }
  }, [activeTab, fetchAlarms]);

  // 필터링된 알림 목록 (Alarms 탭)
  const filteredAlarms = useMemo(() => {
    if (!alarmList) return [];
    return alarmList.filter(alarm => {
      return alarmFilterCategory === 'ALL' || alarm.category.toUpperCase() === alarmFilterCategory.toUpperCase();
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [alarmList, alarmFilterCategory]);

  // 알림 확인 버튼 클릭 핸들러
  const handleAlarmOkClick = (alarmId) => {
    setAlarmList(prevAlarms =>
      prevAlarms.map(alarm =>
        alarm.id === alarmId ? { ...alarm, isNew: false } : alarm
      )
    );
    // TODO: 백엔드에 알림 확인 상태 저장 API 호출
  };

  // 알림 항목 클릭 시 상세 페이지로 이동
  const handleAlarmItemClick = (alarmId) => {
    router.push(`/notifications/${alarmId}`);
  };

  if (!isLoggedIn) {
    return null; // 로그인되지 않은 경우 아무것도 렌더링하지 않음 (리다이렉트 처리)
  }

  return (
    <>
      <div className={styles.notificationTabs}>
        <button
          className={`${styles.notificationTabButton} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`${styles.notificationTabButton} ${activeTab === 'alarms' ? styles.active : ''}`}
          onClick={() => setActiveTab('alarms')}
        >
          Alarms
        </button>
      </div>

      <main className={styles.mainContent}>
        {settingsLoading && activeTab === 'settings' ? (
          <div className={styles.notificationList}><div className={styles.emptyMessage}>설정을 불러오는 중...</div></div>
        ) : settingsError && activeTab === 'settings' ? (
          <div className={`${styles.notificationList} ${styles.emptyMessage} ${styles.errorText}`}>오류: {settingsError}</div>
        ) : activeTab === 'settings' && (
          <ul className={styles.notificationList}>
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

        {activeTab === 'alarms' && (
          <>
            <div className={styles.container}>
              <h1>알림 설정</h1>
              {!permissionGranted && errorMessage && (
                  <p className={styles.errorMessage}>{errorMessage}</p>
              )}
              {permissionGranted && (
                  <>
                  <p>푸시 알림이 활성화되어 있습니다.</p>
                  <p>현재 FCM 토큰: <span className={styles.fcmToken}>{currentFcmToken || '로딩 중...'}</span></p>
                  </>
              )}

              <h2>수신된 알림</h2>
              <div className={styles.notificationList}>
                  {notifications.length > 0 ? (
                  notifications.map((notif, index) => (
                      <div key={index} className={styles.notificationItem}>
                      <h3>{notif.title}</h3>
                      <p>{notif.body}</p>
                      <small>{notif.timestamp}</small>
                      </div>
                  ))
                  ) : (
                  <p>아직 수신된 알림이 없습니다.</p>
                  )}

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
                }}>FCM 토큰 새로고침</button>
              </div>
            </div>
            <div className={styles.alarmFilterTabs}>
              <button
                className={`${styles.alarmFilterChip} ${alarmFilterCategory === 'ALL' ? styles.active : ''}`}
                onClick={() => setAlarmFilterCategory('ALL')}
              >
                ALL
              </button>
              <button
                className={`${styles.alarmFilterChip} ${alarmFilterCategory === 'ORDER' ? styles.active : ''}`}
                onClick={() => setAlarmFilterCategory('ORDER')}
              >
                Order
              </button>
              <button
                className={`${styles.alarmFilterChip} ${alarmFilterCategory === 'PAYMENT' ? styles.active : ''}`}
                onClick={() => setAlarmFilterCategory('PAYMENT')}
              >
                Payment
              </button>
              <button
                className={`${styles.alarmFilterChip} ${alarmFilterCategory === 'DELIVERY' ? styles.active : ''}`}
                onClick={() => setAlarmFilterCategory('DELIVERY')}
              >
                Delivery
              </button>
            </div>

            {alarmsLoading ? (
              <div className={styles.alarmListContainer}><div className={styles.emptyMessage}>알림을 불러오는 중...</div></div>
            ) : alarmsError ? (
              <div className={`${styles.alarmListContainer} ${styles.emptyMessage} ${styles.errorText}`}>오류: {alarmsError}</div>
            ) : filteredAlarms.length > 0 ? (
              <div className={styles.alarmListContainer}>
                {filteredAlarms.map(alarm => (
                  <div key={alarm.id} className={styles.alarmItem} onClick={() => handleAlarmItemClick(alarm.id)}>
                    {alarm.isNew && <span className={styles.newAlarmTag}>New alarm</span>}
                    <div className={styles.alarmHeader}>
                      <span className={styles.alarmCategoryTag}>[{alarm.category} Request]</span>
                      {alarm.isNew && (
                        <button onClick={(e) => { e.stopPropagation(); handleAlarmOkClick(alarm.id); }} className={styles.alarmOkButton}>
                          ok
                        </button>
                      )}
                    </div>
                    <h3 className={styles.alarmTitle}>{alarm.title}</h3>
                    <p className={styles.alarmContent}>{alarm.content}</p>
                    <span className={styles.alarmDate}>{alarm.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.alarmListContainer}><div className={styles.emptyMessage}>알림이 없습니다.</div></div>
            )}
          </>
        )}
      </main>
    </>
  );
}
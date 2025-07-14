// app/notifications/page.js
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './notifications.module.css'; // 새로 생성한 CSS Modules import
import AuthHeader from '@/components/AuthHeader'; // 뒤로가기 버튼을 위한 공통 헤더 컴포넌트
import { useAuth } from '@/contexts/AuthContext'; // 로그인 상태 확인
import { useModal } from '@/contexts/ModalContext'; // 알림 모달 사용

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoggedIn } = useAuth(); // 로그인 상태 확인
  const { showModal } = useModal();

  // 탭 상태 관리: 'settings' 또는 'alarms'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'settings');

  // 알림 설정 상태 (Settings 탭)
  const [notificationSettings, setNotificationSettings] = useState({
    all: true,
    order: true,
    payment: true,
    delivery: true,
    qna: true,
  });

  // 알림 수신 목록 상태 (Alarms 탭)
  const [alarmList, setAlarmList] = useState([]);
  const [alarmFilterCategory, setAlarmFilterCategory] = useState('ALL');
  const [alarmsLoading, setAlarmsLoading] = useState(true);
  const [alarmsError, setAlarmsError] = useState(null);

  // 공통 로딩 상태 (설정 저장 등)
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState(null);


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
    // TODO: 실제 API 엔드포인트로 변경 (예: /api/user/notifications)
    // 현재는 Mock Data를 사용합니다.
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

  const handleBack = () => {
    router.back(); // 이전 페이지로 돌아가기
  };

  // 필터링된 알림 목록 (Alarms 탭)
  const filteredAlarms = useMemo(() => {
    if (!alarmList) return [];
    return alarmList.filter(alarm => {
      return alarmFilterCategory === 'ALL' || alarm.category.toUpperCase() === alarmFilterCategory.toUpperCase();
    }).sort((a, b) => new Date(b.date) - new Date(a.date)); // 최신순 정렬
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
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <button onClick={handleBack} className={styles.iconButton}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>
        </button>
        <h1 className={styles.title}>Notifications</h1>
        <div style={{ width: '24px' }}></div> {/* Header spacing */}
      </header>

      {/* Notifications 탭 컨트롤 */}
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
                      <span className={styles.alarmCategoryTag}>[{alarm.category} Request]</span> {/* Adjust tag text */}
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
    </div>
  );
}

// src/app/home/components/HomeHeader.js
'use client'; // 클라이언트 컴포넌트로 선언

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '../home.module.css';
import { useAuth } from '@/contexts/AuthContext'; // useAuth 훅 임포트
import moment from 'moment'; // 알림 정렬을 위해 moment 임포트 (선택 사항이지만 유용)

// [수정] isSearchVisible(isActive) 값에 따라 stroke 색상을 변경
const SearchIcon = ({ isActive }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke={isActive ? '#f5a623' : 'currentColor'} 
    className={styles.icon}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

// [수정] BellIcon 컴포넌트 수정: readNotificationExists prop을 받도록
const BellIcon = ({ readNotificationExists }) => (
    <div className={styles.bellIconContainer}>
        <img src="/images/bell.png" alt="Notifications" className={styles.icon} />
        {readNotificationExists && <span className={styles.notificationBadge}></span>}
    </div>
);

const CartIcon = () => <img src="/images/cart.png" alt="Cart" className={styles.icon} />;

// [수정] isSearchVisible prop을 받도록 수정하고, 알림 상태 로직 추가
export default function HomeHeader({ onSearchClick, isSearchVisible }) {
    const { user, isLoggedIn } = useAuth();
    const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

    const checkUnreadNotifications = useCallback(async () => {
        if (!isLoggedIn || !user?.seq) {
            setHasUnreadNotifications(false);
            return;
        }
        try {
            const response = await fetch(`/api/users/${user.seq}`);
            if (!response.ok) {
                console.error('Failed to fetch user data for notifications.');
                setHasUnreadNotifications(false);
                return;
            }
            const userData = await response.json();
            const unreadCount = (userData.noti || []).filter(item => !item.read).length;
            setHasUnreadNotifications(unreadCount > 0);
        } catch (error) {
            console.error('Error checking unread notifications:', error);
            setHasUnreadNotifications(false);
        }
    }, [isLoggedIn, user?.seq]);

    useEffect(() => {
        checkUnreadNotifications();

        // 주기적으로 알림 상태를 확인하거나, WebSocket 등으로 실시간 알림을 구현할 수 있음
        // 여기서는 간단하게 30초마다 확인하도록 예시 (실제 서비스에서는 최적화 필요)
        const intervalId = setInterval(checkUnreadNotifications, 30000); 

        return () => clearInterval(intervalId); // 컴포넌트 언마운트 시 인터벌 정리
    }, [checkUnreadNotifications]);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>UMS SHOP</div>
      <div className={styles.headerIcons}>
        <button onClick={onSearchClick} className={styles.iconButton}>
          {/* [수정] isSearchVisible 값을 SearchIcon에 전달 */}
          <SearchIcon isActive={isSearchVisible} />
        </button>
        <Link href="/notifications" passHref>
            {/* [수정] hasUnreadNotifications 값을 BellIcon에 전달 */}
            <BellIcon readNotificationExists={hasUnreadNotifications} />
        </Link>
        <Link href="/cart" passHref><CartIcon /></Link>
      </div>
    </header>
  );
}
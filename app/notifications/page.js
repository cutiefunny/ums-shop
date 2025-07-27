// src/app/notifications/page.js
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './notifications.module.css';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext'; // useAuth 훅 임포트
import { useModal } from '@/contexts/ModalContext'; // useModal 훅 임포트 (알림 메시지 표시용)
import moment from 'moment'; // 날짜 형식을 위해 moment 사용

const NotificationsClientPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL', 'Order', 'Payment', 'Delivery'
    const router = useRouter();
    const { user, isLoggedIn } = useAuth(); // 현재 로그인한 사용자 정보 가져오기
    const { showModal } = useModal(); // 모달 훅 사용

    const fetchNotifications = useCallback(async () => {
        if (!isLoggedIn || !user?.seq) {
            setNotifications([]);
            setLoading(false);
            console.log('User not logged in or user seq is missing.');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // 사용자 정보를 가져와 noti 배열을 읽어옵니다.
            const response = await fetch(`/api/users/${user.seq}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch user notifications');
            }
            const userData = await response.json();
            
            // noti 배열이 존재하고 배열인지 확인, 없다면 빈 배열로 초기화
            const fetchedNoti = Array.isArray(userData.noti) ? userData.noti : [];

            // 최신 알림이 위로 오도록 정렬 (timestamp 기준 내림차순)
            const sortedNotifications = fetchedNoti.sort((a, b) => 
                moment(b.timestamp).valueOf() - moment(a.timestamp).valueOf()
            );

            setNotifications(sortedNotifications);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
            setError(`알림을 불러오는 데 실패했습니다: ${err.message}`);
            showModal(`알림을 불러오는 데 실패했습니다: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, user?.seq, showModal]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const handleNotificationClick = useCallback(async (notiItem) => {
        // 읽지 않은 알림을 클릭했을 때만 서버에 업데이트 요청
        if (!notiItem.read) {
            try {
                // optimistic update
                setNotifications(prevNotifications =>
                    prevNotifications.map(n =>
                        n.timestamp === notiItem.timestamp ? { ...n, read: true } : n
                    )
                );

                // 서버에 읽음 상태 업데이트 요청
                // 사용자 전체 noti 배열을 업데이트하는 것이므로, useNotification 훅의 로직과 유사
                const currentUserResponse = await fetch(`/api/users/${user.seq}`);
                if (!currentUserResponse.ok) {
                    throw new Error("Failed to fetch user data for read update.");
                }
                const currentUserData = await currentUserResponse.json();
                const updatedNotiArray = (currentUserData.noti || []).map(n =>
                    n.timestamp === notiItem.timestamp ? { ...n, read: true } : n
                );

                const updateResponse = await fetch(`/api/users/${user.seq}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ noti: updatedNotiArray }),
                });

                if (!updateResponse.ok) {
                    throw new Error("Failed to update notification read status on server.");
                }
                console.log(`Notification ${notiItem.code} marked as read on server.`);

            } catch (err) {
                console.error("Error marking notification as read:", err);
                // 오류 발생 시 UI를 원래 상태로 되돌릴 수 있습니다. (rollback)
                setNotifications(prevNotifications =>
                    prevNotifications.map(n =>
                        n.timestamp === notiItem.timestamp ? { ...n, read: false } : n
                    )
                );
                showModal(`알림 상태 업데이트 실패: ${err.message}`);
            }
        }


        if (notiItem.category === 'Order' && notiItem.orderId) {
            router.push(`/orders/detail/${notiItem.orderId}`);
        } else if (notiItem.category === 'Payment' && notiItem.orderId) {
             router.push(`/orders/payment/${notiItem.orderId}`); // 결제 관련 알림
        } else if (notiItem.category === 'Delivery' && notiItem.orderId) {
             router.push(`/orders/tracking/${notiItem.orderId}`); // 배송 추적 페이지 (예시)
        } else if (notiItem.category === 'QnA' && notiItem.id) {
            router.push(`/q-and-a/${notiItem.id}`); // Q&A 상세 페이지
        }
        // 다른 category에 따른 이동 로직 추가 가능
    }, [user?.seq, showModal, router]);


    const markAllAsRead = useCallback(async () => {
        try {
            // optimistic update
            setNotifications(prevNotifications =>
                prevNotifications.map(notification => ({ ...notification, read: true }))
            );

            // 서버에 모든 알림 읽음 상태 업데이트 요청
            const currentUserResponse = await fetch(`/api/users/${user.seq}`);
            if (!currentUserResponse.ok) {
                throw new Error("Failed to fetch user data for mark all as read.");
            }
            const currentUserData = await currentUserResponse.json();
            const updatedNotiArray = (currentUserData.noti || []).map(n => ({ ...n, read: true }));

            const updateResponse = await fetch(`/api/users/${user.seq}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ noti: updatedNotiArray }),
            });

            if (!updateResponse.ok) {
                throw new Error("Failed to mark all notifications as read on server.");
            }
            console.log("All notifications marked as read on server.");

        } catch (err) {
            console.error("Error marking all notifications as read:", err);
            // 오류 발생 시 UI를 원래 상태로 되돌릴 수 있습니다.
            fetchNotifications(); // 다시 데이터를 불러와 상태를 동기화
            showModal(`모든 알림 읽음 처리 실패: ${err.message}`);
        }

    }, [user?.seq, showModal, fetchNotifications]);

    const unreadNotificationsCount = useMemo(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        if (filterCategory === 'ALL') {
            return notifications;
        }
        return notifications.filter(notification => notification.category === filterCategory);
    }, [notifications, filterCategory]);

    if (!isLoggedIn) {
        return (
            <div className={styles.container}>
                <p className={styles.infoMessage}>로그인 후 알림을 확인하실 수 있습니다.</p>
                <button onClick={() => router.push('/login')} className={styles.loginButton}>로그인</button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.headerContainer}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>
                </button>
                <h1 className={styles.headerTitle}>Notifications</h1> {/* 제목을 Notifications로 변경 */}
                {unreadNotificationsCount > 0 && (
                    <button onClick={markAllAsRead} className={styles.markAllReadButton}>
                        모두 읽음
                    </button>
                )}
            </header>

            {/* 필터링 탭 */}
            <div className={styles.filterTabs}>
                <button
                    className={`${styles.filterTab} ${filterCategory === 'ALL' ? styles.active : ''}`}
                    onClick={() => setFilterCategory('ALL')}
                >
                    ALL ({notifications.length})
                </button>
                <button
                    className={`${styles.filterTab} ${filterCategory === 'Order' ? styles.active : ''}`}
                    onClick={() => setFilterCategory('Order')}
                >
                    Order ({notifications.filter(n => n.category === 'Order').length})
                </button>
                <button
                    className={`${styles.filterTab} ${filterCategory === 'Payment' ? styles.active : ''}`}
                    onClick={() => setFilterCategory('Payment')}
                >
                    Payment ({notifications.filter(n => n.category === 'Payment').length})
                </button>
                <button
                    className={`${styles.filterTab} ${filterCategory === 'Delivery' ? styles.active : ''}`}
                    onClick={() => setFilterCategory('Delivery')}
                >
                    Delivery ({notifications.filter(n => n.category === 'Delivery').length})
                </button>
            </div>

            {/* New alarm 배너 */}
            {unreadNotificationsCount > 0 && (
                <div className={styles.newAlarmBanner}>
                    <div className={styles.newAlarmContent}>
                        <Image src="/images/check-circle.png" alt="Check" width={20} height={20} />
                        <span>New alarm</span>
                    </div>
                    <button onClick={markAllAsRead} className={styles.okButton}>
                        ok
                    </button>
                </div>
            )}

            {loading && <p className={styles.infoMessage}>알림을 불러오는 중...</p>}
            {error && <p className={styles.errorMessage}>{error}</p>}

            {!loading && !error && filteredNotifications.length === 0 && (
                <p className={styles.noNotifications}>표시할 알림이 없습니다.</p>
            )}

            {!loading && !error && filteredNotifications.length > 0 && (
                <ul className={styles.notificationList}>
                    {filteredNotifications.map((notification, index) => (
                        <li
                            key={notification.timestamp + index} // timestamp가 같을 수 있으므로 index도 함께 사용
                            className={`${styles.notificationItem} ${
                                notification.read ? styles.read : styles.unread
                            }`}
                            onClick={() => handleNotificationClick(notification)}
                        >
                            {/* <div className={styles.notificationIcon}>
                                <Image
                                    src={
                                        notification.category === "Order"
                                            ? "/images/cart.png" // 주문 아이콘
                                            : notification.category === "Payment"
                                            ? "/images/Money_Bag.png" // 결제 아이콘 (임시)
                                            : notification.category === "Delivery"
                                            ? "/images/Delivery.png" // 배송 아이콘
                                            : "/images/bell.png" // 기본/기타 아이콘
                                    }
                                    alt={notification.category}
                                    width={24}
                                    height={24}
                                />
                            </div> */}
                            <div className={styles.notificationContent}>
                                <p className={styles.notificationTitle}>
                                    [{notification.title}]
                                </p>
                                <p className={styles.notificationMessage}>
                                    {notification.en} {/* 영어 메시지 표시 */}
                                </p>
                                <span className={styles.notificationDate}>
                                    {moment(notification.timestamp).format('YYYY. MM. DD')}
                                </span>
                            </div>
                            {!notification.read && (
                                <div className={styles.unreadIndicator}></div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default NotificationsClientPage;
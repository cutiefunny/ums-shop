"use client";

import React, { useState, useEffect } from "react";
import styles from "./notifications.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation"; // useRouter import

const NotificationsClientPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter(); // useRouter 초기화

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true);
        // 실제 API 호출 로직으로 대체해야 합니다.
        // 예시 데이터
        const fetchedData = [
          {
            id: 1,
            type: "order",
            message: "주문하신 상품이 배송을 시작했습니다. (주문번호: 20231026-001)",
            date: "2023-10-26 10:00:00",
            read: false,
            link: "/orders/detail/20231026-001", // 상세 페이지 링크 추가
          },
          {
            id: 2,
            type: "promotion",
            message: "이번 주 특가! 놓치지 마세요. 💸 (최대 50% 할인)",
            date: "2023-10-25 14:30:00",
            read: false,
            link: "/products/promotion", // 프로모션 페이지 링크 추가
          },
          {
            id: 3,
            type: "qna",
            message: "문의하신 상품에 대한 답변이 등록되었습니다. (문의번호: QNA-123)",
            date: "2023-10-24 09:15:00",
            read: true,
            link: "/my-questions/QNA-123", // 내 문의 페이지 링크 추가
          },
          {
            id: 4,
            type: "system",
            message: "시스템 점검 예정 안내 (11/01 02:00 ~ 04:00)",
            date: "2023-10-23 18:00:00",
            read: true,
            link: "/notice", // 공지사항 페이지 링크 추가
          },
          {
            id: 5,
            type: "order",
            message: "새로운 주문이 접수되었습니다. 확인해주세요. (주문번호: 20231022-002)",
            date: "2023-10-22 11:20:00",
            read: false,
            link: "/orders/detail/20231022-002",
          },
          {
            id: 6,
            type: "promotion",
            message: "가을 맞이 신상품 출시! (지금 구매 시 10% 추가 할인)",
            date: "2023-10-21 16:00:00",
            read: false,
            link: "/products/new-arrivals",
          },
          {
            id: 7,
            type: "qna",
            message: "배송 문의에 대한 추가 정보 요청 (문의번호: QNA-124)",
            date: "2023-10-20 13:00:00",
            read: true,
            link: "/my-questions/QNA-124",
          },
        ];
        setNotifications(fetchedData);
      } catch (err) {
        setError("알림을 불러오는 데 실패했습니다.");
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationClick = (id, link) => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
    // TODO: 실제 서버에 알림 읽음 상태 업데이트 API 호출
    console.log(`Notification ${id} clicked and marked as read.`);

    if (link) {
      router.push(link); // Next.js 라우터를 사용하여 페이지 이동
    }
  };

  const markAllAsRead = () => {
    setNotifications((prevNotifications) =>
      prevNotifications.map((notification) => ({ ...notification, read: true }))
    );
    // TODO: 실제 서버에 모든 알림 읽음 상태 업데이트 API 호출
    console.log("All notifications marked as read.");
  };

  const allNotificationsRead = notifications.every(
    (notification) => notification.read
  );

  return (
    <div className={styles.container}>
      <header className={styles.headerContainer}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <Image src="/images/Caret Down.png" alt="뒤로가기" width={24} height={24} className={styles.backIcon} />
        </button>
        <h1 className={styles.headerTitle}>알림</h1>
        {!allNotificationsRead && notifications.length > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllReadButton}>
            모두 읽음
          </button>
        )}
      </header>

      {loading && <p className={styles.infoMessage}>알림을 불러오는 중...</p>}
      {error && <p className={styles.errorMessage}>{error}</p>}

      {!loading && !error && notifications.length === 0 && (
        <p className={styles.noNotifications}>새로운 알림이 없습니다.</p>
      )}

      {!loading && !error && notifications.length > 0 && (
        <ul className={styles.notificationList}>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`${styles.notificationItem} ${
                notification.read ? styles.read : styles.unread
              }`}
              onClick={() => handleNotificationClick(notification.id, notification.link)}
            >
              <div className={styles.notificationIcon}>
                <Image
                  src={
                    notification.type === "order"
                      ? "/images/Delivery.png" // 주문 아이콘
                      : notification.type === "promotion"
                      ? "/images/bell.png" // 프로모션 아이콘 (기존 알림 아이콘 재활용)
                      : notification.type === "qna"
                      ? "/images/write-pen.png" // Q&A 아이콘
                      : "/images/device-message.png" // 시스템/기타 아이콘
                  }
                  alt={notification.type}
                  width={24}
                  height={24}
                />
              </div>
              <div className={styles.notificationContent}>
                <p className={styles.notificationMessage}>
                  {notification.message}
                </p>
                <span className={styles.notificationDate}>
                  {notification.date}
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
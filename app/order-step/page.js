// app/order-step/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './order-step.module.css'; // 새로 생성한 CSS Modules import
import AuthHeader from '@/components/AuthHeader'; // 뒤로가기 버튼을 위한 공통 헤더 컴포넌트
import { useAuth } from '@/contexts/AuthContext'; // 로그인 상태 확인

export default function OrderStepPage() {
  const router = useRouter();
  const { isLoggedIn } = useAuth(); // 로그인 상태 확인

  // Mock Order Data (실제로는 API에서 사용자 주문 상태를 가져올 예정)
  // currentStepIndex는 현재 진행 중인 단계를 나타냅니다 (0부터 시작).
  const [currentOrderProgress, setCurrentOrderProgress] = useState({
    currentStepIndex: 2, // 예: Payment 단계 (0: Order Placed, 1: Payment, 2: Packing, 3: Delivery, 4: Delivered)
    steps: [
      { id: 'step1', title: 'Order Placed', description: 'Your order has been successfully placed.', date: '2025.03.10', status: 'completed' },
      { id: 'step2', title: 'Payment', description: 'Payment is confirmed and processed.', date: '2025.03.11', status: 'completed' },
      { id: 'step3', title: 'Packing', description: 'Your items are being carefully packed.', date: '2025.03.12', status: 'current' },
      { id: 'step4', title: 'Delivery', description: 'Your order is out for delivery.', date: '', status: 'pending' },
      { id: 'step5', title: 'Delivered', description: 'Your order has been delivered.', date: '', status: 'pending' },
    ]
  });

  // 로그인 상태가 아니면 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/');
    }
  }, [isLoggedIn, router]);

  const handleBack = () => {
    router.back(); // 이전 페이지로 돌아가기
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
        <h1 className={styles.title}>Order Step</h1>
        <div style={{ width: '24px' }}></div> {/* Header spacing */}
      </header>

      <main className={styles.mainContent}>
        <ul className={styles.orderStepList}>
          {currentOrderProgress.steps.map((step, index) => (
            <li key={step.id} className={`${styles.orderStepItem} ${index <= currentOrderProgress.currentStepIndex ? styles.active : ''}`}>
              {/* Vertical line connecting steps */}
              {index < currentOrderProgress.steps.length - 1 && (
                <div className={styles.stepLine}></div>
              )}
              <span className={styles.stepNumber}>{index + 1}</span>
              <div className={styles.stepContent}>
                <h3 className={styles.stepTitle}>
                  {step.title}
                  <span className={`${styles.stepStatusTag} ${styles[step.status]}`}>
                    {step.status}
                  </span>
                </h3>
                <p className={styles.stepDescription}>{step.description}</p>
                {step.date && <span className={styles.stepDate}>{step.date}</span>}
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

// app/notifications/NotificationsWrapper.jsx
'use client'; // 이 컴포넌트가 클라이언트 컴포넌트임을 명시

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import styles from './notifications.module.css'; // 공유된 스타일 경로

// useSearchParams를 사용하는 NotificationsClientPage 컴포넌트를 이 클라이언트 컴포넌트 안에서 동적으로 불러옵니다.
// ssr: false는 NotificationsClientPage가 서버에서 렌더링되지 않도록 합니다.
const NotificationsClientPage = dynamic(
  () => import('./NotificationsClientPage'), // NotificationsClientPage.jsx 파일 경로
  {
    ssr: false, // 이 위치에서는 ssr: false가 허용됩니다.
    loading: () => (
      <div className={styles.emptyMessage} style={{ height: 'calc(100vh - 200px)' }}>
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
    )
  }
);

export default function NotificationsWrapper() {
  const router = useRouter();

  const handleBack = () => {
    router.back(); // 클라이언트 측에서만 동작
  };

  return (
    <div className={styles.pageContainer}> {/* pageContainer 스타일을 여기서 적용 */}
      <header className={styles.header}>
        <button onClick={handleBack} className={styles.iconButton}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z" fill="black"/></svg>
        </button>
        <h1 className={styles.title}>Notifications</h1>
        <div style={{ width: '24px' }}></div>
      </header>

      {/* 동적으로 불러온 클라이언트 컴포넌트를 Suspense로 감쌉니다. */}
      {/* dynamic import에 loading 옵션이 있으므로 여기서는 Suspense fallback이 필요 없을 수도 있지만,
          명시적인 Suspense는 코드 분할과 로딩 상태 관리에 유용합니다. */}
      <Suspense fallback={
        <div className={styles.emptyMessage} style={{ height: 'calc(100vh - 200px)' }}>
          <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
      }>
        <NotificationsClientPage />
      </Suspense>
    </div>
  );
}
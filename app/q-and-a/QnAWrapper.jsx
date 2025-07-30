// app/q-and-a/QnAWrapper.jsx
'use client'; // 이 컴포넌트가 클라이언트 컴포넌트임을 명시

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import styles from '../my-questions/my-questions.module.css'; // 공유된 스타일 경로

// useSearchParams를 사용하는 QnAClientPage 컴포넌트를 이 클라이언트 컴포넌트 안에서 동적으로 불러옵니다.
// ssr: false는 이 컴포넌트(QnAClientPage)가 서버에서 렌더링되지 않도록 합니다.
const QnAClientPage = dynamic(
  () => import('./QnAClientPage'), // QnAClientPage.jsx 파일 경로
  {
    ssr: false, // QnAClientPage는 서버에서 렌더링되지 않습니다. (이 위치에서는 허용됨)
    loading: () => (
      <div className={styles.emptyMessage} style={{ height: 'calc(100vh - 200px)' }}>
        <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
      </div>
    )
  }
);

export default function QnAWrapper() {
  const router = useRouter();

  const handleBack = () => {
    router.back(); // 클라이언트 측에서만 동작
  };

  return (
    <>
      {/* 헤더는 QnAWrapper에서 렌더링 (AuthHeader는 이미 use client이므로 안전) */}
      <header className={styles.header}>
        <button onClick={handleBack} className={styles.iconButton}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>
        <h1 className={styles.title}>Q&A</h1>
        <div style={{ width: '24px' }}></div>
      </header>

      {/* QnAClientPage는 동적으로 로드되며, Suspense로 감싸져 있어 로딩 중 fallback을 보여줍니다. */}
      {/* dynamic import에 loading 옵션이 이미 있으므로 여기서는 fallback이 필요 없을 수도 있습니다. */}
      {/* 그러나 명시적인 Suspense는 코드 분할과 로딩 상태 관리에 유용합니다. */}
      <Suspense fallback={
        <div className={styles.emptyMessage} style={{ height: 'calc(100vh - 200px)' }}>
          <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
        </div>
      }>
        <QnAClientPage />
      </Suspense>
    </>
  );
}
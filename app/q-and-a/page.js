// app/q-and-a/page.js
// 이 파일은 서버 컴포넌트입니다. (맨 위에 'use client' 지시어가 없습니다.)
import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// QnAWrapper 클라이언트 컴포넌트를 동적으로 불러옵니다.
// 이 컴포넌트 자체는 ssr: false가 아니지만, 내부에서 ssr: false인 컴포넌트를 관리합니다.
// 서버는 이 QnAWrapper의 초기 HTML을 렌더링한 다음 클라이언트가 완전히 hydration 합니다.
const QnAWrapper = dynamic(
  () => import('./QnAWrapper'), // QnAWrapper.jsx 파일 경로
  {
    // 로딩 중 보여줄 UI (QnAWrapper가 로드되기 전)
    loading: () => (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        페이지를 불러오는 중입니다...
      </div>
    )
  }
);

export default function QnAPage() {
  return (
    // 페이지 전체를 Suspense로 감싸서, QnAWrapper (및 그 안의 QnAClientPage)가
    // 클라이언트에서 완전히 로드될 때까지 서버가 기다리지 않도록 합니다.
    <Suspense fallback={
      <div style={{ padding: '20px', textAlign: 'center' }}>
        페이지 콘텐츠를 준비 중...
      </div>
    }>
      <QnAWrapper />
    </Suspense>
  );
}
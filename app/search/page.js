// app/search/page.js
'use client'; // 이 파일을 클라이언트 컴포넌트로 선언

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// SearchClientPage 컴포넌트를 동적으로 불러옵니다.
// 이 파일 자체가 이제 클라이언트 컴포넌트이므로, ssr: false 옵션 사용이 가능합니다.
const SearchClientPage = dynamic(
  () => import('./SearchClientPage'), // SearchClientPage.jsx 파일 경로
  {
    ssr: false, // useSearchParams 사용을 위해 클라이언트에서만 렌더링
    loading: () => (
      <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
    )
  }
);

export default function SearchPage() { // 컴포넌트 이름 변경
  return (
    // 페이지 전체를 Suspense로 감싸서, SearchClientPage가
    // 클라이언트에서 완전히 로드될 때까지 로딩 스피너를 보여줍니다.
    <Suspense fallback={
      <img src="/images/loading.gif" alt="Loading..." style={{ width: '48px', height: '48px', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
    }>
      <SearchClientPage />
    </Suspense>
  );
}
// app/ask-question/page.js
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AskQuestionRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/q-and-a?tab=ask');
  }, [router]);

  return null; // 리다이렉트만 수행하므로 UI는 렌더링하지 않습니다.
}

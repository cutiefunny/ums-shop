// app/admin/dashboard/modules/QnAStatusWidget.jsx
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect } from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function QnAStatusWidget() {
  const [unansweredQnA, setUnansweredQnA] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUnansweredQnA() {
      try {
        setLoading(true);
        setError(null);
        // /api/admin/q-and-a 엔드포인트를 호출하여 Q&A 데이터를 가져옵니다.
        // status=Pending 필터를 사용하여 미답변 항목만 요청합니다.
        const response = await fetch('/api/admin/q-and-a?status=Pending');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // API 응답에서 items 배열의 길이를 미답변 건수로 설정합니다.
        setUnansweredQnA(data.items.length);

      } catch (err) {
        console.error("Error fetching unanswered Q&A:", err);
        setError(`미답변 Q&A 수를 불러오는 데 실패했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchUnansweredQnA();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  if (loading) {
    return (
      <Card title="Q&A 미답변">
        <p>데이터를 불러오는 중...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Q&A 미답변">
        <p style={{ color: 'red' }}>오류: {error}</p>
      </Card>
    );
  }

  return (
    <Card title="Q&A 미답변">
      <p>미답변 Q&A: {unansweredQnA}건</p>
    </Card>
  );
}
// app/admin/dashboard/modules/MemberStatusWidget.jsx
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect } from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트
import { useRouter } from 'next/navigation'; // useRouter 훅 임포트

export default function MemberStatusWidget() {
  const [pendingMembers, setPendingMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter(); // useRouter 훅 사용

  useEffect(() => {
    async function fetchPendingMembers() {
      try {
        setLoading(true);
        setError(null);
        // /api/users 엔드포인트를 호출하여 모든 사용자 데이터를 가져옵니다.
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const users = await response.json();

        // 'request' 상태의 사용자만 필터링하여 개수를 계산합니다.
        const pendingCount = users.filter(user => user.approvalStatus === 'request').length;
        setPendingMembers(pendingCount);

      } catch (err) {
        console.error("Error fetching pending members:", err);
        setError(`미승인 회원 수를 불러오는 데 실패했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchPendingMembers();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  // 카드 클릭 시 /admin/user-management 페이지로 이동하며 'Request' 필터를 적용
  const handleCardClick = () => {
    router.push('/admin/user-management?filterStatus=Request');
  };

  if (loading) {
    return (
      <Card title="회원 미승인">
        <p>데이터를 불러오는 중...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="회원 미승인">
        <p style={{ color: 'red' }}>오류: {error}</p>
      </Card>
    );
  }

  return (
    <Card title="회원 미승인" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      <p>승인 대기: {pendingMembers}명</p>
    </Card>
  );
}

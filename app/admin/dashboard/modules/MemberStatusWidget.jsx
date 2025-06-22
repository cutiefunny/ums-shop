// app/admin/dashboard/modules/MemberStatusWidget.jsx
import React from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function MemberStatusWidget() {
  const pendingMembers = 5;

  return (
    <Card title="회원 미승인">
      <p>승인 대기: {pendingMembers}명</p>
    </Card>
  );
}
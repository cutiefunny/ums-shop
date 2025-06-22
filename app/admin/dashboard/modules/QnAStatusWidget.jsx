// app/admin/dashboard/modules/QnAStatusWidget.jsx
import React from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function QnAStatusWidget() {
  const unansweredQnA = 3;

  return (
    <Card title="Q&A 미답변">
      <p>미답변 Q&A: {unansweredQnA}건</p>
    </Card>
  );
}
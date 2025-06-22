// app/admin/dashboard/modules/OrderSummaryWidgets.jsx
import React from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function OrderSummaryWidgets() {
  const orderData = {
    paymentCompleted: 12,
    shipping: 7,
    deliveryCompleted: 19,
  };

  return (
    <Card title="오더 단계별 수량">
      <p>결제완료: {orderData.paymentCompleted}건</p>
      <p>배송중: {orderData.shipping}건</p>
      <p>배송완료: {orderData.deliveryCompleted}건</p>
    </Card>
  );
}
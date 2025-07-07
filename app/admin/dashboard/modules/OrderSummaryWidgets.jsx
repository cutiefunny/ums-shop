// app/admin/dashboard/modules/OrderSummaryWidgets.jsx
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect } from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function OrderSummaryWidgets() {
  const [orderData, setOrderData] = useState({
    paymentCompleted: 0,
    shipping: 0,
    deliveryCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrderSummary() {
      try {
        setLoading(true);
        setError(null);
        // /api/orders 엔드포인트를 호출하여 모든 주문 데이터를 가져옵니다.
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const orders = await response.json();

        let paymentCompletedCount = 0;
        let shippingCount = 0;
        let deliveryCompletedCount = 0;

        orders.forEach(order => {
          const status = order.status?.toLowerCase();
          if (status === 'order' || status === 'paypal' || status === 'pay in cash') {
            paymentCompletedCount++;
          } else if (status === 'ems') { // EMS는 배송중으로 간주
            shippingCount++;
          } else if (status === 'delivered') {
            deliveryCompletedCount++;
          }
        });

        setOrderData({
          paymentCompleted: paymentCompletedCount,
          shipping: shippingCount,
          deliveryCompleted: deliveryCompletedCount,
        });

      } catch (err) {
        console.error("Error fetching order summary:", err);
        setError(`주문 요약을 불러오는 데 실패했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchOrderSummary();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  if (loading) {
    return (
      <Card title="오더 단계별 수량">
        <p>데이터를 불러오는 중...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="오더 단계별 수량">
        <p style={{ color: 'red' }}>오류: {error}</p>
      </Card>
    );
  }

  return (
    <Card title="오더 단계별 수량">
      <p>결제완료: {orderData.paymentCompleted}건</p>
      <p>배송중: {orderData.shipping}건</p>
      <p>배송완료: {orderData.deliveryCompleted}건</p>
    </Card>
  );
}
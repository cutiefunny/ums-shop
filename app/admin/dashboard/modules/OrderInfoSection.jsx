// app/admin/dashboard/modules/OrderInfoSection.jsx
'use client';

import React from 'react';
import moment from 'moment';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function OrderInfoSection({ selectedDate, selectedDateOrders, d7Orders, loadingOrders, errorOrders }) {
  // 배송일 정보를 포맷하는 헬퍼 함수
  const formatDeliveryDate = (shippingDetails) => {
    if (!shippingDetails) return 'N/A';

    const actual = shippingDetails.actualDelivery;
    const estimated = shippingDetails.estimatedDelivery;

    if (actual) {
      return `Actual: ${moment(actual).format('YYYY-MM-DD')}`;
    }
    if (estimated) {
      return `Estimated: ${moment(estimated).format('YYYY-MM-DD')}`;
    }
    return 'N/A';
  };

  // 오더 목록을 렌더링하는 헬퍼 컴포넌트
  const OrderList = ({ orders, title, isHighlighted = false }) => {
    // orders가 undefined일 경우를 대비하여 빈 배열로 대체
    const displayOrders = (orders || []).slice(0, 5); // 최대 5개 항목만 표시

    return (
      <Card title={title} style={isHighlighted ? { border: '2px solid red', flexGrow: 1 } : { flexGrow: 1 }}>
        {loadingOrders ? (
          <p>오더 정보를 불러오는 중...</p>
        ) : errorOrders ? (
          <p style={{ color: 'red' }}>오류: {errorOrders}</p>
        ) : (orders || []).length === 0 ? ( // orders가 null/undefined일 경우를 대비하여 다시 확인
          <p>해당 날짜에 오더가 없습니다.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {displayOrders.map(order => (
              <li key={order.orderId} style={{ marginBottom: '10px', paddingBottom: '5px', borderBottom: '1px dashed #eee' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>주문번호: {order.orderId}</p>
                <p style={{ margin: 0 }}>고객명: {order.userName}</p>
                <p style={{ margin: 0 }}>상태: {order.status}</p>
                <p style={{ margin: 0 }}>배송일: {formatDeliveryDate(order.shippingDetails)}</p>
              </li>
            ))}
            {orders.length > 5 && (
              <p style={{ margin: '10px 0 0', textAlign: 'center', fontSize: '0.9em', color: '#666' }}>
                [더보기] {orders.length - 5}개 항목 더 있음
              </p>
            )}
          </ul>
        )}
      </Card>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: '1 1 300px', minWidth: '300px' }}>
      {/* 상단 블록: 선택 날짜 오더 정보 */}
      <OrderList
        orders={selectedDateOrders}
        title={`${moment(selectedDate).format('YYYY-MM-DD')} 오더 정보`}
      />

      {/* 하단 블록: 오늘 기준 D-7 오더 */}
      <OrderList
        orders={d7Orders}
        title={`D-7 오더 (${moment().add(7, 'days').format('YYYY-MM-DD')})`}
        isHighlighted={true}
      />
    </div>
  );
}
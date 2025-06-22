// app/admin/dashboard/modules/UnpackagedProductsWidget.jsx
import React from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function UnpackagedProductsWidget() {
  const unpackagedItems = 21;

  return (
    <Card title="미포장 상품">
      <p>미포장 상품 수: {unpackagedItems}건</p>
    </Card>
  );
}
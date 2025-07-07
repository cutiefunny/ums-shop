// app/admin/dashboard/modules/UnpackagedProductsWidget.jsx
'use client'; // 클라이언트 컴포넌트임을 명시

import React, { useState, useEffect } from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function UnpackagedProductsWidget() {
  const [unpackagedItems, setUnpackagedItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUnpackagedItems() {
      try {
        setLoading(true);
        setError(null);
        // /api/admin/packing-status 엔드포인트를 호출하여 미포장 상품 데이터를 가져옵니다.
        // 이 API는 내부적으로 'order-items' 테이블에서 'packingStatus'가 false인 항목을 조회합니다.
        const response = await fetch('/api/admin/packing-status?packingStatusDashboard=false');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // API 응답은 이미 필터링된 미포장 상품 목록이므로, 그 길이를 미포장 상품 수로 설정합니다.
        console.log("Unpackaged items data:", data); // 디버깅용 로그
        setUnpackagedItems(data.length);

      } catch (err) {
        console.error("Error fetching unpackaged items:", err);
        setError(`미포장 상품 수를 불러오는 데 실패했습니다: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchUnpackagedItems();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  if (loading) {
    return (
      <Card title="미포장 상품">
        <p>데이터를 불러오는 중...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="미포장 상품">
        <p style={{ color: 'red' }}>오류: {error}</p>
      </Card>
    );
  }

  return (
    <Card title="미포장 상품">
      <p>미포장 상품 수: {unpackagedItems}건</p>
    </Card>
  );
}
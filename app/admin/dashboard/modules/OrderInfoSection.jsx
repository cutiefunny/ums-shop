// app/admin/dashboard/modules/OrderInfoSection.jsx
import React from 'react';
import Card from '../../components/Card'; // 공통 Card 컴포넌트 임포트

export default function OrderInfoSection() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      <Card title="오더 정보" style={{ flexGrow: 1 }}> {/* style prop을 통해 flexGrow 전달 */}
        <p>날짜를 선택하여 오더 상세 정보를 확인하세요.</p>
      </Card>
      <Card title="D-7 오더" style={{ flexGrow: 1 }}> {/* style prop을 통해 flexGrow 전달 */}
        <p>최근 7일 내의 중요 오더 정보가 표시됩니다.</p>
      </Card>
    </div>
  );
}
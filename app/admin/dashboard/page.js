// app/admin/dashboard/page.js
import OrderSummaryWidgets from './modules/OrderSummaryWidgets';
import MemberStatusWidget from './modules/MemberStatusWidget';
import QnAStatusWidget from './modules/QnAStatusWidget';
import UnpackagedProductsWidget from './modules/UnpackagedProductsWidget';
import OrderCalendar from './modules/OrderCalendar';
import OrderInfoSection from './modules/OrderInfoSection';

// Card 컴포넌트는 이제 개별 파일에서 임포트하므로 여기서 삭제합니다.
// import Card from '../../components/Card'; // 필요하다면 여기서 직접 임포트 가능

export default function DashboardPage() {
  return (
    <div style={{ padding: '20px' }}>

      {/* Top Row Widgets */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <OrderSummaryWidgets />
        <MemberStatusWidget />
        <QnAStatusWidget />
        <UnpackagedProductsWidget />
      </div>

      {/* Calendar and Order Info Section */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '2 1 600px', minWidth: '400px' }}> {/* 캘린더 영역 */}
          <OrderCalendar />
        </div>
        <div style={{ flex: '1 1 300px', minWidth: '300px' }}> {/* 오더 정보 영역 */}
          <OrderInfoSection />
        </div>
      </div>
    </div>
  );
}
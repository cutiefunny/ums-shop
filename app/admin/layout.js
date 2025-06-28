// app/admin/layout.js
'use client'; // 클라이언트 컴포넌트임을 명시

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // useRouter 임포트
import './admin-layout.css'; // 이 레이아웃을 위한 별도 CSS 파일

// Admin Modal Context 및 컴포넌트 임포트
import { AdminModalContextProvider, useAdminModal } from '@/contexts/AdminModalContext'; // 새로 생성한 AdminModalContext 임포트
import NotificationModal from '@/components/NotificationModal'; // 기존 NotificationModal 임포트
import ConfirmationModal from '@/components/ConfirmationModal'; // 기존 ConfirmationModal 임포트


// AdminLayout의 실제 내용을 담을 내부 컴포넌트 (Context 사용을 위해 분리)
function AdminLayoutContent({ children }) {
  const pathname = usePathname(); // 현재 경로를 가져와서 활성 링크 스타일링
  const router = useRouter(); // useRouter 훅 초기화
  const { modalState, showAdminNotificationModal, showAdminConfirmationModal, closeAdminModal } = useAdminModal(); // AdminModalContext에서 상태와 함수 가져오기

  const navItems = [
    { name: 'Dashboard', href: '/admin/dashboard' },
    { name: 'User Management', href: '/admin/user-management' },
    { name: 'Product Management', href: '/admin/product-management' },
    { name: 'Packing Status', href: '/admin/packing-status' },
    { name: 'Category Management', href: '/admin/category-management' },
    { name: 'Order Management', href: '/admin/order-management' },
    { name: 'Payment Tracking', href: '/admin/payment-tracking' },
    { name: 'Delivery Status', href: '/admin/delivery-status' },
    { name: 'Q&A', href: '/admin/q-a' },
    { name: 'Banner', href: '/admin/banner' },
    { name: 'History', href: '/admin/history' },
    { name: 'Manager', href: '/admin/manager' },
  ];

  const handleLogout = async () => { // 비동기 함수로 변경
    console.log('로그아웃 버튼 클릭됨');
    
    // 로그아웃 확인 모달 표시
    showAdminConfirmationModal(
      '정말로 로그아웃 하시겠습니까?',
      async () => { // onConfirm 콜백
        try {
          const response = await fetch('/api/admin/logout', { // /api/admin/logout API 호출
            method: 'POST',
          });

          if (response.ok) {
            console.log('로그아웃 성공!');
            showAdminNotificationModal('로그아웃 되었습니다.'); // NotificationModal로 변경
            router.push('/admin'); // 로그아웃 후 로그인 페이지로 리다이렉트
          } else {
            const errorData = await response.json();
            console.error('로그아웃 실패:', errorData.message);
            showAdminNotificationModal('로그아웃에 실패했습니다: ' + (errorData.message || '알 수 없는 오류')); // NotificationModal로 변경
          }
        } catch (error) {
          console.error('로그아웃 중 네트워크 오류:', error);
          showAdminNotificationModal('네트워크 오류로 로그아웃에 실패했습니다.'); // NotificationModal로 변경
        }
      },
      () => { // onCancel 콜백 (취소 시 아무것도 안 함)
        console.log('로그아웃 취소됨');
      }
    );
  };

  return (
    <div className="adminLayoutContainer">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebarContent">
          <div className="sidebarHeader">
            <h2 className="logo">LOGO</h2>
          </div>
          <nav>
            <ul>
              <li className="navItem">
                <Link
                  href={navItems[0].href}
                  className={`navLink ${pathname === navItems[0].href ? 'active' : ''} firstNavLink`}
                >
                  {navItems[0].name}
                </Link>
              </li>
              {navItems.slice(1).map((item) => (
                <li key={item.name} className="navItem">
                  <Link
                    href={item.href}
                    className={`navLink ${pathname === item.href ? 'active' : ''}`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              <li className="navItem">
                <div className="navDivider"></div>
              </li>
            </ul>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="logoutButtonWrapper">
          <button
            onClick={handleLogout}
            className="logoutButton"
          >
            log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="mainContentArea">
        <header className="mainHeader">
          {/* 여기에 로고나 사용자 정보 등을 추가할 수 있습니다. */}
        </header>

        <div className="contentWrapper">
          {children}
        </div>
      </main>

      {/* 전역 모달 렌더링 */}
      {modalState.type === 'notification' && (
        <NotificationModal
          isVisible={modalState.isOpen}
          message={modalState.message}
          onClose={closeAdminModal}
        />
      )}
      {modalState.type === 'confirmation' && (
        <ConfirmationModal
          isVisible={modalState.isOpen}
          message={modalState.message}
          onConfirm={() => { modalState.onConfirm && modalState.onConfirm(); closeAdminModal(); }}
          onCancel={() => { modalState.onCancel && modalState.onCancel(); closeAdminModal(); }}
          onClose={closeAdminModal} // 외부 클릭 또는 ESC 키 처리 (모달 컴포넌트 내부에서 구현되어야 함)
        />
      )}
    </div>
  );
}

// AdminModalContextProvider로 AdminLayoutContent를 감싸는 Root Layout
export default function AdminLayout({ children }) {
    return (
        <AdminModalContextProvider> {/* AdminModalContextProvider로 감싸기 */}
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminModalContextProvider>
    );
}

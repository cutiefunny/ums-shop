// app/admin/layout.js
'use client'; // 클라이언트 컴포넌트임을 명시

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react'; // useMemo 추가
import './admin-layout.css'; // 이 레이아웃을 위한 별도 CSS 파일

// Admin Modal Context 및 컴포넌트 임포트
import { AdminModalContextProvider, useAdminModal } from '@/contexts/AdminModalContext';
import NotificationModal from '@/components/NotificationModal';
import ConfirmationModal from '@/components/ConfirmationModal';

// AdminLayout의 실제 내용을 담을 내부 컴포넌트 (Context 사용을 위해 분리)
function AdminLayoutContent({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { modalState, showAdminNotificationModal, showAdminConfirmationModal, closeAdminModal } = useAdminModal();

  // 관리자 권한 상태
  const [adminPermissions, setAdminPermissions] = useState(null);
  const [loadingPermissions, setLoadingPermissions] = useState(true);

  // 관리자 권한을 불러오는 함수
  const fetchAdminPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await fetch('/api/admin/current-user-permissions');
      if (response.ok) {
        const data = await response.json();
        setAdminPermissions(data);
      } else {
        // 권한 정보를 가져오지 못하면 로그아웃 처리
        console.error('Failed to fetch admin permissions:', response.statusText);
        // router.push('/admin'); // 로그인 페이지로 리다이렉트
      }
    } catch (error) {
      console.error('Error fetching admin permissions:', error);
      // router.push('/admin'); // 네트워크 오류 시 로그인 페이지로 리다이렉트
    } finally {
      setLoadingPermissions(false);
    }
  };

  useEffect(() => {
    fetchAdminPermissions();
  }, []);

  // 네비게이션 아이템 정의 (모든 권한 포함)
  const allNavItems = [
    { name: 'Dashboard', href: '/admin/dashboard', permissionKey: null }, // 대시보드는 기본 접근 허용
    { name: 'User Management', href: '/admin/user-management', permissionKey: 'canManageUserApproval' },
    { name: 'Product Management', href: '/admin/product-management', permissionKey: 'canManageProduct' },
    { name: 'Packing Status', href: '/admin/packing-status', permissionKey: 'canManagePacking' },
    { name: 'Category Management', href: '/admin/category-management', permissionKey: 'canManageProduct' }, // 상품 관리 권한에 포함
    { name: 'Order Management', href: '/admin/order-management', permissionKey: 'canManageOrder' },
    { name: 'Payment Tracking', href: '/admin/payment-tracking', permissionKey: 'canManageOrder' }, // 오더 관리 권한에 포함
    { name: 'Delivery Status', href: '/admin/delivery-status', permissionKey: 'canManageOrder' }, // 오더 관리 권한에 포함
    { name: 'Q&A', href: '/admin/q-and-a', permissionKey: 'canManageQnA' },
    { name: 'Banner', href: '/admin/banner', permissionKey: 'canManageBanner' },
    { name: 'History', href: '/admin/history', permissionKey: 'canAccessHistory' }, // History는 이제 role 기반으로만 필터링되므로, permissionKey는 더 이상 사용되지 않음
    { name: 'Manager', href: '/admin/manager', permissionKey: 'canAccessManager' }, // Manager도 role 기반으로만 필터링되므로, permissionKey는 더 이상 사용되지 않음
  ];

  // 권한에 따라 필터링된 네비게이션 아이템
  const filteredNavItems = useMemo(() => {
    if (!adminPermissions) {
      return []; // 권한 정보가 아직 로드되지 않았으면 빈 배열 반환
    }

    return allNavItems.filter(item => {
      // 대시보드는 항상 표시
      if (item.permissionKey === null) {
        return true;
      }
      // History와 Manager 메뉴는 Super Admin일 때만 보여짐
      if (item.name === 'History' || item.name === 'Manager') {
        return adminPermissions.role === 'Super Admin';
      }
      // 그 외 메뉴는 해당 permissionKey가 true일 때만 표시
      return adminPermissions[item.permissionKey];
    });
  }, [adminPermissions]);


  const handleLogout = async () => {
    console.log('로그아웃 버튼 클릭됨');
    
    showAdminConfirmationModal(
      '정말로 로그아웃 하시겠습니까?',
      async () => {
        try {
          const response = await fetch('/api/admin/logout', {
            method: 'POST',
          });

          if (response.ok) {
            console.log('로그아웃 성공!');
            showAdminNotificationModal('로그아웃 되었습니다.');
            router.push('/admin');
          } else {
            const errorData = await response.json();
            console.error('로그아웃 실패:', errorData.message);
            showAdminNotificationModal('로그아웃에 실패했습니다: ' + (errorData.message || '알 수 없는 오류'));
          }
        } catch (error) {
          console.error('로그아웃 중 네트워크 오류:', error);
          showAdminNotificationModal('네트워크 오류로 로그아웃에 실패했습니다.');
        }
      },
      () => {
        console.log('로그아웃 취소됨');
      }
    );
  };

  if (loadingPermissions) {
    // 권한 로딩 중에는 로딩 스피너 등을 표시할 수 있습니다.
    return (
      <div className="adminLayoutContainer" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <p>권한 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="adminLayoutContainer">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebarContent">
          <div className="sidebarHeader">
            <Link href="/admin/dashboard">
              <img src="/images/admin-logo.png" className="adminLogo" />
            </Link>
          </div>
          <nav>
            <ul>
              {filteredNavItems.map((item) => (
                <li key={item.name} className="navItem">
                  <Link
                    href={item.href}
                    className={`navLink ${pathname.startsWith(item.href) ? 'active' : ''}`} // 현재 경로가 href로 시작하는지 확인
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
          isOpen={modalState.isOpen}
          title={modalState.title || '확인'}
          message={modalState.message}
          buttonText='확인'
          onConfirm={() => { modalState.onConfirm && modalState.onConfirm(); closeAdminModal(); }}
          onCancel={() => { modalState.onCancel && modalState.onCancel(); closeAdminModal(); }}
        />
      )}
    </div>
  );
}

// AdminModalContextProvider로 AdminLayoutContent를 감싸는 Root Layout
export default function AdminLayout({ children }) {
    return (
        <AdminModalContextProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminModalContextProvider>
    );
}

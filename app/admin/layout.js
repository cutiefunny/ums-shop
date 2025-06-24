// app/admin/layout.js
'use client'; // 클라이언트 컴포넌트임을 명시

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // useRouter 임포트
import './admin-layout.css'; // 이 레이아웃을 위한 별도 CSS 파일

export default function AdminLayout({ children }) {
  const pathname = usePathname(); // 현재 경로를 가져와서 활성 링크 스타일링
  const router = useRouter(); // useRouter 훅 초기화

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
    try {
      const response = await fetch('/api/admin/logout', { // /api/admin/logout API 호출
        method: 'POST',
      });

      if (response.ok) {
        console.log('로그아웃 성공!');
        alert('로그아웃 되었습니다.'); // 사용자에게 알림
        router.push('/admin'); // 로그아웃 후 로그인 페이지로 리다이렉트
      } else {
        const errorData = await response.json();
        console.error('로그아웃 실패:', errorData.message);
        alert('로그아웃에 실패했습니다: ' + (errorData.message || '알 수 없는 오류'));
      }
    } catch (error) {
      console.error('로그아웃 중 네트워크 오류:', error);
      alert('네트워크 오류로 로그아웃에 실패했습니다.');
    }
  };

  return (
    <div className="adminLayoutContainer">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* 이 div에 flexGrow를 추가하여 남은 공간을 채우도록 합니다. */}
        <div className="sidebarContent">
          <div className="sidebarHeader">
            <h2 className="logo">LOGO</h2>
          </div>
          <nav>
            <ul>
              {/* 첫 번째 항목을 위해 별도의 상단 경계선이 있는 Link */}
              <li className="navItem">
                <Link
                  href={navItems[0].href}
                  className={`navLink ${pathname === navItems[0].href ? 'active' : ''} firstNavLink`}
                >
                  {navItems[0].name}
                </Link>
              </li>
              {/* 나머지 항목들은 상단 경계선 없이 렌더링 */}
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
              {/* 경계선 추가 */}
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
    </div>
  );
}

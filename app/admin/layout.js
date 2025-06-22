// app/admin/layout.js
'use client'; // 클라이언트 컴포넌트임을 명시

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './admin-layout.css'; // 이 레이아웃을 위한 별도 CSS 파일

export default function AdminLayout({ children }) {
  const pathname = usePathname(); // 현재 경로를 가져와서 활성 링크 스타일링

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

  const handleLogout = () => {
    console.log('로그아웃 버튼 클릭됨');
    alert('로그아웃 되었습니다.');
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '200px',
        backgroundColor: '#e0e0e0', // 회색 배경
        color: 'black',
        padding: '0px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* 이 div에 flexGrow를 추가하여 남은 공간을 채우도록 합니다. */}
        <div style={{ flexGrow: 1 }}>
          <div style={{ paddingBottom: '30px', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', textAlign: 'center' }}>LOGO</h2>
          </div>
          <nav>
            <ul>
              {/* 첫 번째 항목을 위해 별도의 상단 경계선이 있는 Link */}
              <li style={{ marginBottom: '0px' }}>
                <Link
                  href={navItems[0].href}
                  style={{
                    display: 'block',
                    padding: '12px 15px',
                    borderRadius: '0px',
                    color: 'black',
                    backgroundColor: pathname === navItems[0].href ? 'pink' : '#e0e0e0',
                    textDecoration: 'none',
                    fontWeight: 'normal',
                    border: '1px solid #000', // 상단 경계선 추가
                    borderLeft: 'none',
                    borderBottom: 'none', // 아래쪽 경계선 제거
                    borderRight: 'none',
                    textAlign: 'center',
                  }}
                >
                  {navItems[0].name}
                </Link>
              </li>
              {/* 나머지 항목들은 상단 경계선 없이 렌더링 */}
              {navItems.slice(1).map((item) => (
                <li key={item.name} style={{ marginBottom: '0px' }}>
                  <Link
                    href={item.href}
                    style={{
                      display: 'block',
                      padding: '12px 15px',
                      borderRadius: '0px',
                      color: 'black',
                      backgroundColor: pathname === item.href ? 'pink' : '#e0e0e0',
                      textDecoration: 'none',
                      fontWeight: 'normal',
                      border: '1px solid #000',
                      borderLeft: 'none',
                      borderBottom: 'none',
                      borderRight: 'none',
                      textAlign: 'center',
                    }}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              {/* 경계선 추가 */}
              <li style={{ marginBottom: '0px' }}>
                <div
                  style={{
                    height: '1px',
                    backgroundColor: '#000',
                  }}
                ></div>
              </li>
            </ul>
          </nav>
        </div>

        {/* Logout Button */}
        <div style={{ paddingTop: '20px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px 15px',
              backgroundColor: '#ccc', // 이미지에 맞게 회색조
              color: 'black',
              border: '1px solid #aaa',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              marginTop: '20px', // 상단 메뉴와의 간격
            }}
          >
            log out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f0f2f5' }}>
        <header style={{ padding: '20px', backgroundColor: 'white', borderBottom: '1px solid #ddd', height: '60px', display: 'flex', alignItems: 'center' }}>
          {/* 여기에 로고나 사용자 정보 등을 추가할 수 있습니다. */}
        </header>

        <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
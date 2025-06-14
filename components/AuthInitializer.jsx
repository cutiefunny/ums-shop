'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function AuthInitializer({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // localStorage는 client-side에서만 접근 가능하므로 useEffect 안에서 사용합니다.
    const userSession = localStorage.getItem('ums-shop-user-session');

    if (userSession) {
      // 로그인 세션이 있고, 현재 페이지가 로그인 페이지라면 /home으로 리디렉션합니다.
      // 이렇게 하면 로그인한 사용자가 로그인 페이지에 접근하는 것을 막을 수 있습니다.
      if (pathname === '/') {
        router.replace('/home');
      }
    } else {
      // 로그인 세션이 없는데 보호된 페이지(/home 등)에 접근하려 한다면 로그인 페이지로 보냅니다.
      // (이 로직은 필요에 따라 추가할 수 있습니다.)
      // if (pathname !== '/' && pathname !== '/register' && pathname !== '/reset-password') {
      //   router.replace('/');
      // }
    }
  }, [pathname, router]);

  return <>{children}</>;
}
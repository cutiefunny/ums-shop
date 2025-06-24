// middleware.js
import { NextResponse } from 'next/server';
import { verifyToken } from '@/utils/jwt'; // JWT 검증 유틸리티
import { cookies } from 'next/headers'; // 서버 컴포넌트/미들웨어에서 쿠키 접근

export async function middleware(request) {
  const adminRoutes = ['/admin/dashboard', '/admin/user-management', '/admin/product-management']; // 보호할 관리자 경로들

  const { pathname } = request.nextUrl;

  // 관리자 로그인 페이지는 보호하지 않음
  if (pathname === '/admin' || pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
    return NextResponse.next();
  }

  // 관리자 경로에 접근하려 할 때만 인증 확인
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    const cookieStore = cookies();
    const token = (await cookieStore.get('admin_jwt'))?.value; // cookies().get()에 await 추가

    if (!token) {
      // 토큰이 없으면 로그인 페이지로 리다이렉트
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    // 토큰 검증 (이제 비동기 함수이므로 await 사용)
    const decodedToken = await verifyToken(token); 

    if (!decodedToken) {
      // 토큰이 유효하지 않으면 로그인 페이지로 리다이렉트
      const response = NextResponse.redirect(new URL('/admin', request.url));
      response.cookies.delete('admin_jwt'); // 만료된 토큰 쿠키 삭제
      return response;
    }

    // TODO: 필요하다면 decodedToken.role 등을 확인하여 더 세밀한 권한 부여
    // if (decodedToken.role !== 'admin') {
    //   return NextResponse.redirect(new URL('/unauthorized', request.url));
    // }

    // 인증 성공: 요청 계속 진행
    return NextResponse.next();
  }

  // 그 외의 경로는 통과
  return NextResponse.next();
}

// 미들웨어가 적용될 경로를 설정
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'], // /admin으로 시작하는 모든 경로와 /api/admin으로 시작하는 모든 API 경로
};

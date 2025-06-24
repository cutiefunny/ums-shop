// app/api/admin/logout/route.js
import { NextResponse } from 'next/server';
import { serialize } from 'cookie'; // 쿠키 직렬화

/**
 * POST 요청 처리: 관리자 로그아웃 (세션 쿠키 제거)
 * @returns {NextResponse} 로그아웃 성공 응답
 */
export async function POST() {
  try {
    // admin_jwt 쿠키를 즉시 만료시켜 제거합니다.
    const cookie = serialize('admin_jwt', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // 쿠키를 즉시 만료
      path: '/',
    });

    const response = NextResponse.json({ message: 'Logout successful' }, { status: 200 });
    response.headers.set('Set-Cookie', cookie); // 응답 헤더에 제거된 쿠키 설정
    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

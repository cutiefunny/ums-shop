// app/api/admin/check-auth/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // 서버 컴포넌트/미들웨어에서 쿠키 접근
import { verifyToken } from '@/utils/jwt'; // JWT 검증 유틸리티

/**
 * GET 요청 처리: admin_jwt 쿠키의 유효성을 확인합니다.
 * 이 API는 클라이언트 컴포넌트에서 HttpOnly 쿠키의 존재 여부 및 유효성을
 * 서버 사이드에서 안전하게 확인하는 데 사용됩니다.
 * @returns {NextResponse} 유효한 경우 200 OK, 유효하지 않은 경우 401 Unauthorized
 */
export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_jwt')?.value; // 'await' is not needed here when calling get() in a Server Component/Route Handler

    if (!token) {
      console.log("No admin_jwt token found.");
      return NextResponse.json({ message: 'Unauthorized: No token' }, { status: 401 });
    }

    // JWT 토큰 검증
    const decodedToken = await verifyToken(token);

    if (!decodedToken) {
      console.log("admin_jwt token is invalid or expired.");
      // 유효하지 않은 토큰인 경우 쿠키를 삭제하고 Unauthorized 응답
      const response = NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
      response.headers.set('Set-Cookie', `admin_jwt=; Path=/; Max-Age=0; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict`);
      return response;
    }

    console.log("admin_jwt token is valid.");
    return NextResponse.json({ message: 'Authorized' }, { status: 200 });
  } catch (error) {
    console.error('Error checking admin auth status:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

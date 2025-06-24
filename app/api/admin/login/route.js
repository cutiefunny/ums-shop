// app/api/admin/login/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { comparePassword } from '@/utils/auth'; // 비밀번호 비교 유틸리티
import { generateToken } from '@/utils/jwt'; // JWT 생성 유틸리티
import { serialize } from 'cookie'; // 쿠키 직렬화

// AWS SDK 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// 관리자 사용자 테이블 이름 (환경 변수에서 가져옴)
const ADMIN_USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_ADMIN_USERS || 'admin-users';

/**
 * POST 요청 처리: 관리자 로그인
 * @param {Request} request - 요청 객체 (username, password 포함)
 * @returns {NextResponse} 로그인 성공/실패 응답
 */
export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ message: 'Username and password are required' }, { status: 400 });
    }

    // 1. DynamoDB에서 사용자 조회
    const getCommand = new GetCommand({
      TableName: ADMIN_USERS_TABLE_NAME,
      Key: { username: username }, // 파티션 키: username
    });
    const { Item: adminUser } = await docClient.send(getCommand);

    if (!adminUser) {
      // 사용자 없음
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 2. 비밀번호 검증
    const isPasswordValid = await comparePassword(password, adminUser.passwordHash);

    if (!isPasswordValid) {
      // 비밀번호 불일치
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // 3. JWT 토큰 생성 (generateToken이 이제 비동기 함수이므로 await 사용)
    const tokenPayload = {
      userId: adminUser.username,
      role: adminUser.role || 'admin',
    };
    const token = await generateToken(tokenPayload, '1h'); // await 추가

    // 4. HTTP-only 쿠키에 토큰 설정
    const cookie = serialize('admin_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60, // 1시간 (JWT 만료 시간과 일치)
      path: '/',
    });

    // 5. 로그인 성공 응답
    const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

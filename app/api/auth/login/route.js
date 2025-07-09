// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'; // GetCommand 대신 QueryCommand 임포트
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

// 사용자 테이블 이름 (환경 변수에서 가져옴)
const USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_USERS || 'user-management';
const JWT_EXPIRATION = process.env.JWT_EXPIRATION || '24h'; // JWT 만료 시간 (기본값: 24시간)

/**
 * POST 요청 처리: 사용자 로그인
 * @param {Request} request - 요청 객체 (email, password 포함)
 * @returns {NextResponse} 로그인 성공/실패 응답
 */
export async function POST(request) {
  try {
    const { email, password, stayLoggedIn } = await request.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // 1. DynamoDB에서 사용자 조회 (email을 GSI 'email-index'를 통해 조회)
    // 'seq'가 파티션 키이고 'email'이 GSI의 파티션 키라고 가정합니다.
    const queryCommand = new QueryCommand({
      TableName: USERS_TABLE_NAME,
      IndexName: 'email-index', // 'email' 속성을 PK로 사용하는 GSI 이름
      KeyConditionExpression: 'email = :emailVal',
      ExpressionAttributeValues: {
        ':emailVal': email,
      },
      Limit: 1, // 이메일은 고유해야 하므로 1개만 조회
    });
    const { Items } = await docClient.send(queryCommand);
    const user = Items && Items.length > 0 ? Items[0] : null;

    if (!user) {
      // 사용자 없음 (GSI에서 조회가 안 된 경우)
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // 2. 비밀번호 검증
    let isPasswordValid = false;
    if (user.passwordHash) { // passwordHash 필드가 존재하는 경우에만 비밀번호 비교
      isPasswordValid = await comparePassword(password, user.passwordHash);
    } else {
      // passwordHash 필드가 없는 경우, 비밀번호 체크를 통과시킵니다.
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      // 비밀번호 불일치 (passwordHash가 있는데 틀렸거나, passwordHash가 없는데 password를 보냈을 때)
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // 3. 사용자 승인 상태 확인
    if (user.approvalStatus !== 'approve') {
        return NextResponse.json({ message: 'Your account is not approved yet. Please wait for approval.' }, { status: 403 });
    }

    // 4. JWT 토큰 생성
    const tokenPayload = {
      userId: user.email, // 사용자의 고유 식별자 (이메일)
      role: user.role || 'user', // 사용자 역할 (기본값 'user')
      seq: user.seq, // 사용자 seq도 페이로드에 포함
      name: user.name, // 사용자 이름도 페이로드에 포함
      shipName: user.shipName, // 선박명도 페이로드에 포함
    };

    // 'Stay logged in'이 체크된 경우 만료 시간을 길게 설정
    const expiresIn = stayLoggedIn ? '7d' : JWT_EXPIRATION; // 7일 또는 기본값

    const token = await generateToken(tokenPayload, expiresIn);

    // 5. HTTP-only 쿠키에 토큰 설정
    const cookieMaxAge = stayLoggedIn ? 7 * 24 * 60 * 60 : 60 * 60; // 7일 또는 1시간 (초 단위)
    const cookie = serialize('user_jwt', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 프로덕션 환경에서만 HTTPS
      sameSite: 'strict',
      maxAge: cookieMaxAge,
      path: '/',
    });

    // 6. 로그인 성공 응답
    const response = NextResponse.json({
        message: 'Login successful',
        user: {
            email: user.email,
            name: user.name,
            role: user.role,
            seq: user.seq,
            shipName: user.shipName,
        }
    }, { status: 200 });
    response.headers.set('Set-Cookie', cookie);
    return response;

  } catch (error) {
    console.error('User login error:', error);
    // GSI가 없거나 활성화되지 않은 경우 등의 오류 메시지를 포함
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        return NextResponse.json({ message: `Configuration Error: GSI 'email-index' on table '${USERS_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active.`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

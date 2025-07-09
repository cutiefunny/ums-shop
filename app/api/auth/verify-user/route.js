// app/api/auth/verify-user/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

/**
 * POST 요청 처리: 비밀번호 재설정 1단계 - 사용자 정보 검증
 * @param {Request} request - 요청 객체 (email, fullName, phoneNumber 포함)
 * @returns {NextResponse} 검증 성공/실패 응답
 */
export async function POST(request) {
  try {
    const { email, fullName, phoneNumber } = await request.json();

    if (!email || !fullName || !phoneNumber) {
      return NextResponse.json({ message: 'Email, Full Name, and Phone Number are required for verification.' }, { status: 400 });
    }

    // DynamoDB에서 사용자 조회 (email을 GSI 'email-index'를 통해 조회)
    // 'seq'가 파티션 키이고 'email'이 GSI의 파티션 키라고 가정합니다.
    const queryCommand = new QueryCommand({
      TableName: USERS_TABLE_NAME,
      IndexName: 'email-index', // 'email' 속성을 PK로 사용하는 GSI 이름 (필요시 DynamoDB에서 생성)
      KeyConditionExpression: 'email = :emailVal',
      ExpressionAttributeValues: {
        ':emailVal': email,
      },
      Limit: 1, // 이메일은 고유해야 하므로 1개만 조회
    });
    const { Items } = await docClient.send(queryCommand);
    const user = Items && Items.length > 0 ? Items[0] : null;

    if (!user) {
      return NextResponse.json({ message: 'User not found with provided credentials.' }, { status: 404 });
    }

    // 이름과 전화번호도 일치하는지 확인 (추가 보안)
    // DynamoDB 필드명이 `name`과 `phoneNumber`라고 가정
    if (user.name !== fullName || user.phoneNumber !== phoneNumber) {
      return NextResponse.json({ message: 'User not found with provided credentials.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User verified successfully.' }, { status: 200 });

  } catch (error) {
    console.error('User verification error:', error);
    // GSI가 없거나 활성화되지 않은 경우 등의 오류 메시지를 포함
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        return NextResponse.json({ message: `Configuration Error: GSI 'email-index' on table '${USERS_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active.`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

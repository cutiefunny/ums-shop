// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '@/utils/auth'; // 비밀번호 해싱 유틸리티

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
 * POST 요청 처리: 비밀번호 재설정 (사용자 인증 및 비밀번호 업데이트)
 * @param {Request} request - 요청 객체 (email, fullName, phoneNumber, newPassword 포함)
 * @returns {NextResponse} 비밀번호 재설정 성공/실패 응답
 */
export async function POST(request) {
  try {
    const { email, fullName, phoneNumber, newPassword } = await request.json();

    if (!email || !fullName || !phoneNumber || !newPassword) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 1. 이메일, 이름, 전화번호로 사용자 인증 (GSI를 통해 이메일 조회 후 필터링)
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
      return NextResponse.json({ message: 'User not found with provided credentials.' }, { status: 404 });
    }

    // 이름과 전화번호도 일치하는지 확인 (추가 보안)
    if (user.name !== fullName || user.phoneNumber !== phoneNumber) {
      return NextResponse.json({ message: 'User not found with provided credentials.' }, { status: 404 });
    }

    // 2. 새 비밀번호 해싱
    const hashedPassword = await hashPassword(newPassword);

    // 3. DynamoDB에서 비밀번호 업데이트
    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { seq: user.seq }, // 사용자의 실제 파티션 키 (seq) 사용
      UpdateExpression: 'SET passwordHash = :passwordHash, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':passwordHash': hashedPassword,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'UPDATED_NEW',
    });
    await docClient.send(updateCommand);

    return NextResponse.json({ message: 'Password reset successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Password reset error:', error);
    // GSI 관련 오류 처리
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        return NextResponse.json({ message: `Configuration Error: GSI 'email-index' on table '${USERS_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active.`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

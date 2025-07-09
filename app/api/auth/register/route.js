// app/api/auth/register/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '@/utils/auth'; // 비밀번호 해싱 유틸리티
import { v4 as uuidv4 } from 'uuid'; // UUID 생성 유틸리티

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
 * 헬퍼 함수: 이메일 중복 검사 (email-index GSI 사용 가정)
 */
async function isEmailDuplicate(email) {
    try {
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
        return Items && Items.length > 0;
    } catch (error) {
        console.error("Error checking email duplication:", error);
        // GSI가 없거나 활성화되지 않은 경우 등의 오류 메시지를 포함
        if (error.name === 'ValidationException' && error.message.includes('index')) {
            throw new Error(`Configuration Error: GSI 'email-index' on table '${USERS_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active. ${error.message}`);
        }
        throw error; // 다른 예측 못한 오류는 다시 던짐
    }
}

/**
 * POST 요청 처리: 사용자 등록
 * @param {Request} request - 요청 객체 (email, fullName, shipName, company, rank, phoneNumber, password 포함)
 * @returns {NextResponse} 등록 성공/실패 응답
 */
export async function POST(request) {
  try {
    const { email, fullName, shipName, company, rank, phoneNumber, password } = await request.json();

    // 필수 필드 유효성 검사
    if (!email || !fullName || !shipName || !rank || !phoneNumber || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 이메일 중복 확인
    const emailExists = await isEmailDuplicate(email);
    if (emailExists) {
      return NextResponse.json({ message: 'This email is already registered.' }, { status: 409 });
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password);

    // 새 사용자 항목 생성
    const newUser = {
      seq: Date.now(), // 간단한 고유 시퀀스 번호 (실제로는 더 견고한 방법 필요)
      email: email, // 이메일을 파티션 키로 사용할 경우 (GSI에 사용)
      name: fullName,
      shipName: shipName,
      company: company || null, // company는 선택 사항
      rank: rank,
      phoneNumber: phoneNumber,
      passwordHash: hashedPassword,
      approvalStatus: 'request', // 기본 승인 상태는 'request'
      registrationDate: new Date().toISOString(), // 등록일
      updatedAt: new Date().toISOString(), // 업데이트일
    };

    const putCommand = new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: newUser,
    });
    await docClient.send(putCommand);

    return NextResponse.json({ message: 'Registration successful. Waiting for approval.', user: newUser }, { status: 201 });

  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '@/utils/auth'; // 비밀번호 해싱 유틸리티
import sgMail from '@sendgrid/mail'; // SendGrid 라이브러리 import

// AWS SDK 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// SendGrid API 키 설정
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// 사용자 테이블 이름 (환경 변수에서 가져옴)
const USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_USERS || 'user-management';

/**
 * 헬퍼 함수: 이메일 중복 검사 (email-index GSI 사용 가정)
 */
async function isEmailDuplicate(email) {
  try {
    const queryCommand = new QueryCommand({
      TableName: USERS_TABLE_NAME,
      IndexName: 'email-index', // 'email' 속성을 PK로 사용하는 GSI 이름
      KeyConditionExpression: 'email = :emailVal',
      ExpressionAttributeValues: {
        ':emailVal': email,
      },
      Limit: 1,
    });
    const { Items } = await docClient.send(queryCommand);
    return Items && Items.length > 0;
  } catch (error) {
    console.error("Error checking email duplication:", error);
    if (error.name === 'ValidationException' && error.message.includes('index')) {
      throw new Error(`Configuration Error: GSI 'email-index' on table '${USERS_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active. ${error.message}`);
    }
    throw error;
  }
}

/**
 * POST 요청 처리: 사용자 등록 및 이메일 발송
 */
export async function POST(request) {
  try {
    const { email, fullName, shipName, company, rank, otherRank, phoneNumber, password } = await request.json();

    // 필수 필드 유효성 검사
    if (!email || !fullName || !shipName || !rank || !phoneNumber || !password) {
      return NextResponse.json({ message: 'Missing required fields.' }, { status: 400 });
    }

    // 'other' 직급 처리
    const finalRank = rank === 'other' ? otherRank : rank;
    if (rank === 'other' && !otherRank) {
      return NextResponse.json({ message: 'Other rank is required when "Other" is selected.' }, { status: 400 });
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
      seq: Date.now(),
      email: email,
      name: fullName,
      shipName: shipName,
      company: company || null,
      rank: finalRank, // 'other'를 포함한 최종 직급 저장
      phoneNumber: phoneNumber,
      passwordHash: hashedPassword,
      approvalStatus: 'request',
      registrationDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. 🗄️ DynamoDB에 사용자 정보 저장
    const putCommand = new PutCommand({
      TableName: USERS_TABLE_NAME,
      Item: newUser,
    });
    await docClient.send(putCommand);
    console.log('User data saved to DynamoDB successfully.');

    // 2. 🧩 관리자에게 보낼 이메일 구성
    const msg = {
      to: process.env.ADMIN_EMAIL,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject: `⚓️ 선박앱 신규 가입 요청 알림: ${fullName}`,
      text: `
        안녕하세요, 관리자님.

        선박앱에 새로운 회원가입 요청이 도착했습니다.
        아래 정보를 확인 후 관리자 페이지에서 승인 처리를 진행해주세요.

        ---
        - 사용자명: ${fullName}
        - 이메일: ${email}
        - 선박명: ${shipName}
        - 소속 회사: ${company || 'N/A'}
        - 직급: ${finalRank}
        - 연락처: ${phoneNumber}
        ---

        요청 상태: request
      `,
    };

    // 3. 📡 SendGrid를 통해 이메일 발송
    await sgMail.send(msg);
    console.log(`Admin notification email sent successfully to ${process.env.ADMIN_EMAIL}.`);

    return NextResponse.json({ message: 'Registration successful. Waiting for approval.', user: newUser }, { status: 201 });

  } catch (error) {
    console.error('User registration error:', error);
    // SendGrid 에러가 발생한 경우 추가 로깅
    if (error.response) {
      console.error('SendGrid Error Body:', error.response.body);
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
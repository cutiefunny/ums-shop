// app/api/users/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// 디버깅을 위해 환경 변수 값들을 콘솔에 출력
console.log("API Route Environment Variables:");
console.log("AWS_REGION:", process.env.AWS_REGION);
console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID ? "Loaded (not displayed for security)" : "NOT LOADED");
console.log("DYNAMODB_TABLE_USERS:", process.env.DYNAMODB_TABLE_USERS);


// AWS SDK 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_USERS || 'user-management';

/**
 * GET 요청 처리: 모든 사용자 데이터를 조회합니다.
 * @returns {NextResponse} 사용자 데이터 목록 또는 오류 응답
 */
export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: USERS_TABLE_NAME,
    });
    // ScanCommand가 사용하는 최종 테이블 이름을 확인하기 위한 로그
    console.log("ScanCommand TableName:", command.input.TableName);

    const { Items } = await docClient.send(command);
    return NextResponse.json(Items || [], { status: 200 });
  } catch (error) {
    console.error("Error fetching users from DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to fetch users', error: error.message }, { status: 500 });
  }
}

/**
 * PUT 요청 처리: 특정 사용자의 승인 상태를 업데이트합니다.
 * @param {Request} request - 요청 객체 (seq, newStatus 포함)
 * @returns {NextResponse} 업데이트 결과 또는 오류 응답
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { seq, newStatus } = body;

    // 필수 필드 유효성 검사
    if (seq === undefined || !newStatus) {
      return NextResponse.json({ message: 'Missing required fields: seq or newStatus' }, { status: 400 });
    }

    // DynamoDB 업데이트 명령
    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: { seq: seq }, // 'seq'가 파티션 키라고 가정합니다. 테이블 스키마에 따라 조정하세요.
      UpdateExpression: "SET approvalStatus = :status",
      ExpressionAttributeValues: {
        ":status": newStatus,
      },
      ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
    });

    const { Attributes } = await docClient.send(updateCommand);
    return NextResponse.json({ message: 'User approval status updated successfully', user: Attributes }, { status: 200 });
  } catch (error) {
    console.error("Error updating user approval status in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to update user approval status', error: error.message }, { status: 500 });
  }
}

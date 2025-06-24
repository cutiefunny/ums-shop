// app/api/users/[seq]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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
 * GET 요청 처리: 특정 사용자 데이터를 조회합니다.
 * URL: /api/users/[seq]
 * @param {Request} request - 요청 객체
 * @param {{params: {seq: string}}} context - Next.js dynamic route parameters
 * @returns {NextResponse} 사용자 데이터 또는 오류 응답
 */
export async function GET(request, context) {
  try {
    const { seq } = context.params;

    if (!seq) {
      return NextResponse.json({ message: 'Missing user sequence ID' }, { status: 400 });
    }

    const command = new GetCommand({
      TableName: USERS_TABLE_NAME,
      Key: {
        seq: Number(seq), // DynamoDB의 'seq'가 Number 타입이라고 가정
      },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(Item, { status: 200 });
  } catch (error) {
    console.error(`Error fetching user ${context.params.seq} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to fetch user', error: error.message }, { status: 500 });
  }
}

/**
 * PUT 요청 처리: 특정 사용자 데이터를 업데이트합니다.
 * URL: /api/users/[seq]
 * @param {Request} request - 요청 객체 (업데이트할 사용자 데이터 포함)
 * @param {{params: {seq: string}}} context - Next.js dynamic route parameters
 * @returns {NextResponse} 업데이트된 사용자 데이터 또는 오류 응답
 */
export async function PUT(request, context) {
  try {
    const { seq } = context.params;
    const body = await request.json(); // 업데이트할 데이터

    if (!seq) {
      return NextResponse.json({ message: 'Missing user sequence ID' }, { status: 400 });
    }

    // DynamoDB UpdateExpression을 동적으로 생성
    let UpdateExpression = 'SET';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    let first = true;

    for (const key in body) {
      if (key === 'seq') continue; // seq는 키이므로 업데이트 대상에서 제외

      if (!first) {
        UpdateExpression += ',';
      }
      UpdateExpression += ` #${key} = :${key}`;
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = body[key];
      first = false;
    }

    if (Object.keys(body).length === 0 || (Object.keys(body).length === 1 && body.hasOwnProperty('seq'))) {
      return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    const updateCommand = new UpdateCommand({
      TableName: USERS_TABLE_NAME,
      Key: {
        seq: Number(seq), // DynamoDB의 'seq'가 Number 타입이라고 가정
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
    });

    const { Attributes } = await docClient.send(updateCommand);
    return NextResponse.json({ message: 'User updated successfully', user: Attributes }, { status: 200 });
  } catch (error) {
    console.error(`Error updating user ${context.params.seq} in DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to update user', error: error.message }, { status: 500 });
  }
}

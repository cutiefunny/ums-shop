// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'; // QueryCommand 추가

// AWS SDK 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.AWS_REGION, // .env.local에 설정된 AWS_REGION 사용
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // .env.local에 설정된 AWS_ACCESS_KEY_ID 사용
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // .env.local에 설정된 AWS_SECRET_ACCESS_KEY 사용
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const ORDER_MANAGEMENT_TABLE_NAME = process.env.DYNAMODB_TABLE_ORDERS || 'order-management';

/**
 * GET 요청 처리: 모든 주문 데이터를 조회하거나, userEmail로 필터링하여 조회합니다.
 * URL: /api/orders
 * @param {Request} request - 요청 객체 (userEmail 쿼리 파라미터 포함 가능)
 * @returns {NextResponse} 주문 데이터 목록 또는 오류 응답
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail'); // userEmail 쿼리 파라미터 가져오기

    let command;
    if (userEmail) {
      // userEmail이 제공되면 GSI 'userEmail-index'를 사용하여 조회 (가정)
      // 이 GSI는 userEmail을 파티션 키로 가지고 있어야 합니다.
      command = new QueryCommand({
        TableName: ORDER_MANAGEMENT_TABLE_NAME,
        IndexName: 'userEmail-index', // 'userEmail'을 PK로 하는 GSI 이름 (필요시 DynamoDB에서 생성)
        KeyConditionExpression: 'userEmail = :userEmailVal',
        ExpressionAttributeValues: {
          ':userEmailVal': userEmail,
        },
      });
    } else {
      // userEmail이 없으면 전체 스캔 (기존 동작)
      command = new ScanCommand({
        TableName: ORDER_MANAGEMENT_TABLE_NAME,
      });
    }

    const { Items } = await docClient.send(command);
    return NextResponse.json(Items || [], { status: 200 });
  } catch (error) {
    console.error("Error fetching orders from DynamoDB:", error);
    // GSI가 없거나 활성화되지 않은 경우 등의 오류 메시지를 포함
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        return NextResponse.json({ message: `Configuration Error: GSI 'userEmail-index' on table '${ORDER_MANAGEMENT_TABLE_NAME}' not found or not active. Please ensure the GSI exists and is active.`, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Failed to fetch orders', error: error.message }, { status: 500 });
  }
}

// TODO: 주문 상태 업데이트 (PUT) 및 삭제 (DELETE)를 위한 API Route는
// app/api/orders/[orderId]/route.js 파일에 구현하는 것이 Next.js의 동적 라우팅 패턴에 더 적합합니다.
// (만약 아직 구현되지 않았다면 추가적인 작업이 필요합니다.)
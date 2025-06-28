// app/api/orders/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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
 * GET 요청 처리: 모든 주문 데이터를 조회합니다.
 * URL: /api/orders
 * @returns {NextResponse} 주문 데이터 목록 또는 오류 응답
 */
export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
    });
    const { Items } = await docClient.send(command);
    return NextResponse.json(Items || [], { status: 200 });
  } catch (error) {
    console.error("Error fetching orders from DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to fetch orders', error: error.message }, { status: 500 });
  }
}

// TODO: 주문 상태 업데이트 (PUT) 및 삭제 (DELETE)를 위한 API Route는
// app/api/orders/[orderId]/route.js 파일에 구현하는 것이 Next.js의 동적 라우팅 패턴에 더 적합합니다.
// (만약 아직 구현되지 않았다면 추가적인 작업이 필요합니다.)

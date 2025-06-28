// app/api/orders/[orderId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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
 * GET 요청 처리: 특정 주문 상세 데이터를 조회합니다.
 * URL: /api/orders/[orderId]
 * @param {Request} request - 요청 객체
 * @param {{params: {orderId: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 주문 상세 데이터 또는 오류 응답
 */
export async function GET(request, context) { // context 파라미터 사용
  try {
    // context.params를 await하여 orderId에 접근 (오류 메시지에 따른 수정)
    const { orderId } = await context.params; 

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order ID' }, { status: 400 });
    }

    const command = new GetCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Key: {
        orderId: orderId, // orderId가 String 타입의 파티션 키라고 가정
      },
    });

    const { Item } = await docClient.send(command);

    if (!Item) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(Item, { status: 200 });
  } catch (error) {
    console.error(`Error fetching order ${context.params.orderId} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to fetch order details', error: error.message }, { status: 500 });
  }
}

/**
 * PUT 요청 처리: 특정 주문 데이터를 업데이트합니다.
 * URL: /api/orders/[orderId]
 * @param {Request} request - 요청 객체 (업데이트할 주문 데이터 포함)
 * @param {{ params: { orderId: string } }} context - Next.js 동적 라우트 파라미터 (params를 직접 구조 분해)
 * @returns {NextResponse} 업데이트된 주문 데이터 또는 오류 응답
 */
export async function PUT(request, { params }) { // context.params 대신 { params }로 직접 구조 분해
  try {
    const { orderId } = params; // 이제 params는 직접 사용 가능
    const body = await request.json(); // 업데이트할 데이터

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order ID' }, { status: 400 });
    }

    // DynamoDB UpdateExpression을 동적으로 생성
    let UpdateExpression = 'SET';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    let first = true;

    for (const key in body) {
      // orderId는 키이므로 업데이트 대상에서 제외
      if (key === 'orderId') continue; 

      if (!first) {
        UpdateExpression += ',';
      }
      
      // 'status', 'messages', 'orderItems', 'note' 등 복합 타입 또는 예약어일 수 있는 속성 처리
      // 이 로직은 DynamoDB 스키마와 데이터 구조에 따라 더 정교하게 구성되어야 합니다.
      // 여기서는 간단화를 위해 #key를 사용하고, 필요시 예약어 매핑을 합니다.
      let attributeName = `#${key}`;
      ExpressionAttributeNames[attributeName] = key;
      ExpressionAttributeValues[`:${key}`] = body[key];
      
      UpdateExpression += ` ${attributeName} = :${key}`;
      first = false;
    }

    if (Object.keys(body).length === 0) {
      return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    const updateCommand = new UpdateCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Key: {
        orderId: orderId, // orderId가 String 타입의 파티션 키라고 가정
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
    });

    const { Attributes } = await docClient.send(updateCommand);
    return NextResponse.json({ message: 'Order updated successfully', order: Attributes }, { status: 200 });
  } catch (error) {
    console.error(`Error updating order ${params.orderId} in DynamoDB:`, error); // context.params 대신 params 사용
    return NextResponse.json({ message: 'Failed to update order', error: error.message }, { status: 500 });
  }
}

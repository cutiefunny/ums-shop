// app/api/orders/create/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid'; // 고유 ID 생성을 위해 uuidv4 사용

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
const ORDER_MANAGEMENT_TABLE_NAME = process.env.DYNAMODB_TABLE_ORDERS || 'order-management';

/**
 * POST 요청 처리: 새 주문 생성
 * @param {Request} request - 요청 객체 (주문 상세 정보 포함)
 * @returns {NextResponse} 생성된 주문 데이터 또는 오류 응답
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      userEmail,
      userName,
      customer,
      shipInfo,
      shippingDetails,
      totalAmount,
      subtotal,
      shippingFee,
      tax,
      orderItems,
      deliveryDetails,
      userMessage,
      messages, // 이 부분 추가
      status,
      date,
      statusHistory,
    } = body;

    // 필수 필드 유효성 검사 (프론트엔드에서 1개 이상 상품 선택은 이미 검증됨)
    if (!userEmail || !userName || !totalAmount || !orderItems || orderItems.length === 0 || !deliveryDetails || !status || !date) {
      return NextResponse.json({ message: 'Missing required order fields.' }, { status: 400 });
    }

    const newOrderId = `ORD-${uuidv4().substring(0, 8).toUpperCase()}`; // 고유한 주문 ID 생성

    const newOrder = {
      orderId: newOrderId,
        userEmail: userEmail,
        userName: userName,
      customer : customer,
      shipInfo: shipInfo,
      shippingDetails: shippingDetails,
      totalAmount: parseFloat(totalAmount),
      subtotal: parseFloat(subtotal),
      shippingFee: parseFloat(shippingFee),
      tax: parseFloat(tax),
      orderItems: orderItems, // 주문 상품 목록 (객체 배열)
      deliveryDetails: deliveryDetails, // 배송 상세 (객체)
      userMessage: userMessage || null, // 사용자 메시지 (선택 사항)
      messages: messages || [], // 이 부분 추가: 메시지 목록 저장
      status: status,
      date: date, // ISO String
      statusHistory: statusHistory || [], // 상태 변경 이력
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Item: newOrder,
    });
    await docClient.send(command);

    return NextResponse.json({ message: 'Order created successfully', order: newOrder }, { status: 201 });

  } catch (error) {
    console.error('Error creating order in DynamoDB:', error);
    return NextResponse.json({ message: 'Failed to create order', error: error.message }, { status: 500 });
  }
}
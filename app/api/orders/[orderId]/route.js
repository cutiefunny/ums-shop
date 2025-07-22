// app/api/orders/[orderId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { firebaseAdmin } from '@/utils/firebaseAdmin';

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
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history';
const USER_TABLE_NAME = process.env.DYNAMODB_TABLE_USERS || 'user-management';

/**
 * GET 요청 처리: 특정 주문 상세 데이터를 조회합니다.
 * URL: /api/orders/[orderId]
 * @param {Request} request - 요청 객체
 * @param {{params: {orderId: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 주문 상세 데이터 또는 오류 응답
 */
export async function GET(request, context) {
  try {
    const { orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order ID' }, { status: 400 });
    }

    const command = new GetCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Key: {
        orderId: orderId,
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
 * @param {{ params: { orderId: string } }} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 업데이트된 주문 데이터 또는 오류 응답
 */
export async function PUT(request, { params }) {
    const { orderId } = await params;
  try {
    const body = await request.json();
    const { messages, userId, ...otherUpdates } = body;
    console.log(`Backend - User ID for update: ${userId}`); // userId 로그

    if (!orderId) {
      return NextResponse.json({ message: 'Missing order ID' }, { status: 400 });
    }

    // 1. 기존 주문 정보 가져오기: 주문 소유자의 seq 및 기존 메시지 목록을 얻기 위함
    const getExistingOrderCommand = new GetCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Key: { orderId: orderId },
      // userId를 ProjectionExpression에 추가
      ProjectionExpression: 'userId, userEmail, customer, messages',
    });
    const { Item: existingOrder } = await docClient.send(getExistingOrderCommand);
    const existingMessages = existingOrder?.messages || [];

    if (!existingOrder) {
      console.warn(`Backend - Order ${orderId} not found. Cannot determine recipient or compare messages for push notification.`);
    }

    // DynamoDB UpdateExpression을 동적으로 생성
    let UpdateExpression = 'SET';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    let first = true;

    for (const key in body) {
      if (key === 'orderId') continue;

      if (!first) {
        UpdateExpression += ',';
      }
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
        orderId: orderId,
      },
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const { Attributes } = await docClient.send(updateCommand);

    // =========================================================
    // FCM 푸시 알림 전송 로직 시작 (관리자 메시지에만, 메시지 변경 시)
    // =========================================================
    // 새 메시지가 추가되었고, firebaseAdmin이 초기화되어 있으며, 기존 주문 정보가 있을 경우
    if (messages && messages.length > existingMessages.length && firebaseAdmin && existingOrder) {
      const lastMessage = messages[messages.length - 1]; // 새로 추가된 마지막 메시지를 가져옴
      console.log(`Backend - Last message sender for order ${orderId}: ${lastMessage.sender}`); // 메시지 보낸 사람 로그

      if (lastMessage.sender === 'Admin') { // 마지막 메시지를 보낸 사람이 'Admin'일 경우에만 푸시 알림 발송
        // 주문 소유자(고객)의 userId 가져오기
        // const userId = existingOrder.userId; // <-- userId 사용

        if (userId) {
          // 2. DynamoDB에서 해당 userId의 FCM 토큰 조회 (사용자 테이블)
          // USER_TABLE_NAME의 Primary Key는 'id'이므로 GetCommand로 조회 가능
          const getUserCommand = new GetCommand({
            TableName: USER_TABLE_NAME,
            Key: { seq: userId }, // <-- id를 키로 사용하여 사용자 정보 조회
            ProjectionExpression: 'fcmToken', // fcmToken만 가져옴
          });

          const { Item: userItem } = await docClient.send(getUserCommand);
          const fcmToken = userItem?.fcmToken;

          console.log(`Backend - Fetched FCM token for customer Seq ${userId}: ${fcmToken}`); // 가져온 FCM 토큰 로그

          if (fcmToken) {
            const notificationBody = lastMessage.text || '새로운 메시지가 도착했습니다.'; // 관리자가 보낸 메시지 내용으로 알림 본문 설정
            const fcmMessage = {
              notification: {
                title: '관리자 메시지 도착', // 관리자 메시지임을 나타내는 제목
                body: notificationBody,
              },
              data: {
                orderId: orderId,
                type: 'admin_message',
                click_action: `/orders/detail/${orderId}`, // 알림 클릭 시 주문 상세 페이지로 이동
              },
              token: fcmToken,
            };

            console.log('Backend - Sending FCM message to user:', fcmMessage); // 전송할 FCM 메시지 객체 로그

            try {
              const response = await firebaseAdmin.messaging().send(fcmMessage);
              console.log('Backend - Successfully sent FCM message:', response);
            } catch (error) {
              console.error('Backend - Error sending FCM message to user:', error);
            }
          } else {
            console.warn(`Backend - No FCM token found for customer Seq: ${userId}. Push notification not sent.`);
          }
        } else {
          console.warn(`Backend - Customer Seq not found in order ${orderId}. Cannot send push notification.`);
        }
      } else {
        console.log('Backend - Message is from user, skipping push notification to user.');
      }
    } else {
      console.log('Backend - Conditions not met for sending push notification.');
      // 상세 조건 로깅 (디버깅용)
      console.log(`Backend - has new message: ${messages && messages.length > existingMessages.length}`);
      console.log(`Backend - firebaseAdmin initialized: ${!!firebaseAdmin}`);
      console.log(`Backend - existingOrder found: ${!!existingOrder}`);
    }
    // =========================================================
    // FCM 푸시 알림 전송 로직 끝
    // =========================================================

    return NextResponse.json({ message: 'Order updated successfully', order: Attributes }, { status: 200 });
  } catch (error) {
    console.error(`Backend - Error updating order ${orderId} in DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to update order', error: error.message }, { status: 500 });
  }
}

/**
 * DELETE 요청 처리: 특정 주문 데이터를 삭제합니다.
 * URL: /api/orders/[orderId]
 * @param {Request} request
 * @param {{params: {orderId: string}}} context
 * @returns {NextResponse} 삭제 결과 또는 오류 응답
 */
export async function DELETE(request, { params }) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({ message: 'Missing order ID' }, { status: 400 });
    }

    // 삭제될 주문 정보를 미리 가져옴 (로그 기록용)
    const getCommand = new GetCommand({
        TableName: ORDER_MANAGEMENT_TABLE_NAME,
        Key: { orderId: orderId },
    });
    const { Item: deletedOrder } = await docClient.send(getCommand);


    const command = new DeleteCommand({
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Key: {
        orderId: orderId, // 'orderId'가 파티션 키라고 가정
      },
    });
    await docClient.send(command);

    // History 테이블에 기록
    const historyItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Order Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "주문 삭제",
        details: `주문 '${deletedOrder?.orderId || orderId}' (고객: ${deletedOrder?.userName || 'N/A'})이(가) 삭제되었습니다.`,
    };
    const putHistoryCommand = new PutCommand({
        TableName: HISTORY_TABLE_TABLE_NAME, // HISTORY_TABLE_NAME 변수 사용
        Item: historyItem,
    });
    await docClient.send(putHistoryCommand);


    return NextResponse.json({ message: 'Order deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting order ${params.orderId} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to delete order', error: error.message }, { status: 500 });
  }
}
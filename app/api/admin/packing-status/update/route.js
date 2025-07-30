// app/api/admin/packing-status/update/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'; // GetCommand 추가
import { v4 as uuidv4 } from 'uuid';

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수)
// order-items 테이블 대신 order-management 테이블을 사용하도록 변경
const TABLE_ORDER_MANAGEMENT = process.env.DYNAMODB_TABLE_ORDERS || 'order-management';
const TABLE_PACKING_HISTORY = process.env.DYNAMODB_TABLE_PACKING_HISTORY || 'packing-history';
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history'; // History 테이블 이름 추가


/**
 * PATCH handler for /api/admin/packing-status/update
 * 특정 주문 상품의 포장 상태를 업데이트하고 히스토리를 기록합니다.
 * Frontend는 orderId, productId, packingStatus (boolean)를 보냅니다.
 *
 * @param {Request} request
 */
export async function PATCH(request) {
  const { orderId, productId, packingStatus } = await request.json(); // packingStatus는 boolean
  console.log('Received data for packing status update:', { orderId, productId, packingStatus });

  if (!orderId || !productId || packingStatus === undefined) {
    return NextResponse.json({ message: 'orderId, productId, and packingStatus are required.' }, { status: 400 });
  }

  try {
    // 1. order-management 테이블에서 기존 주문 정보를 가져옵니다.
    // orderItems 배열과 shipInfo (선박명 기록용)를 포함합니다.
    const getCommand = new GetCommand({
      TableName: TABLE_ORDER_MANAGEMENT,
      Key: { orderId: orderId },
      ProjectionExpression: 'orderItems, shipInfo, customer', // 필요한 필드만 가져옴
    });
    const { Item: existingOrder } = await docClient.send(getCommand);

    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    // 2. orderItems 배열 내에서 해당 productId를 가진 항목의 packingStatus를 업데이트합니다.
    let updatedOrderItem = null; // 변경된 특정 orderItem을 저장할 변수
    const newOrderItems = existingOrder.orderItems.map(item => {
      if (item.productId === productId) {
        // packingStatus가 실제로 변경되었는지 확인하여 불필요한 업데이트 방지
        if (item.packingStatus !== packingStatus) {
          updatedOrderItem = { ...item, packingStatus: packingStatus };
          return updatedOrderItem;
        }
      }
      return item;
    });

    // packingStatus가 실제로 변경되지 않았거나 해당 productId를 찾지 못한 경우
    if (!updatedOrderItem) {
      console.log(`Packing status for orderId ${orderId}, productId ${productId} is already ${packingStatus} or product not found.`);
      return NextResponse.json({ message: 'Packing status is already the same or product not found in order.', updatedItem: null }, { status: 200 });
    }

    // 3. order-management 테이블의 orderItems 필드를 업데이트합니다.
    const updateCommand = new UpdateCommand({
      TableName: TABLE_ORDER_MANAGEMENT,
      Key: {
        orderId: orderId,
      },
      UpdateExpression: 'SET #oi = :newOrderItems, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#oi': 'orderItems',
        '#updatedAt': 'updatedAt', // updatedAt 필드 추가
      },
      ExpressionAttributeValues: {
        ':newOrderItems': newOrderItems,
        ':updatedAt': new Date().toISOString(), // 현재 시간으로 업데이트
      },
      ReturnValues: 'ALL_NEW', // 업데이트된 항목의 모든 속성 반환
    });
    const { Attributes: updatedOrder } = await docClient.send(updateCommand);
    console.log('Order management table updated:', updatedOrder);

    // 4. packing_history 테이블에 히스토리 기록 (선택 사항)
    if (TABLE_PACKING_HISTORY) {
        const historyItem = {
            packingHistoryId: uuidv4(), // 고유 히스토리 ID
            orderId: orderId,
            productId: productId,
            productName: updatedOrderItem.name || 'Unknown Product', // 업데이트된 아이템에서 상품명 가져오기
            shipName: existingOrder.shipInfo?.shipName || 'Unknown Ship', // 기존 주문에서 선박명 가져오기
            previousStatus: !packingStatus, // 이전 상태 (현재 상태의 반대)
            newStatus: packingStatus,
            timestamp: new Date().toISOString(),
            changedBy: 'AdminUser', // TODO: 실제 사용자 ID/정보로 대체
        };

        const putPackingHistoryCommand = new PutCommand({
            TableName: TABLE_PACKING_HISTORY,
            Item: historyItem,
        });
        await docClient.send(putPackingHistoryCommand);
        console.log('Packing status history recorded:', historyItem);
    }

    // 5. History 테이블에 기록 (새롭게 추가)
    // 이 부분은 기존 코드와 동일하게 유지됩니다.
    const historyEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Packing Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "포장 상태 변경",
        details: `주문 ${orderId}의 상품 '${updatedOrderItem.name || '알 수 없음'}' 포장 상태가 '${packingStatus ? '완료' : '미완료'}'로 변경되었습니다.`,
    };
    const putHistoryEntryCommand = new PutCommand({
        TableName: HISTORY_TABLE_NAME,
        Item: historyEntry,
    });
    await docClient.send(putHistoryEntryCommand);
    console.log('General history recorded:', historyEntry);

    return NextResponse.json({ message: 'Packing status updated and history recorded successfully.', updatedItem: updatedOrderItem }, { status: 200 });
  } catch (error) {
    console.error("Error updating packing status or recording history in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to update packing status', error: error.message }, { status: 500 });
  }
}
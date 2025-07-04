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
const TABLE_ORDER_ITEMS = process.env.DYNAMODB_TABLE_ORDER_ITEMS || 'order-items';
const TABLE_PACKING_HISTORY = process.env.DYNAMODB_TABLE_PACKING_HISTORY || 'packing-history';
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history'; // History 테이블 이름 추가


/**
 * PATCH handler for /api/admin/packing-status/update
 * 특정 주문 상품의 포장 상태를 업데이트하고 히스토리를 기록합니다.
 * Frontend는 orderId, productId, packingStatus (문자열 "true" 또는 "false")를 보냅니다.
 *
 * @param {Request} request
 */
export async function PATCH(request) {
  const { orderId, productId, packingStatus } = await request.json(); // packingStatus는 boolean
  console.log('Received data:', { orderId, productId, packingStatus });

  if (!orderId || !productId || packingStatus === undefined) {
    return NextResponse.json({ message: 'orderId, productId, and packingStatus are required.' }, { status: 400 });
  }

  // packingStatus는 문자열 ("true" 또는 "false") 그대로 사용합니다.
  const newPackingStatusString = packingStatus === true ? 'true' : 'false'; // 문자열로 변환

  // order-items 테이블의 Primary Key (PK)는 orderItemId라고 가정합니다.
  // 프론트엔드의 item.product_id가 orderItemId 역할을 한다고 가정합니다.
  const orderItemId = orderId + '-' + productId;

  try {
    // 1. order_items 테이블에서 packingStatus 업데이트
    const updateCommand = new UpdateCommand({
      TableName: TABLE_ORDER_ITEMS,
      Key: {
        orderItemId: orderItemId, 
      },
      UpdateExpression: 'SET #ps = :newStatus, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#ps': 'packingStatus', // 'packingStatus' 필드 이름
      },
      ExpressionAttributeValues: {
        ':newStatus': newPackingStatusString, // 문자열 값 그대로 사용
        ':updatedAt': new Date().toISOString(), 
      },
      ReturnValues: 'ALL_NEW', 
    });
    const { Attributes: updatedItem } = await docClient.send(updateCommand);

    // 2. packing_history 테이블에 히스토리 기록 (선택 사항)
    if (TABLE_PACKING_HISTORY) { 
        const historyItem = {
            packingHistoryId: uuidv4(), 
            orderItemId: orderItemId,
            orderId: orderId,
            productId: updatedItem?.productId || productId, 
            productName: updatedItem?.productName || 'Unknown Product', 
            shipName: updatedItem?.shipName || 'Unknown Ship', 
            // 이전/새 상태도 문자열로 기록하거나, 필요시 백엔드에서 다시 boolean으로 변환 후 기록
            previousStatus: (packingStatus === true ? 'false' : 'true'), // 문자열로 이전 상태 기록
            newStatus: newPackingStatusString, // 문자열 값 그대로 사용
            timestamp: new Date().toISOString(),
            changedBy: 'AdminUser', 
        };

        const putHistoryCommand = new PutCommand({
            TableName: TABLE_PACKING_HISTORY,
            Item: historyItem,
        });
        await docClient.send(putHistoryCommand);
        console.log('Packing status history recorded:', historyItem);
    }

    // 3. History 테이블에 기록 (새롭게 추가)
    const historyEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Packing Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "포장 상태 변경",
        details: `주문 ${orderId}의 상품 '${updatedItem?.productName || '알 수 없음'}' 포장 상태가 '${newPackingStatusString === 'true' ? '완료' : '미완료'}'로 변경되었습니다.`,
    };
    const putHistoryEntryCommand = new PutCommand({
        TableName: HISTORY_TABLE_NAME,
        Item: historyEntry,
    });
    await docClient.send(putHistoryEntryCommand);


    return NextResponse.json({ message: 'Packing status updated and history recorded successfully.', updatedItem }, { status: 200 });
  } catch (error) {
    console.error("Error updating packing status or recording history in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to update packing status', error: error.message }, { status: 500 });
  }
}
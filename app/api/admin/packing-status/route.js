// app/api/admin/packing-status/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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
const TABLE_ORDER_MANAGEMENT = process.env.DYNAMODB_TABLE_ORDERS || 'order-management'; // 주문 관리 테이블
const TABLE_PACKING_HISTORY = process.env.DYNAMODB_TABLE_PACKING_HISTORY || 'packing-history'; // 패킹 히스토리 테이블

/**
 * GET handler for /api/admin/packing-status
 * 모든 주문의 orderItems 목록을 가져옵니다 (검색/필터 파라미터 처리 포함).
 *
 * @param {Request} request
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm'); // 상품명 또는 선박명 검색
  const shipNameFilter = searchParams.get('shipName');
  const packingStatusFilter = searchParams.get('packingStatus'); // 'true' 또는 'false' 문자열
  const packingStatusDashboard = searchParams.get('packingStatusDashboard'); // 대시보드용 필터링 여부

  try {
    // order-management 테이블 전체 스캔 (주의: 대량 데이터 시 성능 문제 발생 가능)
    // 실제 운영 환경에서는 GSI를 활용하거나, Elasticsearch/OpenSearch와 같은 검색 엔진을 고려해야 합니다.
    const scanCommand = new ScanCommand({
      TableName: TABLE_ORDER_MANAGEMENT,
      // orderItems 배열 내부의 필드에 대한 필터링은 Scan 후 애플리케이션 레벨에서 처리
      // DynamoDB FilterExpression은 스캔된 모든 항목에 대해 적용되므로,
      // orderItems 배열 내부의 특정 필드에 대한 복잡한 쿼리는 비효율적일 수 있습니다.
    });

    const { Items: orders } = await docClient.send(scanCommand);

    let allOrderItems = [];

    // 각 주문의 orderItems 배열을 순회하며 필요한 데이터 추출 및 필터링
    orders.forEach(order => {
      order.orderItems?.forEach(item => {
        // 각 orderItem에 orderId, shipName 등 부모 주문의 정보 추가
        const fullItem = {
          orderId: order.orderId,
          shipName: order.shipInfo?.shipName, // shipInfo가 있을 경우 shipName 가져옴
          productName: item.name, // orderItem의 상품명
          productId: item.productId, // orderItem의 상품 ID
          quantity: item.quantity, // 주문 수량
          packingStatus: item.packingStatus || false, // packingStatus가 없으면 false
          // orderItemId는 orderId와 productId를 조합하여 생성 (프론트엔드와 일치하도록)
          order_item_id: `${order.orderId}-${item.productId}`,
        };
        allOrderItems.push(fullItem);
      });
    });

    // 애플리케이션 레벨에서 필터링 적용
    let filteredOrderItems = allOrderItems.filter(item => {
      const matchesSearch = searchTerm
        ? item.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.shipName?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchesShipName = shipNameFilter && shipNameFilter !== 'All'
        ? item.shipName === shipNameFilter
        : true;

      const matchesPackingStatus = packingStatusFilter && packingStatusFilter !== 'All'
        ? item.packingStatus === (packingStatusFilter === 'true')
        : true;

      const matchesPackingStatusDashboard = packingStatusDashboard
        ? item.packingStatus === false // 대시보드용은 packingStatus가 false인 경우만
        : true;
      
      return matchesSearch && matchesShipName && matchesPackingStatus && matchesPackingStatusDashboard;
    });

    // 프론트엔드에서 예상하는 형식으로 데이터 매핑
    const mappedItems = filteredOrderItems.map(item => ({
      order_id: item.orderId,
      product_id: item.productId, // 프론트엔드가 요구하는 필드명 (고유 키 생성에 사용)
      order_item_id: item.order_item_id, // 실제 아이템의 PK (조합된 ID)
      shipName: item.shipName,
      product: item.productName,
      stock: item.quantity,
      packing: item.packingStatus, // 'packingStatus' 필드가 boolean
    }));

    // 오더 번호 기준으로 정렬 (최신 오더 우선) - createdAt이 없으므로 orderId 문자열 역순 정렬
    // 실제로는 orderId와 orderDate를 조합하거나, GSI를 통해 정렬하는 것이 효율적입니다.
    mappedItems.sort((a, b) => {
      // order_id가 문자열이고, 시간순으로 정렬하려면 다른 필드(예: createdAt)가 필요
      // 여기서는 간단히 order_id 문자열 비교로 역순 정렬 (큰 값이 먼저 오도록)
      if (a.order_id < b.order_id) return 1;
      if (a.order_id > b.order_id) return -1;
      return 0;
    });

    return NextResponse.json(mappedItems, { status: 200 });
  } catch (error) {
    console.error("Error fetching packing status items from DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to fetch packing status items', error: error.message }, { status: 500 });
  }
}

/**
 * PATCH handler for /api/admin/packing-status
 * 특정 주문 상품의 포장 상태를 업데이트하고 히스토리를 기록합니다.
 * Frontend는 orderId, productId, packingStatus를 보냅니다.
 *
 * @param {Request} request
 */
export async function PATCH(request) {
  const { orderId, productId, packingStatus } = await request.json(); // packingStatus는 boolean

  if (!orderId || !productId || packingStatus === undefined) {
    return NextResponse.json({ message: 'orderId, productId, and packingStatus are required.' }, { status: 400 });
  }

  try {
    // 1. 기존 주문 정보 가져오기 (orderItems 배열을 포함)
    const getCommand = new GetCommand({
      TableName: TABLE_ORDER_MANAGEMENT,
      Key: { orderId: orderId },
      ProjectionExpression: 'orderItems, shipInfo, userId, customer', // 필요한 필드만 가져옴
    });
    const { Item: existingOrder } = await docClient.send(getCommand);

    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found.' }, { status: 404 });
    }

    let updatedOrderItem = null;
    const newOrderItems = existingOrder.orderItems.map(item => {
      if (item.productId === productId) {
        // packingStatus가 변경된 경우에만 updatedItem에 저장
        if (item.packingStatus !== packingStatus) {
            updatedOrderItem = { ...item, packingStatus: packingStatus };
            return updatedOrderItem;
        }
      }
      return item;
    });

    // packingStatus가 실제로 변경되었는지 확인
    if (!updatedOrderItem) {
        return NextResponse.json({ message: 'Packing status is already the same or product not found in order.', updatedItem: null }, { status: 200 });
    }

    // 2. order-management 테이블의 orderItems 배열 업데이트
    const updateCommand = new UpdateCommand({
      TableName: TABLE_ORDER_MANAGEMENT,
      Key: {
        orderId: orderId,
      },
      UpdateExpression: 'SET #oi = :newOrderItems, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#oi': 'orderItems',
      },
      ExpressionAttributeValues: {
        ':newOrderItems': newOrderItems,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW', // 업데이트된 항목의 모든 속성 반환
    });
    const { Attributes: updatedOrder } = await docClient.send(updateCommand);

    // 3. packing_history 테이블에 히스토리 기록 (선택 사항)
    if (TABLE_PACKING_HISTORY) { // 환경 변수가 설정된 경우에만 기록 시도
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

        const putHistoryCommand = new PutCommand({
            TableName: TABLE_PACKING_HISTORY,
            Item: historyItem,
        });
        await docClient.send(putHistoryCommand);
        console.log('Packing status history recorded:', historyItem);
    }

    return NextResponse.json({ message: 'Packing status updated and history recorded successfully.', updatedItem: updatedOrderItem }, { status: 200 });
  } catch (error) {
    console.error("Error updating packing status or recording history in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to update packing status', error: error.message }, { status: 500 });
  }
}
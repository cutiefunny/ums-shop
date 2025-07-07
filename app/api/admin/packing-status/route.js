// app/api/admin/packing-status/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
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

/**
 * GET handler for /api/admin/packing-status
 * 모든 주문 상품 목록을 가져옵니다 (검색/필터 파라미터 처리 포함).
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
    const filterExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    // Base scan parameters
    const scanParams = {
      TableName: TABLE_ORDER_ITEMS,
    };

    // 검색어 필터링 (상품명 또는 선박명) - Scan에 FilterExpression 적용
    // Warning: 이 방식은 테이블 크기가 커지면 비효율적입니다.
    // Full-text search 또는 복잡한 쿼리가 필요하면 Elasticsearch/OpenSearch 같은 외부 검색 엔진 통합을 고려해야 합니다.
    if (searchTerm) {
      filterExpressions.push('contains(#productName, :searchTerm) OR contains(#shipName, :searchTerm)');
      expressionAttributeValues[':searchTerm'] = searchTerm;
      expressionAttributeNames['#productName'] = 'productName';
      expressionAttributeNames['#shipName'] = 'shipName';
    }

    // 선박명 필터링
    // GSI 'shipName-index'가 있다면 QueryCommand 사용을 고려 (현재는 Scan)
    if (shipNameFilter && shipNameFilter !== 'All') {
      filterExpressions.push('#shipName = :shipNameVal');
      expressionAttributeValues[':shipNameVal'] = shipNameFilter;
      expressionAttributeNames['#shipName'] = 'shipName';
    }

    // 포장상태 필터링
    // GSI 'packingStatus-index'가 있다면 QueryCommand 사용을 고려 (현재는 Scan)
    if (packingStatusFilter && packingStatusFilter !== 'All') {
      filterExpressions.push('#packingStatus = :packingStatusVal');
      expressionAttributeValues[':packingStatusVal'] = packingStatusFilter === 'true'; // boolean으로 변환
      expressionAttributeNames['#packingStatus'] = 'packingStatus';
    }

    // 대시보드용 포장상태 필터링
    // packingStatusDashboard가 true인 경우, 포장 상태가 false인 항목만 필터링
    if (packingStatusDashboard) {
      filterExpressions.push('#packingStatus = :packingStatusDashboardVal');
      expressionAttributeValues[':packingStatusDashboardVal'] = packingStatusDashboard;
      expressionAttributeNames['#packingStatus'] = 'packingStatus';
    }

    if (filterExpressions.length > 0) {
      scanParams.FilterExpression = filterExpressions.join(' AND ');
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const command = new ScanCommand(scanParams);
    const { Items } = await docClient.send(command);

    // 프론트엔드에서 예상하는 형식으로 데이터 매핑
    const mappedItems = Items.map(item => ({
      order_id: item.orderId,      // 프론트엔드가 요구하는 필드명
      product_id: item.productId,  // 프론트엔드가 요구하는 필드명 (고유 키 생성에 사용)
      order_item_id: item.orderItemId, // 실제 아이템의 PK
      shipName: item.shipName,
      product: item.productName,
      stock: item.quantity,
      packing: item.packingStatus || false, // 'packingStatus' 필드가 boolean이라고 가정
    }));

    // 오더 번호 기준으로 정렬 (최신 오더 우선)
    // 실제로는 orderId와 orderDate를 조합하거나, GSI를 통해 정렬하는 것이 효율적입니다.
    mappedItems.sort((a, b) => {
        // order_id가 문자열이고, 시간순으로 정렬하려면 다른 필드(예: createdAt)가 필요
        // 여기서는 간단히 문자열 비교로 역순 정렬 (큰 값이 먼저 오도록)
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
 * PATCH handler for /api/admin/packing-status/update
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

  // order-items 테이블의 Primary Key (PK)는 orderItemId라고 가정합니다.
  // orderId와 productId를 조합하여 orderItemId를 구성합니다.
  const orderItemId = `${orderId}-${productId}`; // 예: "ORD1234-PRODABC" (프론트엔드와 일치해야 함)

  try {
    // 1. order_items 테이블에서 packingStatus 업데이트
    const updateCommand = new UpdateCommand({
      TableName: TABLE_ORDER_ITEMS,
      Key: {
        orderItemId: orderItemId, // order-items 테이블의 실제 PK 이름
      },
      UpdateExpression: 'SET #ps = :newStatus, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#ps': 'packingStatus', // 'packingStatus' 필드 이름
      },
      ExpressionAttributeValues: {
        ':newStatus': packingStatus,
        ':updatedAt': new Date().toISOString(), // 업데이트 시간 기록
      },
      ReturnValues: 'ALL_NEW', // 업데이트된 항목의 모든 속성 반환
    });
    const { Attributes: updatedItem } = await docClient.send(updateCommand);

    // 2. packing_history 테이블에 히스토리 기록 (선택 사항)
    // 실제 운영에서는 이 로직을 별도의 Lambda 함수로 분리하거나 DynamoDB Streams를 활용하는 것이 일반적입니다.
    if (TABLE_PACKING_HISTORY) { // 환경 변수가 설정된 경우에만 기록 시도
        const historyItem = {
            packingHistoryId: uuidv4(), // 고유 히스토리 ID
            orderItemId: orderItemId,
            orderId: orderId,
            productId: productId, // 프론트에서 받은 productId
            productName: updatedItem?.productName || 'Unknown Product', // 업데이트된 아이템에서 상품명 가져오기
            shipName: updatedItem?.shipName || 'Unknown Ship', // 업데이트된 아이템에서 선박명 가져오기
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

    return NextResponse.json({ message: 'Packing status updated and history recorded successfully.', updatedItem }, { status: 200 });
  } catch (error) {
    console.error("Error updating packing status or recording history in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to update packing status', error: error.message }, { status: 500 });
  }
}
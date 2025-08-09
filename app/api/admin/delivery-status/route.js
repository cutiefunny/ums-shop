// /api/admin/delivery-status/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// 주문 데이터를 가져올 테이블 (order-management)
const TABLE_ORDERS = process.env.DYNAMODB_TABLE_ORDERS || 'order-management';

/**
 * GET handler for /api/admin/delivery-status
 * order-management 테이블에서 배송 관련 데이터를 가져옵니다.
 * 최신 상태(status)와 운송장 번호(trackingNumber)는 statusHistory 배열의 마지막 항목에서 가져옵니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm')?.toLowerCase() || ''; // 검색어 (이름, 주문 ID, 운송장 번호)

  try {
    // 1. 주문 데이터 (order-management) 스캔
    const ordersCommand = new ScanCommand({
      TableName: TABLE_ORDERS,
    });
    const { Items: orderItems } = await docClient.send(ordersCommand);

    // 2. 필요한 데이터 형식으로 가공
    let processedData = orderItems.map(order => {
      const customerName = order.customer?.name || order.userName || 'N/A';
      let latestStatus = 'N/A';
      let latestTrackingNumber = order.trackingNumber || '-'; // 기본값은 최상위 필드를 사용

      // statusHistory 배열이 존재하고 비어있지 않으면 마지막 항목의 정보를 사용
      if (order.statusHistory && Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
        const lastEntry = order.statusHistory[order.statusHistory.length - 1];
        latestStatus = lastEntry.newStatus || latestStatus;
        // ✨ statusHistory의 마지막 항목에 trackingNumber가 있으면 그 값을 사용
        latestTrackingNumber = lastEntry.trackingNumber || latestTrackingNumber;
      }

      return {
        orderId: order.orderId,
        name: customerName,
        date: order.date?.split('T')[0] || 'N/A',
        status: latestStatus,
        trackingNumber: latestTrackingNumber,
      };
    });

    // 3. 'Delivered' 또는 'In Delivery' 상태인 데이터만 필터링
    let filteredData = processedData.filter(item => item.status === 'Delivered' || item.status === 'In Delivery');

    // 4. 검색어 필터링 적용
    if (searchTerm) {
      filteredData = filteredData.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.orderId.toLowerCase().includes(searchTerm) ||
        (item.trackingNumber && item.trackingNumber.toLowerCase().includes(searchTerm))
      );
    }

    // 5. 날짜를 기준으로 최신순으로 정렬
    const sortedData = filteredData.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });

    return NextResponse.json(sortedData, { status: 200 });

  } catch (error) {
    console.error("Error fetching order data from DynamoDB:", error);
    return NextResponse.json(
      { message: 'Failed to fetch order data', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for /api/admin/delivery-status
 * 특정 주문의 statusHistory에 새 상태와 운송장 번호를 추가하고, 최상위 운송장 번호도 업데이트합니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function PATCH(request) {
  try {
    // ✨ body에서 trackingNumber도 함께 받습니다.
    const { orderId, status, trackingNumber } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ message: 'Order ID and status are required' }, { status: 400 });
    }

    // statusHistory에 추가할 새로운 상태 객체
    const newStatusEntry = {
      newStatus: status,
      timestamp: new Date().toISOString(),
      // ✨ 운송장 번호가 있으면 객체에 추가, 없으면 추가하지 않음
      ...(trackingNumber && { trackingNumber: trackingNumber }),
    };

    const updateParams = {
      TableName: TABLE_ORDERS,
      Key: {
        orderId: orderId,
      },
      // ✨ SET 표현식 수정: statusHistory 추가와 최상위 trackingNumber 업데이트를 동시에 수행
      UpdateExpression: 'SET #history = list_append(if_not_exists(#history, :empty_list), :new_entry), #tracking = :tracking_val',
      ExpressionAttributeNames: {
        '#history': 'statusHistory',
        '#tracking': 'trackingNumber', // 최상위 trackingNumber 필드
      },
      ExpressionAttributeValues: {
        ':new_entry': [newStatusEntry],
        ':empty_list': [],
        ':tracking_val': trackingNumber || null, // 빈 문자열 대신 null로 저장
      },
      ReturnValues: 'ALL_NEW',
    };

    const command = new UpdateCommand(updateParams);
    const { Attributes } = await docClient.send(command);

    return NextResponse.json({ message: 'Delivery status updated successfully', updatedItem: Attributes }, { status: 200 });

  } catch (error) {
    console.error("Error updating delivery status in DynamoDB:", error);
    return NextResponse.json(
      { message: 'Failed to update delivery status', error: error.message },
      { status: 500 }
    );
  }
}
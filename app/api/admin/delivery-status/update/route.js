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

// 주문 데이터를 관리할 테이블 (order-management)
const TABLE_ORDERS = process.env.DYNAMODB_TABLE_ORDERS || 'ums-shop-orders';

/**
 * GET handler for /api/admin/delivery-status
 * DynamoDB의 order-management 테이블에서 데이터를 가져옵니다.
 * status와 trackingNumber는 statusHistory 배열의 마지막 항목에서 가져옵니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm')?.toLowerCase() || ''; // 검색어 (이름, 주문 ID, 운송장 번호)
  const statusFilter = searchParams.get('status') || 'All'; // 배송 상태 필터

  try {
    // 1. 주문 데이터 (order-management) 스캔
    const ordersCommand = new ScanCommand({
      TableName: TABLE_ORDERS,
    });
    const { Items: orderItems } = await docClient.send(ordersCommand);

    // Warning: ScanCommand는 테이블이 클 경우 비효율적입니다.
    // 실제 운영 환경에서는 GSI를 활용한 QueryCommand를 사용하는 것이 좋습니다.

    // 2. 필요한 데이터 형식으로 가공
    let processedData = orderItems.map(order => {
      const customerName = order.customer?.name || order.userName || 'N/A';
      
      let latestStatus = 'N/A';
      let latestTrackingNumber = '-';

      // statusHistory 배열이 존재하면, 마지막 항목에서 최신 상태와 운송장 번호를 가져옴
      if (order.statusHistory && Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
        const latestEntry = order.statusHistory[order.statusHistory.length - 1];
        latestStatus = latestEntry.newStatus || 'N/A';
        latestTrackingNumber = latestEntry.trackingNumber || '-';
      }

      return {
        orderId: order.orderId,
        name: customerName,
        date: order.date?.split('T')[0] || 'N/A',
        status: latestStatus,
        trackingNumber: latestTrackingNumber,
      };
    });

    // 3. 필터링 로직 적용
    if (searchTerm) {
      processedData = processedData.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.orderId.toLowerCase().includes(searchTerm) ||
        (item.trackingNumber && item.trackingNumber.toLowerCase().includes(searchTerm))
      );
    }

    if (statusFilter !== 'All') {
      processedData = processedData.filter(item => item.status === statusFilter);
    }

    // 4. 날짜를 기준으로 최신순으로 정렬
    const sortedData = processedData.sort((a, b) => {
      if (a.date && b.date) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return 0;
    });

    return NextResponse.json(sortedData, { status: 200 });

  } catch (error) {
    console.error("Error fetching delivery status data from DynamoDB:", error);
    return NextResponse.json(
      { message: 'Failed to fetch delivery status data', error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler for /api/admin/delivery-status/update
 * 특정 주문의 statusHistory 목록에 새로운 상태와 운송장 번호를 추가합니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function PATCH(request) {
  try {
    const { orderId, status, trackingNumber } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ message: 'Order ID and status are required' }, { status: 400 });
    }

    // statusHistory에 추가할 새로운 상태 객체
    const newStatusEntry = {
      newStatus: status,
      trackingNumber: trackingNumber || null, // trackingNumber가 없으면 null로 저장
      timestamp: new Date().toISOString(),
    };

    const updateParams = {
      TableName: TABLE_ORDERS, // order-management 테이블을 업데이트
      Key: {
        orderId: orderId,
      },
      // statusHistory 배열에 newStatusEntry를 추가
      UpdateExpression: 'SET #history = list_append(if_not_exists(#history, :empty_list), :new_entry)',
      ExpressionAttributeNames: {
        '#history': 'statusHistory',
      },
      ExpressionAttributeValues: {
        ':new_entry': [newStatusEntry], // list_append는 리스트를 인자로 받음
        ':empty_list': [],
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
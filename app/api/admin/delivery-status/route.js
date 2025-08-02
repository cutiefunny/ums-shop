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
 * DynamoDB의 order-management 테이블에서 'Delivered' 상태인 주문 데이터만 가져옵니다.
 * status는 statusHistory 배열의 마지막 항목에서 가져옵니다.
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

    // Warning: ScanCommand는 테이블이 클 경우 매우 비효율적입니다.
    // 실제 운영 환경에서는 GSI를 활용한 QueryCommand를 사용하는 것이 좋습니다.

    // 2. 필요한 데이터 형식으로 가공
    let processedData = orderItems.map(order => {
      const customerName = order.customer?.name || order.userName || 'N/A';

      // statusHistory 배열이 존재하고 비어있지 않으면 마지막 항목의 newStatus를 사용
      const latestStatus =
        order.statusHistory && Array.isArray(order.statusHistory) && order.statusHistory.length > 0
          ? order.statusHistory[order.statusHistory.length - 1].newStatus
          : 'N/A'; // 기본값

      return {
        orderId: order.orderId,
        name: customerName,
        date: order.date?.split('T')[0] || 'N/A',
        status: latestStatus, // statusHistory에서 가져온 최신 상태
        trackingNumber: order.trackingNumber || '-',
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
 * PATCH handler for /api/admin/delivery-status/update
 * 특정 주문의 statusHistory 목록에 새로운 상태를 추가합니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function PATCH(request) {
  try {
    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ message: 'Order ID and status are required' }, { status: 400 });
    }

    // statusHistory에 추가할 새로운 상태 객체
    const newStatusEntry = {
      newStatus: status,
      timestamp: new Date().toISOString(),
    };

    const updateParams = {
      TableName: TABLE_ORDERS,
      Key: {
        orderId: orderId,
      },
      // statusHistory 배열에 newStatusEntry를 추가합니다.
      // 만약 statusHistory 필드가 없다면 새로 생성합니다.
      UpdateExpression: 'SET #history = list_append(if_not_exists(#history, :empty_list), :new_entry)',
      ExpressionAttributeNames: {
        '#history': 'statusHistory',
      },
      ExpressionAttributeValues: {
        ':new_entry': [newStatusEntry], // list_append는 리스트를 인자로 받습니다.
        ':empty_list': [], // statusHistory가 없을 경우 사용할 빈 리스트
      },
      ReturnValues: 'ALL_NEW', // 업데이트된 항목의 모든 속성 반환
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
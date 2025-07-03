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
// 배송 상태 데이터를 가져올 테이블 (delivery-status) - 새로 생성해야 합니다.
const TABLE_DELIVERY_STATUS = process.env.DYNAMODB_TABLE_DELIVERY_STATUS || 'delivery-status';

/**
 * GET handler for /api/admin/delivery-status
 * DynamoDB의 order-management와 delivery-status 테이블에서 데이터를 가져와 조인합니다.
 * 양쪽에 모두 데이터가 있는 경우에만 리스트에 포함됩니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm')?.toLowerCase() || ''; // 검색어 (이름, 선박명)
  const statusFilter = searchParams.get('status') || 'All'; // 배송 상태 필터 (In Delivery, Delivered)

  try {
    // 1. 주문 데이터 (order-management) 스캔
    const ordersCommand = new ScanCommand({
      TableName: TABLE_ORDERS,
    });
    const { Items: orderItems } = await docClient.send(ordersCommand);

    // 2. 배송 상태 데이터 (delivery-status) 스캔
    const deliveryStatusCommand = new ScanCommand({
      TableName: TABLE_DELIVERY_STATUS,
    });
    const { Items: deliveryStatusItems } = await docClient.send(deliveryStatusCommand);

    // Warning: ScanCommand는 테이블이 클 경우 매우 비효율적입니다.
    // 실제 운영 환경에서는 GSI를 활용한 QueryCommand를 사용하는 것이 좋습니다.

    // 3. 배송 상태 데이터를 orderId를 키로 하는 Map으로 변환하여 빠른 조회 가능하게 함
    const deliveryStatusMap = new Map();
    deliveryStatusItems.forEach(delivery => {
      if (delivery.orderId) {
        deliveryStatusMap.set(delivery.orderId, delivery);
      }
    });

    // 4. 주문 데이터와 배송 상태 데이터를 조인 (양쪽에 모두 데이터가 있는 경우만 포함)
    let combinedData = [];
    orderItems.forEach(order => {
      const deliveryInfo = deliveryStatusMap.get(order.orderId);
      if (deliveryInfo) { // deliveryInfo가 존재하는 경우에만 조인
        // customer.name이 중첩된 객체일 수 있으므로 안전하게 접근
        const customerName = order.customer && order.customer.name ? order.customer.name : order.userName || 'N/A';

        combinedData.push({
          orderId: order.orderId,
          name: customerName, // 프론트엔드 이미지에 'Name'으로 표시됨
          date: order.date?.split('T')[0] || 'N/A', // 날짜만 표시 (YYYY-MM-DD)
          status: deliveryInfo.status, // delivery-status의 status
          trackingNumber: deliveryInfo.trackingNumber || '-', // delivery-status의 trackingNumber
        });
      }
    });

    // 5. 필터링 로직 적용 (조인된 데이터에 대해)
    if (searchTerm) {
      combinedData = combinedData.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.orderId.toLowerCase().includes(searchTerm) || // 주문 ID로도 검색 가능하도록 추가
        (item.trackingNumber && item.trackingNumber.toLowerCase().includes(searchTerm)) // 운송장 번호로도 검색 가능하도록 추가
      );
    }

    if (statusFilter !== 'All') {
      combinedData = combinedData.filter(item => item.status === statusFilter);
    }

    // 6. 날짜 필드를 기준으로 최신 주문부터 정렬 (프론트엔드에서 이미 정렬하므로 여기서는 생략 가능하지만, 일관성을 위해 유지)
    const sortedData = combinedData.sort((a, b) => {
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
 * 특정 주문의 배송 상태를 업데이트합니다.
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

    const updateParams = {
      TableName: TABLE_DELIVERY_STATUS,
      Key: {
        orderId: orderId, // delivery-status 테이블의 Primary Key가 orderId라고 가정
      },
      UpdateExpression: 'SET #status = :statusVal',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':statusVal': status,
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

// /api/admin/payment-tracking/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// 주문 데이터를 가져올 테이블 (orders 테이블)
const TABLE_ORDERS = process.env.DYNAMODB_TABLE_ORDERS || 'orders-management';
// 결제 데이터를 가져올 테이블 (payments 테이블) - 이 테이블에 payment-information이 저장되어야 합니다.
const TABLE_PAYMENTS = process.env.DYNAMODB_TABLE_PAYMENT_INFORMATION || 'payment-information';

/**
 * GET handler for /api/admin/payment-tracking
 * DynamoDB의 orders 테이블과 payments 테이블에서 데이터를 가져와 조인합니다.
 * 양쪽에 모두 데이터가 있는 경우에만 리스트에 포함됩니다.
 *
 * @param {Request} request
 * @returns {NextResponse} - JSON 응답
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('searchTerm')?.toLowerCase() || ''; // 검색어 (주문번호, 고객명)
  const statusFilter = searchParams.get('status') || 'All'; // 결제 상태 필터 (payment-information의 status)
  const paymentMethodFilter = searchParams.get('paymentMethod') || 'All'; // 결제 방법 필터 (payment-information의 paymentMethod)

  try {
    // 1. 주문 데이터 (order-management) 스캔
    const ordersCommand = new ScanCommand({
      TableName: TABLE_ORDERS,
    });
    const { Items: orderItems } = await docClient.send(ordersCommand);

    // 2. 결제 데이터 (payment-information) 스캔
    const paymentsCommand = new ScanCommand({
      TableName: TABLE_PAYMENTS,
    });
    const { Items: paymentItems } = await docClient.send(paymentsCommand);

    // Warning: ScanCommand는 테이블이 클 경우 매우 비효율적입니다.
    // 실제 운영 환경에서는 특정 orderId에 대한 GetItemCommand 또는
    // GSI를 활용한 QueryCommand를 사용하는 것이 좋습니다.
    // 여기서는 요청된 필터링 및 조인 로직을 위해 전체 스캔을 가정합니다.

    // 3. 결제 데이터를 orderId를 키로 하는 Map으로 변환하여 빠른 조회 가능하게 함
    const paymentMap = new Map();
    paymentItems.forEach(payment => {
      if (payment.orderId) {
        paymentMap.set(payment.orderId, payment);
      }
    });

    // 4. 주문 데이터와 결제 데이터를 조인 (양쪽에 모두 데이터가 있는 경우만 포함)
    let combinedData = [];
    orderItems.forEach(order => {
      const paymentInfo = paymentMap.get(order.orderId);
      if (paymentInfo) { // paymentInfo가 존재하는 경우에만 조인
        // customer.name이 중첩된 객체일 수 있으므로 안전하게 접근
        const customerName = order.customer && order.customer.name ? order.customer.name : order.userName || 'N/A';

        combinedData.push({
          orderId: order.orderId,
          customerName: customerName,
          orderDate: order.date, // DynamoDB 'date' 필드가 주문 일자라고 가정
          totalAmount: order.totalAmount,
          paymentMethod: paymentInfo.paymentMethod, // payment-information의 paymentMethod
          status: paymentInfo.status, // payment-information의 status
        });
      }
    });

    // 5. 필터링 로직 적용 (조인된 데이터에 대해)
    if (searchTerm) {
      combinedData = combinedData.filter(item =>
        item.orderId.toLowerCase().includes(searchTerm) ||
        item.customerName.toLowerCase().includes(searchTerm)
      );
    }

    if (statusFilter !== 'All') {
      combinedData = combinedData.filter(item => item.status === statusFilter);
    }

    if (paymentMethodFilter !== 'All') {
      combinedData = combinedData.filter(item => item.paymentMethod === paymentMethodFilter);
    }

    // 6. 날짜 필드를 기준으로 최신 주문부터 정렬
    const sortedData = combinedData.sort((a, b) => {
      if (a.orderDate && b.orderDate) {
        return new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime();
      }
      return 0; // 날짜 필드가 없으면 정렬하지 않음
    });

    return NextResponse.json(sortedData, { status: 200 });

  } catch (error) {
    console.error("Error fetching payment tracking orders from DynamoDB:", error);
    return NextResponse.json(
      { message: 'Failed to fetch payment tracking orders', error: error.message },
      { status: 500 }
    );
  }
}

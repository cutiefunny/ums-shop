// app/api/admin/payment-tracking/[orderId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
const TABLE_ORDERS = process.env.DYNAMODB_TABLE_ORDERS || 'ums-shop-orders';
const TABLE_PAYMENT_INFO = process.env.DYNAMODB_TABLE_PAYMENT_INFORMATION || 'ums-shop-payment-information';

/**
 * GET handler for /api/admin/payment-tracking/[orderId]
 * 특정 주문의 상세 정보와 연관된 결제 정보를 가져옵니다.
 *
 * @param {Request} request
 * @param {object} { params } - Next.js dynamic route parameters
 */
export async function GET(request, { params }) {
  const { orderId } = params; // URL에서 orderId 가져오기

  if (!orderId) {
    return NextResponse.json({ message: 'Order ID is required.' }, { status: 400 });
  }

  try {
    // 1. ums-shop-orders 테이블에서 주문 상세 정보 가져오기
    const orderCommand = new GetCommand({
      TableName: TABLE_ORDERS,
      Key: {
        orderId: orderId, // orders 테이블의 PK는 orderId
      },
    });
    const { Item: orderItem } = await docClient.send(orderCommand);

    if (!orderItem) {
      return NextResponse.json({ message: `Order with ID ${orderId} not found.` }, { status: 404 });
    }

    // 2. ums-shop-payment-information 테이블에서 결제 정보 가져오기
    // payment-information 테이블에 orderId-index GSI가 있다고 가정하고 Query 사용
    const paymentCommand = new QueryCommand({
      TableName: TABLE_PAYMENT_INFO,
      IndexName: 'orderId-index', // payment-information 테이블의 GSI 이름
      KeyConditionExpression: 'orderId = :orderIdVal',
      ExpressionAttributeValues: {
        ':orderIdVal': orderId,
      },
      Limit: 1, // 한 주문에 하나의 결제 정보만 있다고 가정
    });
    const { Items: paymentItems } = await docClient.send(paymentCommand);
    const paymentInfo = paymentItems && paymentItems.length > 0 ? paymentItems[0] : null;

    // 3. 두 정보를 조합하여 프론트엔드에 전달할 객체 생성
    const combinedDetail = {
      orderId: orderItem.orderId,
      orderDate: orderItem.date, // 주문 일자
      customerName: orderItem.customer?.name || orderItem.userName || 'N/A', // 고객명
      userEmail: orderItem.userEmail || 'N/A',
      customerPhone: orderItem.customer?.phoneNumber || 'N/A', // 고객 전화번호 (customer 객체 내에 있다고 가정)
      
      // 결제 정보 (paymentInfo에서 가져옴)
      paymentMethod: paymentInfo?.paymentMethod || 'N/A',
      transactionId: paymentInfo?.transactionId || 'N/A',
      paymentTotalAmount: paymentInfo?.totalAmount || orderItem.totalAmount, // 결제 총액 (paymentInfo 우선, 없으면 orderItem)

      // 주문 상품 목록 (orderItem.orderItems는 CSV에서 JSON 문자열이었으므로 파싱 필요)
      // 실제 DynamoDB에서는 이미 파싱된 List<Map> 형태일 수 있습니다.
      orderItems: orderItem.orderItems || [], // orderItem.orderItems가 이미 파싱된 배열이라고 가정
      
      subtotal: orderItem.subtotal,
      shippingFee: orderItem.shippingFee,
      tax: orderItem.tax,
      total: orderItem.total, // 최종 총액
    };

    return NextResponse.json(combinedDetail, { status: 200 });

  } catch (error) {
    console.error("Error fetching order/payment details from DynamoDB:", error);
    // ResourceNotFoundException, AccessDeniedException 등 상세 오류 처리
    if (error.name === 'ResourceNotFoundException') {
        return NextResponse.json({ message: `주문 또는 결제 정보를 찾을 수 없습니다. (ID: ${orderId})`, error: error.message }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to fetch order details', error: error.message }, { status: 500 });
  }
}
import paypal from '@paypal/checkout-server-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { NextResponse } from 'next/server';

// PayPal 환경 설정
const configureEnvironment = () => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (process.env.NODE_ENV === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

const client = new paypal.core.PayPalHttpClient(configureEnvironment());

// DynamoDB 설정
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2', // 예시: 서울 리전
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export async function POST(req) {
  try {
    const { paypalOrderId, orderId } = await req.json();

    if (!paypalOrderId || !orderId) {
      return NextResponse.json({ message: 'Missing paypalOrderId or orderId' }, { status: 400 });
    }

    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.prefer("return=representation");

    const response = await client.execute(request);

    if (response.statusCode !== 201) {
      console.error('PayPal Order Capture Error:', response.result);
      throw new Error(`PayPal order capture failed with status ${response.statusCode}`);
    }

    const capture = response.result.purchase_units[0].payments.captures[0];

    // DynamoDB에서 기존 주문 정보 가져오기
    const getParams = {
      TableName: 'Orders', // DynamoDB 테이블 이름
      Key: { orderId: orderId },
    };
    const { Item: existingOrder } = await ddbDocClient.send(new GetCommand(getParams));

    if (!existingOrder) {
      return NextResponse.json({ message: 'Order not found in DB' }, { status: 404 });
    }

    // 주문 상태 업데이트
    const newStatus = 'PayPal';
    const updatedStatusHistory = [
      ...(existingOrder.statusHistory || []),
      {
        timestamp: new Date().toISOString(),
        oldStatus: existingOrder.status || 'Payment(Confirmed)', // 이전 상태가 없을 경우 기본값
        newStatus: newStatus,
        changedBy: 'System (PayPal Capture)',
      }
    ];

    const updateParams = {
      TableName: 'Orders', // DynamoDB 테이블 이름
      Key: { orderId: orderId },
      UpdateExpression: 'SET #s = :status, paymentMethod = :pm, statusHistory = :sh, paypalCaptureId = :pcid',
      ExpressionAttributeNames: { '#s': 'status' }, // 'status'는 예약어일 수 있으므로 ExpressionAttributeNames 사용
      ExpressionAttributeValues: {
        ':status': newStatus,
        ':pm': 'PayPal',
        ':sh': updatedStatusHistory,
        ':pcid': capture.id,
      },
      ReturnValues: 'ALL_NEW',
    };
    await ddbDocClient.send(new UpdateCommand(updateParams));

    return NextResponse.json({
      message: 'PayPal order captured and DB updated successfully',
      paypalCaptureId: capture.id,
      status: capture.status,
    }, { status: 200 });

  } catch (error) {
    console.error('Failed to capture PayPal order:', error);
    return NextResponse.json({ message: 'Failed to capture PayPal order', error: error.message }, { status: 500 });
  }
}

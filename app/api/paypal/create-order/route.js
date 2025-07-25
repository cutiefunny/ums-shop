// app/api/paypal/create-order/route.js
import paypal from '@paypal/checkout-server-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'; // PutCommand 추가
import { NextResponse } from 'next/server';

// PayPal 환경 설정
const configureEnvironment = () => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PayPal API credentials are not set. Check your .env.local file.');
  }

  if (process.env.NODE_ENV === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

const client = new paypal.core.PayPalHttpClient(configureEnvironment());

// DynamoDB 설정 (환경 변수 사용 권장)
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'ap-northeast-2', // 예시: 서울 리전
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export async function POST(req) {
  const ORDER_MANAGEMENT_TABLE_NAME = process.env.DYNAMODB_TABLE_ORDERS || 'order-management';
  try {
    const { orderId, finalTotalPrice, currency } = await req.json();

    if (!orderId || !finalTotalPrice || !currency) {
      return NextResponse.json({ message: 'Missing orderId, finalTotalPrice, or currency' }, { status: 400 });
    }

    const parsedFinalTotalPrice = parseFloat(finalTotalPrice);
    if (isNaN(parsedFinalTotalPrice)) {
      return NextResponse.json({ message: 'Invalid finalTotalPrice: Must be a number' }, { status: 400 });
    }

    // 1. DynamoDB에 주문 초기 데이터 생성 (PutCommand 사용)
    const initialOrderParams = {
      TableName: ORDER_MANAGEMENT_TABLE_NAME,
      Item: {
        orderId: orderId,
        totalPrice: parsedFinalTotalPrice,
        currency: currency,
        status: 'Order(Confirmed)', // 초기 주문 상태
        paymentMethod: 'PayPal (Initiated)', // 결제 시작 상태
        createdAt: new Date().toISOString(),
        // 다른 주문 관련 필드를 여기에 추가할 수 있습니다.
      },
    };
    await ddbDocClient.send(new PutCommand(initialOrderParams));
    console.log(`Order ${orderId} successfully initiated in DynamoDB.`);


    // 2. PayPal 주문 생성
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: parsedFinalTotalPrice.toFixed(2), // 2자리 소수점
          },
          description: `Order ${orderId}`,
          custom_id: orderId, // 주문 ID를 custom_id로 전달하여 PayPal에서 식별
        },
      ],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/payment/${orderId}?status=success`, // 성공 시 리다이렉트 URL
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/orders/payment/${orderId}?status=cancel`, // 취소 시 리다이렉트 URL
        brand_name: process.env.NEXT_PUBLIC_PAYPAL_DISPLAY_NAME || 'SIONMSC',
        shipping_preference: 'NO_SHIPPING', // 배송 정보는 이미 주문에 포함되어 있으므로 PayPal에서는 받지 않음
        user_action: 'PAY_NOW',
      }
    });

    const response = await client.execute(request);

    if (response.statusCode !== 201) {
      console.error('PayPal Order Creation Error (PayPal API response):', response.result);
      // PayPal API에서 상세 오류 메시지가 있다면 포함하여 반환합니다.
      return NextResponse.json({ message: `PayPal order creation failed: ${JSON.stringify(response.result)}` }, { status: response.statusCode });
    }

    // 3. DynamoDB에 PayPal order ID 업데이트
    // 이제 주문 아이템이 존재하므로 UpdateCommand가 정상 작동합니다.
    const updateParams = {
      TableName: 'Orders', // DynamoDB 테이블 이름
      Key: { orderId: orderId },
      UpdateExpression: 'SET paypalOrderId = :poid, paymentMethod = :pm',
      ExpressionAttributeValues: {
        ':poid': response.result.id,
        ':pm': 'PayPal (Pending)', // PayPal 주문 ID를 받은 후 상태를 Pending으로 변경
      },
      ReturnValues: 'ALL_NEW',
    };
    await ddbDocClient.send(new UpdateCommand(updateParams));
    console.log(`Order ${orderId} successfully updated with PayPal Order ID: ${response.result.id}`);

    return NextResponse.json({
      paypalOrderId: response.result.id,
      orderId: orderId, // 클라이언트에서 생성한 orderId도 함께 반환
      links: response.result.links,
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create PayPal order (caught error):', error);
    return NextResponse.json({ message: 'Failed to create PayPal order', error: error.message, detail: error.stack }, { status: 500 });
  }
}
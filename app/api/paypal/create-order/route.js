import paypal from '@paypal/checkout-server-sdk';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
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
  try {
    const { orderId, finalTotalPrice } = await req.json();

    if (!orderId || !finalTotalPrice) {
      return NextResponse.json({ message: 'Missing orderId or finalTotalPrice' }, { status: 400 });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: finalTotalPrice.toFixed(2), // 2자리 소수점
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
      console.error('PayPal Order Creation Error:', response.result);
      throw new Error(`PayPal order creation failed with status ${response.statusCode}`);
    }

    // DynamoDB에 PayPal order ID 업데이트
    const updateParams = {
      TableName: 'Orders', // DynamoDB 테이블 이름
      Key: { orderId: orderId },
      UpdateExpression: 'SET paypalOrderId = :poid, paymentMethod = :pm',
      ExpressionAttributeValues: {
        ':poid': response.result.id,
        ':pm': 'PayPal (Pending)', // 초기 상태를 Pending으로 설정
      },
      ReturnValues: 'ALL_NEW',
    };
    await ddbDocClient.send(new UpdateCommand(updateParams));

    return NextResponse.json({
      paypalOrderId: response.result.id,
      links: response.result.links,
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create PayPal order:', error);
    return NextResponse.json({ message: 'Failed to create PayPal order', error: error.message }, { status: 500 });
  }
}

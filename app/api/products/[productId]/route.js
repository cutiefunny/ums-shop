// app/api/products/[productId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

// AWS SDK 클라이언트 초기화
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const docClient = DynamoDBDocumentClient.from(client);

// DynamoDB 테이블 이름 (환경 변수에서 가져옴)
const PRODUCTS_TABLE_NAME = process.env.DYNAMODB_TABLE_PRODUCTS;

/**
 * GET 요청 처리: 특정 상품 데이터를 조회합니다.
 * URL: /api/products/[productId]
 * @param {Request} request - 요청 객체
 * @param {{params: {productId: string}}} context - Next.js dynamic route parameters
 * @returns {NextResponse} 상품 데이터 또는 오류 응답
 */
export async function GET(request, { params }) {
  try {
    const { productId } = params;

    if (!productId) {
      return NextResponse.json({ message: 'Missing product ID' }, { status: 400 });
    }

    const command = new GetCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: {
        productId: productId, // Assuming 'productId' is the primary key
      },
    });
    const { Item } = await docClient.send(command);

    if (!Item) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    return NextResponse.json(Item, { status: 200 });
  } catch (error) {
    console.error(`Error fetching product ${params.productId} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to fetch product', error: error.message }, { status: 500 });
  }
}

/**
 * PUT 요청 처리: 특정 상품 데이터를 업데이트합니다.
 * URL: /api/products/[productId]
 * @param {Request} request - 요청 객체 (업데이트할 상품 데이터 포함)
 * @param {{params: {productId: string}}} context - Next.js dynamic route parameters
 * @returns {NextResponse} 업데이트된 상품 데이터 또는 오류 응답
 */
export async function PUT(request, { params }) {
  try {
    const { productId } = params;
    const body = await request.json(); // 업데이트할 데이터

    if (!productId) {
      return NextResponse.json({ message: 'Missing product ID' }, { status: 400 });
    }

    // DynamoDB UpdateExpression을 동적으로 생성
    let UpdateExpression = 'SET';
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};
    let first = true;

    for (const key in body) {
      // productId는 키이므로 업데이트 대상에서 제외합니다.
      if (key === 'productId') continue; 

      if (!first) {
        UpdateExpression += ',';
      }
      UpdateExpression += ` #${key} = :${key}`;
      ExpressionAttributeNames[`#${key}`] = key;
      
      // 숫자형 필드에 대한 NaN 처리 및 타입 변환
      let valueToStore = body[key];
      if (typeof valueToStore === 'string') {
        if (['stockQuantity', 'priceWon', 'exchangeRate', 'exchangeRateOffset', 'usdPriceOverride', 'calculatedPriceUsd'].includes(key)) {
          valueToStore = parseFloat(valueToStore) || 0;
        } else if (key === '납기일') {
          valueToStore = parseInt(valueToStore) || 0;
        }
      } else if (typeof valueToStore === 'number' && isNaN(valueToStore)) {
        valueToStore = 0;
      }
      ExpressionAttributeValues[`:${key}`] = valueToStore;
      first = false;
    }

    if (Object.keys(body).length === 0 || (Object.keys(body).length === 1 && body.hasOwnProperty('productId'))) {
      return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    // updatedAt 필드 자동 업데이트
    if (!UpdateExpression.includes('#updatedAt')) {
        if (!first) UpdateExpression += ',';
        UpdateExpression += ' #updatedAt = :updatedAt';
        ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
        ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
    }


    const updateCommand = new UpdateCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: { productId: productId }, // 'productId'가 파티션 키라고 가정
      UpdateExpression,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
    });

    const { Attributes } = await docClient.send(updateCommand);
    return NextResponse.json({ message: 'Product updated successfully', product: Attributes }, { status: 200 });
  } catch (error) {
    console.error(`Error updating product ${params.productId} in DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to update product', error: error.message }, { status: 500 });
  }
}

/**
 * DELETE 요청 처리: 특정 상품 데이터를 삭제합니다.
 * URL: /api/products/[productId]
 * @param {Request} request - 요청 객체
 * @param {{params: {productId: string}}} context - Next.js dynamic route parameters
 * @returns {NextResponse} 삭제 결과 또는 오류 응답
 */
export async function DELETE(request, { params }) {
  try {
    const { productId } = params;

    if (!productId) {
      return NextResponse.json({ message: 'Missing product ID' }, { status: 400 });
    }

    const command = new DeleteCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: {
        productId: productId, // 'productId'가 파티션 키라고 가정
      },
    });
    await docClient.send(command);
    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting product ${params.productId} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to delete product', error: error.message }, { status: 500 });
  }
}
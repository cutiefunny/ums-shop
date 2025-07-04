// app/api/products/[productId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb'; // PutCommand 추가
import { v4 as uuidv4 } from 'uuid'; // uuidv4 추가

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
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history'; // History 테이블 이름 추가

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

    // 기존 상품 정보를 가져와서 변경 내용을 비교 (선택 사항, 상세 기록을 위해)
    const getCommand = new GetCommand({
        TableName: PRODUCTS_TABLE_NAME,
        Key: { productId: productId },
    });
    const { Item: oldProduct } = await docClient.send(getCommand);
    
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

    // updatedAt 필드 자동 업데이트
    if (!UpdateExpression.includes('#updatedAt')) {
        if (!first) UpdateExpression += ',';
        UpdateExpression += ' #updatedAt = :updatedAt';
        ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
        ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
    }

    if (Object.keys(body).length === 0 || (Object.keys(body).length === 1 && body.hasOwnProperty('productId'))) {
      return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
    }

    const updateCommand = new UpdateCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: { productId: productId }, // 'productId'가 파티션 키라고 가정
      UpdateExpression,
      ExpressionAttributeNames,
    //   ExpressionAttributeValues: Object.keys(ExpressionAttributeValues).length > 0 ? ExpressionAttributeValues : undefined,
       ExpressionAttributeValues,
      ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
    });

    const { Attributes } = await docClient.send(updateCommand);

    // History 테이블에 기록
    let details = `상품 '${Attributes?.productName || productId}' (SKU: ${Attributes?.sku || 'N/A'})이(가) 수정되었습니다.`;
    // 특정 필드 변경 시 상세 내용 추가 (예: 가격, 상태, 재고 등)
    if (oldProduct) {
        const changes = [];
        for (const key in body) {
            if (key === 'productId' || key === 'updatedAt') continue;
            const oldValue = oldProduct[key];
            const newValue = body[key];
            if (String(oldValue) !== String(newValue)) { // 값 변경 감지
                changes.push(`${key}: '${oldValue}' -> '${newValue}'`);
            }
        }
        if (changes.length > 0) {
            details += ` 변경 내용: ${changes.join(', ')}.`;
        }
    }

    const historyItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Product Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "상품 수정",
        details: details,
    };
    const putHistoryCommand = new PutCommand({
        TableName: HISTORY_TABLE_NAME,
        Item: historyItem,
    });
    await docClient.send(putHistoryCommand);


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

    // 삭제될 상품 정보를 미리 가져옴 (로그 기록용)
    const getCommand = new GetCommand({
        TableName: PRODUCTS_TABLE_NAME,
        Key: { productId: productId },
    });
    const { Item: deletedProduct } = await docClient.send(getCommand);


    const command = new DeleteCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Key: {
        productId: productId, // 'productId'가 파티션 키라고 가정
      },
    });
    await docClient.send(command);

    // History 테이블에 기록
    const historyItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Product Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "상품 삭제",
        details: `상품 '${deletedProduct?.productName || productId}' (SKU: ${deletedProduct?.sku || 'N/A'})이(가) 삭제되었습니다.`,
    };
    const putHistoryCommand = new PutCommand({
        TableName: HISTORY_TABLE_NAME,
        Item: historyItem,
    });
    await docClient.send(putHistoryCommand);


    return NextResponse.json({ message: 'Product deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Error deleting product ${params.productId} from DynamoDB:`, error);
    return NextResponse.json({ message: 'Failed to delete product', error: error.message }, { status: 500 });
  }
}
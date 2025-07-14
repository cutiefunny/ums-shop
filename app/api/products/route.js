// app/api/products/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

const PRODUCTS_TABLE_NAME = process.env.DYNAMODB_TABLE_PRODUCTS;
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history'; // History 테이블 이름 추가

// GET: 모든 상품 조회 (limit 파라미터 추가)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '0', 10); // limit 파라미터 가져오기, 기본값 0

    const params = {
      TableName: PRODUCTS_TABLE_NAME,
    };

    if (limit > 0) {
      params.Limit = limit; // limit이 있으면 ScanCommand에 적용
    }

    const command = new ScanCommand(params);
    const { Items } = await docClient.send(command);
    return NextResponse.json(Items, { status: 200 });
  } catch (error) {
    console.error("Error fetching products from DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to fetch products' }, { status: 500 });
  }
}

// POST: 새 상품 생성
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      price, // 이 price는 priceWon과 다를 수 있으나, 기존 코드 흐름에 따라 그대로 둠
      mainCategory,
      subCategory1,
      subCategory2,
      sku,
      description,
      mainImage,
      subImages,
      stockQuantity,
      유통기한,
      납기일,
      purchas,
      autoExchangeRate,
      priceWon,
      exchangeRate,
      exchangeRateOffset,
      usdPriceOverride,
      calculatedPriceUsd,
      status
    } = body;

    // 필수 필드 유효성 검사 (클라이언트에서 이미 수행되지만, 서버에서도 다시 확인)
    if (!id || !name || price === undefined) {
      return NextResponse.json({ message: 'Missing required fields: id, name, price' }, { status: 400 });
    }

    // Convert and handle potential NaN values for numeric fields
    const parsedStockQuantity = parseFloat(stockQuantity) || 0;
    const parsed납기일 = parseInt(납기일) || 0;
    const parsedPriceWon = parseFloat(priceWon) || 0;
    const parsedExchangeRate = parseFloat(exchangeRate) || 0;
    const parsedExchangeRateOffset = parseFloat(exchangeRateOffset) || 0;
    const parsedUsdPriceOverride = parseFloat(usdPriceOverride) || 0;
    const parsedCalculatedPriceUsd = parseFloat(calculatedPriceUsd) || 0;

    const command = new PutCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Item: {
        productId: id,
        productName: name,
        mainCategory,
        subCategory1,
        subCategory2,
        sku,
        description,
        mainImage,
        subImages,
        stockQuantity: parsedStockQuantity,
        유통기한,
        납기일: parsed납기일,
        purchas,
        autoExchangeRate,
        priceWon: parsedPriceWon,
        exchangeRate: parsedExchangeRate,
        exchangeRateOffset: parsedExchangeRateOffset,
        usdPriceOverride: parsedUsdPriceOverride,
        calculatedPriceUsd: parsedCalculatedPriceUsd,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    await docClient.send(command);

    // History 테이블에 기록
    const historyItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
        deviceInfo: "백엔드 API (Product Management)", // TODO: 클라이언트 기기 정보로 대체
        actionType: "상품 등록",
        details: `새 상품 '${name}' (SKU: ${sku})이(가) 등록되었습니다.`,
    };
    const putHistoryCommand = new PutCommand({
        TableName: HISTORY_TABLE_NAME,
        Item: historyItem,
    });
    await docClient.send(putHistoryCommand);

    return NextResponse.json({ message: 'Product created successfully', product: body }, { status: 201 });
  } catch (error) {
    console.error("Error creating product in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to create product', error: error.message }, { status: 500 });
  }
}
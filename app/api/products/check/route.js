// app/api/products/check/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';


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


export async function GET(request) {
  const { searchParams } = new URL(request.url);
  // searchParams에서 카테고리 이름을 가져옵니다. (기존 변수명 유지)
  const mainCategoryName = decodeURIComponent(searchParams.get('mainCategoryId') || '');
  const subCategory1Name = decodeURIComponent(searchParams.get('subCategory1Id') || '');
  const subCategory2Name = decodeURIComponent(searchParams.get('subCategory2Id') || '');

  console.log("Received category names:", {
    mainCategoryName,
    subCategory1Name,
    subCategory2Name
  });

  try {
    let Items = [];

    // 필터링 조건을 구성합니다.
    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};
    let params = {
        TableName: PRODUCTS_TABLE_NAME,
    };

    // GSI 대신 ScanCommand와 FilterExpression을 사용하여 이름 기반 필터링을 구현합니다.
    // 카테고리 ID가 아닌 이름(name)을 기준으로 필터링합니다.
    if (subCategory2Name) {
        // 가장 구체적인 subCategory2 이름으로 필터링
        filterExpressions.push('#subCategory2 = :s2Name');
        expressionAttributeValues[':s2Name'] = subCategory2Name;
        expressionAttributeNames['#subCategory2'] = 'subCategory2';
    } else if (subCategory1Name) {
        // subCategory1 이름으로 필터링
        filterExpressions.push('#subCategory1 = :s1Name');
        expressionAttributeValues[':s1Name'] = subCategory1Name;
        expressionAttributeNames['#subCategory1'] = 'subCategory1';
    } else if (mainCategoryName) {
        // mainCategory 이름으로 필터링
        filterExpressions.push('#mainCategory = :mcName');
        expressionAttributeValues[':mcName'] = mainCategoryName;
        expressionAttributeNames['#mainCategory'] = 'mainCategory';
    }

    if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = expressionAttributeNames;

        // FilterExpression을 사용하여 스캔 수행
        const command = new ScanCommand(params);
        const { Items: scannedItems } = await docClient.send(command);
        Items = scannedItems;
    } else {
        // 어떤 카테고리 이름도 제공되지 않았다면 빈 배열 반환
        return NextResponse.json([], { status: 200 });
    }

    // 반환할 상품 세부 정보 추출 (productId, productName, priceWon, mainImage, calculatedPriceUsd, sku 등)
    // DynamoDB 스키마에 따라 필요한 필드를 선택합니다.
    const productDetails = Items ? Items.map(item => ({ 
        id: item.productId, 
        name: item.productName,
        priceWon: item.priceWon,
        mainImage: item.mainImage,
        calculatedPriceUsd: item.calculatedPriceUsd,
        discount: item.discount || 0, // 할인율이 없을 경우 기본값 0
        sku: item.sku,
    })) : [];

    return NextResponse.json(productDetails, { status: 200 });
  } catch (error) {
    console.error("Error fetching products from DynamoDB:", error);
    // GSI 관련 에러 처리 (이제 Scan을 사용하므로 덜 중요하지만 유지)
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}
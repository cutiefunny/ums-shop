// app/api/products/check/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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
  const mainCategoryName = decodeURIComponent(searchParams.get('mainCategoryId') || '');
  const subCategory1Name = decodeURIComponent(searchParams.get('subCategory1Id') || '');
  const subCategory2Name = decodeURIComponent(searchParams.get('subCategory2Id') || '');

  try {
    let Items = [];
    let params = {
        TableName: PRODUCTS_TABLE_NAME,
    };

    let filterExpressions = [];
    let expressionAttributeValues = {};
    let expressionAttributeNames = {};
    
    if (subCategory2Name) {
        filterExpressions.push('#subCategory2 = :s2Name');
        expressionAttributeValues[':s2Name'] = subCategory2Name;
        expressionAttributeNames['#subCategory2'] = 'subCategory2';
    } else if (subCategory1Name) {
        filterExpressions.push('#subCategory1 = :s1Name');
        expressionAttributeValues[':s1Name'] = subCategory1Name;
        expressionAttributeNames['#subCategory1'] = 'subCategory1';
    } else if (mainCategoryName) {
        filterExpressions.push('#mainCategory = :mcName');
        expressionAttributeValues[':mcName'] = mainCategoryName;
        expressionAttributeNames['#mainCategory'] = 'mainCategory';
    }

    if (filterExpressions.length > 0) {
        params.FilterExpression = filterExpressions.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
        params.ExpressionAttributeNames = expressionAttributeNames;
        
        console.log("--- [Debug 1] Sending ScanCommand with params: ---", JSON.stringify(params, null, 2));
        
        const command = new ScanCommand(params);
        const { Items: scannedItems } = await docClient.send(command);

        console.log("--- [Debug 2] Received raw items from DynamoDB. Count:", scannedItems.length);
        
        Items = scannedItems;

    } else {
        return NextResponse.json([], { status: 200 });
    }

    const productDetails = Items ? Items.map(item => ({ 
        id: item.productId, 
        name: item.productName,
        priceWon: item.priceWon,
        mainImage: item.mainImage,
        calculatedPriceUsd: item.calculatedPriceUsd,
        discount: item.discount || 0,
        sku: item.sku,
        mainCategory: item.mainCategory,
        subCategory1: item.subCategory1,
        subCategory2: item.subCategory2,
    })) : [];

    // 💡 --- 최종 디버깅 로그 추가 ---
    // 💡 프론트엔드로 보내기 직전의 가공된 데이터 최종본을 확인합니다.
    console.log("--- [Debug 3] Final data being sent to frontend: ---", JSON.stringify(productDetails, null, 2));
    // 💡 --- 최종 디버깅 로그 추가 끝 ---

    return NextResponse.json(productDetails, { status: 200 });
  } catch (error) {
    console.error("Error fetching products from DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}
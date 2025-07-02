// app/api/products/check/route.js (GSI 사용 버전)
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
  const mainCategoryId = searchParams.get('mainCategoryId');
  const subCategory1Id = searchParams.get('subCategory1Id');
  const subCategory2Id = searchParams.get('subCategory2Id');

  try {
    let Items = [];

    // GSI를 사용하여 효율적으로 쿼리 (우선순위: sub2 > sub1 > main)
    if (subCategory2Id) {
      const command = new QueryCommand({
        TableName: PRODUCTS_TABLE_NAME,
        IndexName: 'subCategory2Id-productId-index', // GSI 이름
        KeyConditionExpression: 'subCategory2Id = :s2Id',
        ExpressionAttributeValues: {
          ':s2Id': subCategory2Id,
        },
        ProjectionExpression: 'productId, #pName',
        ExpressionAttributeNames: {
            '#pName': 'name'
        }
      });
      const { Items: queriedItems } = await docClient.send(command);
      Items = queriedItems;

    } else if (subCategory1Id) {
      const command = new QueryCommand({
        TableName: PRODUCTS_TABLE_NAME,
        IndexName: 'subCategory1Id-productId-index', // GSI 이름
        KeyConditionExpression: 'subCategory1Id = :s1Id',
        ExpressionAttributeValues: {
          ':s1Id': subCategory1Id,
        },
        ProjectionExpression: 'productId, #pName',
        ExpressionAttributeNames: {
            '#pName': 'name'
        }
      });
      const { Items: queriedItems } = await docClient.send(command);
      Items = queriedItems;

    } else if (mainCategoryId) {
      const command = new QueryCommand({
        TableName: PRODUCTS_TABLE_NAME,
        IndexName: 'mainCategoryId-productId-index', // GSI 이름
        KeyConditionExpression: 'mainCategoryId = :mcId',
        ExpressionAttributeValues: {
          ':mcId': mainCategoryId,
        },
        ProjectionExpression: 'productId, #pName',
        ExpressionAttributeNames: {
            '#pName': 'name'
        }
      });
      const { Items: queriedItems } = await docClient.send(command);
      Items = queriedItems;

    } else {
        // 어떤 카테고리 ID도 제공되지 않았다면 빈 배열 반환
        // 모든 상품을 조회하는 경우 (비효율적)는 여기에 ScanCommand를 사용할 수 있지만 권장하지 않음
        return NextResponse.json([], { status: 200 });
    }
    
    const productDetails = Items ? Items.map(item => ({ id: item.productId, name: item.name })) : [];

    console.log("Fetched product details:", productDetails);

    return NextResponse.json(productDetails, { status: 200 });
  } catch (error) {
    console.error("Error fetching products from DynamoDB:", error);
    // GSI 관련 에러 처리도 필요 (예: GSI가 ACTIVE 상태가 아닐 때)
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}
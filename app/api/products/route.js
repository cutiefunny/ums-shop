// app/api/products/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

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

// GET: 모든 상품 조회
export async function GET() {
  try {
    const command = new ScanCommand({
      TableName: PRODUCTS_TABLE_NAME,
    });
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
    const { id, name, description, price, imageUrl, category, stock } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ message: 'Missing required fields: id, name, price' }, { status: 400 });
    }

    const command = new PutCommand({
      TableName: PRODUCTS_TABLE_NAME,
      Item: {
        id,
        name,
        description,
        price,
        imageUrl,
        category,
        stock,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    await docClient.send(command);
    return NextResponse.json({ message: 'Product created successfully', product: body }, { status: 201 });
  } catch (error) {
    console.error("Error creating product in DynamoDB:", error);
    return NextResponse.json({ message: 'Failed to create product' }, { status: 500 });
  }
}

// 기타 (PUT/DELETE 등은 상품 ID를 이용한 경로로 구현)
// 예: app/api/products/[id]/route.js
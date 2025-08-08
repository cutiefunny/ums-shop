import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION,
    credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
    },
});

const docClient = DynamoDBDocumentClient.from(client);
const PRODUCTS_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_PRODUCTS || 'product-management';
const HISTORY_TABLE_NAME = process.env.NEXT_PUBLIC_DYNAMODB_TABLE_PRODUCT_HISTORY || 'product-history';

// [수정] GET 요청 시 searchTerm 쿼리 파라미터를 사용하여 필터링
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('searchTerm');

    try {
        const command = new ScanCommand({
            TableName: PRODUCTS_TABLE_NAME,
        });
        const response = await docClient.send(command);
        let items = response.Items || [];

        // searchTerm이 있는 경우, 서버에서 결과를 필터링합니다.
        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            items = items.filter(item =>
                (item.productName && item.productName.toLowerCase().includes(lowercasedSearchTerm)) ||
                (item.mainCategory && item.mainCategory.toLowerCase().includes(lowercasedSearchTerm)) ||
                (item.sku && item.sku.toLowerCase().includes(lowercasedSearchTerm))
            );
        }

        return NextResponse.json(items);
    } catch (error) {
        console.error("Error fetching products from DynamoDB:", error);
        return NextResponse.json({ message: "Error fetching products", error: error.message }, { status: 500 });
    }
}


// POST a new product
export async function POST(request) {
    try {
        const body = await request.json();

        // 필수 필드 확인
        const { id, name, price } = body;
        if (!id || !name || !price) {
            return NextResponse.json({ message: "Missing required fields: id, name, price" }, { status: 400 });
        }

        const timestamp = new Date().toISOString();
        
        // productId가 제공되지 않은 경우, id(SKU)를 사용
        const productId = body.productId || id;

        const newItem = {
            productId: productId,
            createdAt: timestamp,
            updatedAt: timestamp,
            ...body,
        };

        // 이미지 필드가 문자열이 아닌 경우를 대비한 방어 코드
        if (typeof newItem.mainImage !== 'string' && newItem.mainImage !== null) {
            console.warn("mainImage is not a string, converting to null");
            newItem.mainImage = null;
        }
        if (!Array.isArray(newItem.subImages)) {
            console.warn("subImages is not an array, converting to empty array");
            newItem.subImages = [];
        }

        const putCommand = new PutCommand({
            TableName: PRODUCTS_TABLE_NAME,
            Item: newItem,
        });

        await docClient.send(putCommand);

        /*
        const historyItem = {
            historyId: uuidv4(),
            productId: productId,
            timestamp: timestamp,
            event: 'Product Created',
            details: `Product '${name}' was created.`,
            changedBy: 'Admin', // 실제로는 인증된 사용자 정보 사용
            newState: newItem,
        };

        const historyCommand = new PutCommand({
            TableName: HISTORY_TABLE_NAME,
            Item: historyItem,
        });
        await docClient.send(historyCommand);
        */
        
        return NextResponse.json({ message: "Product created successfully", item: newItem }, { status: 201 });

    } catch (error) {
        console.error("Error creating product in DynamoDB:", error);
        return NextResponse.json({ message: "Error creating product", error: error.message, type: error.constructor.name }, { status: 500 });
    }
}
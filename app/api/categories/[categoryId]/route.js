import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

// AWS SDK v3 설정
const client = new DynamoDBClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const docClient = DynamoDBDocumentClient.from(client);

// 각 테이블의 환경 변수 이름 변경 및 기본값 설정
const TABLE_MAIN_CATEGORIES = process.env.DYNAMODB_TABLE_MAIN_CATEGORIES || 'category-main';
const TABLE_SUB1_CATEGORIES = process.env.DYNAMODB_TABLE_SUB1_CATEGORIES || 'category-sub1';
const TABLE_SUB2_CATEGORIES = process.env.DYNAMODB_TABLE_SUB2_CATEGORIES || 'category-sub2';

/**
 * 헬퍼 함수: categoryId에 따라 해당하는 테이블 이름과 PK 속성 이름을 반환
 * @param {string} categoryId - 조회하려는 카테고리 ID
 * @returns {{tableName: string, pkName: string, pkValue: string}}
 */
function getCategoryTableInfo(categoryId) {
    if (categoryId.includes('-sub2-')) {
        return {
            tableName: TABLE_SUB2_CATEGORIES,
            pkName: 'subCategory2Id',
            pkValue: categoryId
        };
    } else if (categoryId.includes('-sub1-')) {
        return {
            tableName: TABLE_SUB1_CATEGORIES,
            pkName: 'subCategory1Id',
            pkValue: categoryId
        };
    } else {
        return {
            tableName: TABLE_MAIN_CATEGORIES,
            pkName: 'categoryId',
            pkValue: categoryId
        };
    }
}

/**
 * GET handler to retrieve a single category item from its specific table.
 */
export async function GET(request, { params }) {
    const categoryId = params.categoryId;
    const { tableName, pkName, pkValue } = getCategoryTableInfo(categoryId);

    try {
        const command = new GetCommand({
            TableName: tableName,
            Key: {
                [pkName]: pkValue, // 동적 키 이름 사용
            },
        });
        const { Item } = await docClient.send(command);

        if (!Item) {
            return NextResponse.json({ message: `Category with ID ${categoryId} not found.` }, { status: 404 });
        }

        return NextResponse.json(Item, { status: 200 });

    } catch (error) {
        console.error(`DynamoDB GET for ${categoryId} error:`, error);
        return NextResponse.json({ message: `Failed to fetch category ${categoryId}`, error: error.message }, { status: 500 });
    }
}

/**
 * PUT handler to update a single category item.
 */
export async function PUT(request, { params }) {
    const categoryId = params.categoryId;
    // --- 여기부터 수정된 부분 ---
    const { name, status, order, code } = await request.json(); // 'code'를 request body에서 추출

    if (name === undefined && status === undefined && order === undefined && code === undefined) {
        return NextResponse.json({ message: 'No update values provided.' }, { status: 400 });
    }
    // --- 여기까지 수정된 부분 ---

    const { tableName, pkName, pkValue } = getCategoryTableInfo(categoryId);

    try {
        const updates = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        console.log(`Updating category ${categoryId} in table ${tableName} with values:`, { name, status, order, code });

        if (name !== undefined) {
            updates.push('#nm = :nameVal');
            expressionAttributeNames['#nm'] = 'name';
            expressionAttributeValues[':nameVal'] = name;
        }
        if (status !== undefined) {
            updates.push('#st = :statusVal');
            expressionAttributeNames['#st'] = 'status';
            expressionAttributeValues[':statusVal'] = status;
        }
        if (order !== undefined) {
            updates.push('#ord = :orderVal');
            expressionAttributeNames['#ord'] = 'order';
            expressionAttributeValues[':orderVal'] = Number(order);
        }
        // --- 여기부터 수정된 부분 ---
        if (code !== undefined) {
            updates.push('#cd = :codeVal');
            expressionAttributeNames['#cd'] = 'code';
            expressionAttributeValues[':codeVal'] = code;
        }
        // --- 여기까지 수정된 부분 ---
        
        const updateExpression = 'SET ' + updates.join(', ');

        const command = new UpdateCommand({
            TableName: tableName,
            Key: {
                [pkName]: pkValue,
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: 'ALL_NEW',
        });

        const { Attributes } = await docClient.send(command);
        return NextResponse.json(Attributes, { status: 200 });

    } catch (error) {
        console.error(`DynamoDB PUT for ${categoryId} error:`, error);
        return NextResponse.json({ message: `Failed to update category ${categoryId}`, error: error.message }, { status: 500 });
    }
}

/**
 * DELETE handler to delete a single category item.
 */
export async function DELETE(request, { params }) {
    const categoryId = params.categoryId;
    const { tableName, pkName, pkValue } = getCategoryTableInfo(categoryId);

    try {
        const command = new DeleteCommand({
            TableName: tableName,
            Key: {
                [pkName]: pkValue,
            },
        });
        await docClient.send(command);

        return NextResponse.json({ message: `Category ${categoryId} deleted successfully from ${tableName}.` }, { status: 200 });

    } catch (error) {
        console.error(`DynamoDB DELETE for ${categoryId} error:`, error);
        return NextResponse.json({ message: `Failed to delete category ${categoryId}`, error: error.message }, { status: 500 });
    }
}
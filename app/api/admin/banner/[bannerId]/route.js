// /api/admin/banner/[bannerId]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_BANNER || 'banner';

/**
 * GET 요청 처리: 특정 배너 상세 데이터를 조회합니다.
 */
export async function GET(request, { params }) {
    const { bannerId } = params; // 함수 시작 시 bannerId 추출
    try {
        if (!bannerId) {
            return NextResponse.json({ message: 'Missing banner ID' }, { status: 400 });
        }

        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                bannerId: bannerId,
            },
        });

        const { Item } = await ddbDocClient.send(command);

        if (!Item) {
            return NextResponse.json({ message: 'Banner not found' }, { status: 404 });
        }

        return NextResponse.json(Item, { status: 200 });
    } catch (error) {
        // 추출된 bannerId 변수 사용
        console.error(`Error fetching banner ${bannerId} from DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to fetch banner details', error: error.message }, { status: 500 });
    }
}

/**
 * PUT 요청 처리: 특정 배너 데이터를 업데이트합니다.
 */
export async function PUT(request, { params }) {
    const { bannerId } = params; // 함수 시작 시 bannerId 추출
    try {
        const body = await request.json();

        if (!bannerId) {
            return NextResponse.json({ message: 'Missing banner ID' }, { status: 400 });
        }
        
        // 업데이트할 필드 키 목록 (파티션 키 제외)
        const updateKeys = Object.keys(body).filter(k => k !== 'bannerId');

        if (updateKeys.length === 0) {
            return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
        }
        
        // ✨ [수정됨] 안전하게 UpdateExpression 생성
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        
        const updateExpressions = updateKeys.map(key => {
            const nameKey = `#${key}`;
            const valueKey = `:${key}`;
            expressionAttributeNames[nameKey] = key;
            expressionAttributeValues[valueKey] = key === 'order' ? Number(body[key]) : body[key];
            return `${nameKey} = ${valueKey}`;
        });

        const updateExpression = `SET ${updateExpressions.join(', ')}`;

        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                bannerId: bannerId,
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
        });

        const { Attributes } = await ddbDocClient.send(updateCommand);
        return NextResponse.json({ message: 'Banner updated successfully', banner: Attributes }, { status: 200 });
    } catch (error) {
        // ✨ [수정됨] 추출된 bannerId 변수 사용
        console.error(`Error updating banner ${bannerId} in DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to update banner', error: error.message }, { status: 500 });
    }
}

/**
 * DELETE 요청 처리: 특정 배너 데이터를 삭제합니다.
 */
export async function DELETE(request, { params }) {
    const { bannerId } = params; // 함수 시작 시 bannerId 추출
    try {
        if (!bannerId) {
            return NextResponse.json({ message: 'Missing banner ID' }, { status: 400 });
        }

        const command = new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                bannerId: bannerId,
            },
        });
        await ddbDocClient.send(command);

        return NextResponse.json({ message: 'Banner deleted successfully' }, { status: 200 });
    } catch (error) {
        // 추출된 bannerId 변수 사용
        console.error(`Error deleting banner ${bannerId} from DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to delete banner', error: error.message }, { status: 500 });
    }
}
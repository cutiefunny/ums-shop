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
    try {
        const { bannerId } = params;

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
        console.error(`Error fetching banner ${params.bannerId} from DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to fetch banner details', error: error.message }, { status: 500 });
    }
}

/**
 * PUT 요청 처리: 특정 배너 데이터를 업데이트합니다.
 * ✨ 새로운 모달의 모든 필드(startDate, endDate, exposureType, isPriority 등)를 처리하도록 수정되었습니다.
 */
export async function PUT(request, { params }) {
    try {
        const { bannerId } = params;
        const body = await request.json();

        if (!bannerId) {
            return NextResponse.json({ message: 'Missing banner ID' }, { status: 400 });
        }
        
        // 업데이트할 필드가 하나도 없으면 에러 처리
        if (Object.keys(body).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
        }
        
        // DynamoDB UpdateExpression 동적 생성
        let updateExpression = 'SET';
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};

        // body에 포함된 모든 키에 대해 업데이트 구문 생성
        Object.keys(body).forEach((key, index) => {
            if (key === 'bannerId') return; // 파티션 키는 업데이트하지 않음

            const attributeKey = `#${key}`;
            const valueKey = `:${key}`;
            
            updateExpression += ` ${attributeKey} = ${valueKey}`;
            if (index < Object.keys(body).filter(k => k !== 'bannerId').length - 1) {
                updateExpression += ',';
            }

            expressionAttributeNames[attributeKey] = key;

            // 'order' 필드는 숫자로, 그 외 필드는 받은 값 그대로 사용 (JSON이 boolean 등 타입 처리)
            expressionAttributeValues[valueKey] = key === 'order' ? Number(body[key]) : body[key];
        });

        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                bannerId: bannerId,
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
        });

        const { Attributes } = await ddbDocClient.send(updateCommand);
        return NextResponse.json({ message: 'Banner updated successfully', banner: Attributes }, { status: 200 });
    } catch (error) {
        console.error(`Error updating banner ${params.bannerId} in DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to update banner', error: error.message }, { status: 500 });
    }
}

/**
 * DELETE 요청 처리: 특정 배너 데이터를 삭제합니다.
 */
export async function DELETE(request, { params }) {
    try {
        const { bannerId } = params;

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
        console.error(`Error deleting banner ${params.bannerId} from DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to delete banner', error: error.message }, { status: 500 });
    }
}
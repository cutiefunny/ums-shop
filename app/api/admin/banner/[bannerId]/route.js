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
 * URL: /api/admin/banner/[bannerId]
 * @param {Request} request
 * @param {{params: {bannerId: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 배너 상세 데이터 또는 오류 응답
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
                bannerId: bannerId, // 배너 테이블의 파티션 키: bannerId (String)
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
 * @param {Request} request
 * @param {{params: {bannerId: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 업데이트된 배너 데이터 또는 오류 응답
 */
export async function PUT(request, { params }) {
    try {
        const { bannerId } = params;
        const body = await request.json(); // 업데이트할 데이터 (order, imageUrl, link, location, status 등)

        if (!bannerId) {
            return NextResponse.json({ message: 'Missing banner ID' }, { status: 400 });
        }

        let UpdateExpression = 'SET';
        const ExpressionAttributeNames = {};
        const ExpressionAttributeValues = {};
        let first = true;

        for (const key in body) {
            if (key === 'bannerId') continue; // PK는 업데이트 대상에서 제외

            if (!first) {
                UpdateExpression += ',';
            }
            UpdateExpression += ` #${key} = :${key}`;
            ExpressionAttributeNames[`#${key}`] = key;
            
            // 'order' 필드는 숫자로 변환하여 저장
            ExpressionAttributeValues[`:${key}`] = key === 'order' ? Number(body[key]) : body[key];
            first = false;
        }

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
        }

        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                bannerId: bannerId,
            },
            UpdateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
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
 * @param {Request} request
 * @param {{params: {bannerId: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 삭제 결과 또는 오류 응답
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
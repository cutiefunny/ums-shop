// /api/admin/q-and-a/[id]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2', // 예: 서울 리전
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_Q_AND_A || 'q-and-a'; // DynamoDB 테이블 이름

/**
 * GET 요청 처리: 특정 Q&A 상세 데이터를 조회합니다.
 * URL: /api/admin/q-and-a/[id]
 * @param {Request} request - 요청 객체
 * @param {{params: {id: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} Q&A 상세 데이터 또는 오류 응답
 */
export async function GET(request, { params }) {
    try {
        const { id } = params;

        if (!id) {
            return NextResponse.json({ message: 'Missing Q&A ID' }, { status: 400 });
        }

        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                id: id, // Q&A 테이블의 파티션 키: id (String)
            },
        });

        const { Item } = await ddbDocClient.send(command);

        if (!Item) {
            return NextResponse.json({ message: 'Q&A not found' }, { status: 404 });
        }

        return NextResponse.json(Item, { status: 200 });
    } catch (error) {
        console.error(`Error fetching Q&A ${params.id} from DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to fetch Q&A details', error: error.message }, { status: 500 });
    }
}

/**
 * PUT 요청 처리: 특정 Q&A 데이터를 업데이트합니다 (답변 및 상태 변경).
 * URL: /api/admin/q-and-a/[id]
 * @param {Request} request - 요청 객체 (업데이트할 데이터 포함)
 * @param {{params: {id: string}}} context - Next.js 동적 라우트 파라미터
 * @returns {NextResponse} 업데이트된 Q&A 데이터 또는 오류 응답
 */
export async function PUT(request, { params }) {
    try {
        const { id } = params;
        const { answer, status } = await request.json(); // answer와 status 필드만 받음

        if (!id) {
            return NextResponse.json({ message: 'Missing Q&A ID' }, { status: 400 });
        }

        // 업데이트할 필드들을 포함하는 객체
        const updateFields = {
            answer: answer,
            status: status,
            updatedAt: new Date().toISOString(), // 업데이트 시간 기록
        };

        let UpdateExpression = 'SET';
        const ExpressionAttributeNames = {};
        const ExpressionAttributeValues = {};
        let first = true;

        for (const key in updateFields) {
            if (!first) {
                UpdateExpression += ',';
            }
            UpdateExpression += ` #${key} = :${key}`;
            ExpressionAttributeNames[`#${key}`] = key;
            ExpressionAttributeValues[`:${key}`] = updateFields[key];
            first = false;
        }

        if (Object.keys(updateFields).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
        }

        const updateCommand = new UpdateCommand({
            TableName: TABLE_NAME,
            Key: {
                id: id, // Q&A 테이블의 파티션 키: id (String)
            },
            UpdateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ReturnValues: "ALL_NEW", // 업데이트된 항목의 모든 속성을 반환
        });

        const { Attributes } = await ddbDocClient.send(updateCommand);
        return NextResponse.json({ message: 'Q&A updated successfully', qna: Attributes }, { status: 200 });
    } catch (error) {
        console.error(`Error updating Q&A ${params.id} in DynamoDB:`, error);
        return NextResponse.json({ message: 'Failed to update Q&A', error: error.message }, { status: 500 });
    }
}
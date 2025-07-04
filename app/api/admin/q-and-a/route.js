// /api/admin/q-and-a/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2', // 예: 서울 리전
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_Q_AND_A || 'q-and-a'; // DynamoDB 테이블 이름

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const searchTerm = searchParams.get('search');
        const categoryFilter = searchParams.get('category');
        const statusFilter = searchParams.get('status');

        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        if (searchTerm) {
            // 이름 또는 제목에 검색어가 포함된 경우 (Contains 사용)
            filterExpressions.push(`contains(#name, :searchTerm) OR contains(#title, :searchTerm)`);
            expressionAttributeValues[':searchTerm'] = searchTerm;
            expressionAttributeNames['#name'] = 'name';
            expressionAttributeNames['#title'] = 'title';
        }

        if (categoryFilter) {
            filterExpressions.push(`category = :categoryFilter`);
            expressionAttributeValues[':categoryFilter'] = categoryFilter;
        }

        if (statusFilter) {
            filterExpressions.push(`#status = :statusFilter`);
            expressionAttributeValues[':statusFilter'] = statusFilter;
            expressionAttributeNames['#status'] = 'status'; // 'status'는 예약어일 수 있으므로 #status로 사용
        }

        let params = {
            TableName: TABLE_NAME,
        };

        if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
            // ExpressionAttributeNames는 필요한 경우에만 추가
            if (Object.keys(expressionAttributeNames).length > 0) {
                params.ExpressionAttributeNames = expressionAttributeNames;
            }
        }

        // 전체 데이터를 스캔 (대규모 데이터셋에서는 비효율적, 실제 서비스에서는 Query 또는 Index 사용 고려)
        const command = new ScanCommand(params);
        const data = await ddbDocClient.send(command);

        // 페이지네이션 로직 (클라이언트 측에서 필터링된 전체 데이터에 대해 적용)
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const paginatedItems = data.Items.slice(startIndex, endIndex);

        // TODO: 실제 총 페이지 수를 계산하여 반환해야 합니다.
        // 현재는 전체 스캔 후 클라이언트에서 페이지네이션하므로 data.Items.length를 사용
        const totalItems = data.Items.length;
        const totalPages = Math.ceil(totalItems / limit);

        return NextResponse.json({
            items: paginatedItems,
            totalItems: totalItems,
            totalPages: totalPages,
            currentPage: page,
        });

    } catch (error) {
        console.error('Error fetching Q&A data:', error);
        return NextResponse.json(
            { message: 'Failed to fetch Q&A data', error: error.message },
            { status: 500 }
        );
    }
}
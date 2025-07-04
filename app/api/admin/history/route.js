// /api/admin/history/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history';

/**
 * GET 요청 처리: 활동 내역 데이터를 조회하고 필터링 및 페이지네이션을 적용합니다.
 * @param {Request} request
 * @returns {NextResponse} 활동 내역 데이터 목록 또는 오류 응답
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '5', 10); // 프론트와 동일하게 5개로 설정
        const searchTerm = searchParams.get('search'); // manager 또는 details 검색
        const dateFilter = searchParams.get('date'); // YYYY-MM-DD
        const actionTypeFilter = searchParams.get('actionType');

        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        // 검색어 필터링 (manager 또는 details)
        if (searchTerm) {
            filterExpressions.push(`(contains(#manager, :searchTerm) OR contains(#details, :searchTerm))`);
            expressionAttributeValues[':searchTerm'] = searchTerm;
            expressionAttributeNames['#manager'] = 'manager';
            expressionAttributeNames['#details'] = 'details';
        }

        // 날짜 필터링 (timestamp의 YYYY-MM-DD 부분만 일치하는지 확인)
        if (dateFilter) {
            // DynamoDB의 `timestamp`가 ISO 8601 문자열이라고 가정하고,
            // 해당 문자열이 `dateFilter`로 시작하는지 확인합니다.
            // 예: timestamp '2025-05-17T14:22:00.000Z' 와 dateFilter '2025-05-17' 비교
            filterExpressions.push(`begins_with(#timestamp, :dateFilter)`);
            expressionAttributeValues[':dateFilter'] = dateFilter;
            expressionAttributeNames['#timestamp'] = 'timestamp';
        }

        // Action Type 필터링
        if (actionTypeFilter && actionTypeFilter !== 'All') {
            filterExpressions.push(`#actionType = :actionTypeFilter`);
            expressionAttributeValues[':actionTypeFilter'] = actionTypeFilter;
            expressionAttributeNames['#actionType'] = 'actionType';
        }

        const params = {
            TableName: TABLE_NAME,
        };

        if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
            // 필요한 경우에만 ExpressionAttributeNames 추가
            if (Object.keys(expressionAttributeNames).length > 0) {
                 params.ExpressionAttributeNames = expressionAttributeNames;
            }
        }

        // DynamoDB Scan은 전체 테이블을 읽기 때문에, 대규모 데이터셋에서는 Query 또는 GSI 사용을 고려해야 합니다.
        // 현재는 필터링을 위해 Scan을 사용합니다.
        const command = new ScanCommand(params);
        const data = await ddbDocClient.send(command);

        const allItems = data.Items || [];

        // 정렬: 가장 최신 활동이 먼저 오도록 timestamp 기준으로 내림차순 정렬
        allItems.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);
            return dateB.getTime() - dateA.getTime();
        });

        // 페이지네이션 적용
        const totalItems = allItems.length;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = allItems.slice(startIndex, endIndex);

        return NextResponse.json({
            items: paginatedItems,
            totalItems: totalItems,
            totalPages: totalPages,
            currentPage: page,
        }, { status: 200 });

    } catch (error) {
        console.error('Error fetching history from DynamoDB:', error);
        return NextResponse.json({ message: 'Failed to fetch history', error: error.message }, { status: 500 });
    }
}
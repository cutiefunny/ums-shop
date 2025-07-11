// /api/admin/q-and-a/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb'; // PutCommand 추가
import { v4 as uuidv4 } from 'uuid'; // uuidv4 추가

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

/**
 * POST 요청 처리: 새 Q&A 항목을 생성합니다.
 * @param {Request} request - 요청 객체 (category, title, question, imageUrl, name, userEmail, shipName 포함)
 * @returns {NextResponse} 생성된 Q&A 항목 또는 오류 응답
 */
export async function POST(request) {
    try {
        const { category, title, question, imageUrl, name, userEmail, shipName } = await request.json();

        // 필수 필드 유효성 검사
        if (!category || !title || !question || !name || !userEmail) {
            return NextResponse.json({ message: 'Missing required fields for Q&A submission.' }, { status: 400 });
        }

        const newQnAItem = {
            id: uuidv4(), // 고유 ID 생성
            category: category,
            title: title,
            question: question,
            imageUrl: imageUrl || null, // 이미지가 없으면 null
            name: name, // 사용자 이름
            userEmail: userEmail, // 사용자 이메일
            shipName: shipName || null, // 선박명 (선택 사항)
            status: 'Pending', // 초기 상태는 'Pending'
            submittedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD 형식으로 저장
            createdAt: new Date().toISOString(), // 생성 타임스탬프
            updatedAt: new Date().toISOString(), // 업데이트 타임스탬프
            answer: null, // 답변 필드 초기화
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: newQnAItem,
        });
        await ddbDocClient.send(command);

        return NextResponse.json({ message: 'Question submitted successfully', qna: newQnAItem }, { status: 201 });

    } catch (error) {
        console.error('Error submitting Q&A:', error);
        return NextResponse.json({ message: 'Failed to submit question', error: error.message }, { status: 500 });
    }
}

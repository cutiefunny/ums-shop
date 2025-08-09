// /api/admin/banner/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

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
 * GET 요청: 모든 배너 데이터를 조회하고 필터링합니다.
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');
        const locationFilter = searchParams.get('location');

        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        // 검색 필드를 link 뿐만 아니라 다른 필드도 포함하도록 확장할 수 있습니다.
        if (searchTerm) {
            filterExpressions.push(`contains(#link, :searchTerm)`);
            expressionAttributeValues[':searchTerm'] = searchTerm;
            expressionAttributeNames['#link'] = 'link';
        }

        if (locationFilter && locationFilter !== 'All') {
            filterExpressions.push(`#location = :locationFilter`);
            expressionAttributeValues[':locationFilter'] = locationFilter;
            expressionAttributeNames['#location'] = 'location';
        }

        const params = {
            TableName: TABLE_NAME,
        };

        if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
            params.ExpressionAttributeNames = expressionAttributeNames;
        }

        const command = new ScanCommand(params);
        const { Items } = await ddbDocClient.send(command);

        return NextResponse.json(Items || [], { status: 200 });
    } catch (error) {
        console.error('Error fetching banners from DynamoDB:', error);
        return NextResponse.json({ message: 'Failed to fetch banners', error: error.message }, { status: 500 });
    }
}

/**
 * POST 요청: 새 배너를 추가합니다.
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const {
            order, link, location, status, imageUrl,
            startDate, endDate, exposureType, isPriority,
            pageType, productId, categoryId // 추가된 필드
        } = body;

        // 필수 필드 유효성 검사 수정
        if (!order || !location || !status || !imageUrl || !startDate || !endDate) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }
        
        // 노출 방식에 따른 링크 유효성 검사
        if ((exposureType === '외부 링크' || exposureType === '내부 페이지') && !link) {
            return NextResponse.json({ message: 'Link is required for the selected exposure type.' }, { status: 400 });
        }

        const newBanner = {
            bannerId: uuidv4(),
            order: Number(order),
            imageUrl: imageUrl,
            link: link || '', // "없음"일 경우 빈 문자열로 저장
            location: location,
            uploadedDate: new Date().toISOString(),
            status: status,
            startDate: startDate,
            endDate: endDate,
            exposureType: exposureType,
            isPriority: isPriority,
            // 추가된 필드 저장
            pageType: pageType,
            productId: productId,
            categoryId: categoryId
        };

        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: newBanner,
        });
        await ddbDocClient.send(command);

        return NextResponse.json({ message: 'Banner added successfully', banner: newBanner }, { status: 201 });
    } catch (error) {
        console.error('Error adding banner:', error);
        return NextResponse.json({ message: 'Failed to add banner', error: error.message }, { status: 500 });
    }
}
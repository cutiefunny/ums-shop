// /api/admin/banner/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'; // Presigned POST URL 생성용
import { v4 as uuidv4 } from 'uuid'; // UUID 생성용

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_BANNER || 'banner';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ums-shop-storage'; // S3 버킷 이름, 환경 변수로 설정 가능

/**
 * GET 요청 처리: 모든 배너 데이터를 조회하고 필터링합니다.
 * @param {Request} request
 * @returns {NextResponse} 배너 데이터 목록 또는 오류 응답
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const searchTerm = searchParams.get('search');
        const locationFilter = searchParams.get('location');

        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        if (searchTerm) {
            filterExpressions.push(`contains(#link, :searchTerm) OR contains(#location, :searchTerm)`); // 링크 또는 위치로 검색
            expressionAttributeValues[':searchTerm'] = searchTerm;
            expressionAttributeNames['#link'] = 'link';
            expressionAttributeNames['#location'] = 'location';
        }

        if (locationFilter && locationFilter !== 'All') {
            filterExpressions.push(`#location = :locationFilter`);
            expressionAttributeValues[':locationFilter'] = locationFilter;
            expressionAttributeNames['#location'] = 'location'; // 이미 정의됨
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
 * POST 요청 처리: 새 배너를 추가합니다. 이미지 S3 업로드도 처리합니다.
 * @param {Request} request
 * @returns {NextResponse} 생성된 배너 데이터 또는 오류 응답
 */
export async function POST(request) {
    try {
        const body = await request.json(); // JSON 본문 파싱
        const { order, link, location, status, imageUrl } = body;

        if (!order || !link || !location || !status || !imageUrl) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const newBanner = {
            bannerId: uuidv4(),
            order: Number(order), // 숫자로 저장
            imageUrl: imageUrl, // S3 업로드 후 받은 URL
            link: link,
            location: location,
            uploadedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            status: status,
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
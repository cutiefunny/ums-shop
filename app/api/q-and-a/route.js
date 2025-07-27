// /app/api/q-and-a/route.js (App Router 기준)

// 이 코드는 예시이며, 실제 인증 및 데이터베이스 로직이 필요합니다.
// 예를 들어, JWT 토큰에서 user email을 추출하거나, 세션 정보를 사용해야 합니다.
// DynamoDB 예시:
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { NextResponse } from 'next/server'; // App Router의 경우

const client = new DynamoDBClient({
    region: process.env.AWS_REGION, // 서버 환경 변수 사용
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const docClient = DynamoDBDocumentClient.from(client);

const QNA_TABLE_NAME = process.env.DYNAMODB_TABLE_Q_AND_A || 'q-and-a';

export async function GET(request) {

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
        return NextResponse.json({ message: 'User email is required' }, { status: 400 });
    }

    const params = {
        TableName: QNA_TABLE_NAME,
        IndexName: "UserEmailIndex", // userEmail에 대한 GSI가 있다고 가정
        KeyConditionExpression: "userEmail = :userEmail",
        ExpressionAttributeValues: {
            ":userEmail": userEmail,
        },
        ScanIndexForward: false, // 최신순 정렬 (Date 필드를 timestamp로 사용한다면)
    };

    try {
        const command = new QueryCommand(params);
        const data = await docClient.send(command);
        return NextResponse.json({ items: data.Items || [] });
    } catch (error) {
        console.error("Error fetching user Q&A from DynamoDB:", error);
        return NextResponse.json({ message: 'Failed to fetch user Q&A', error: error.message }, { status: 500 });
    }
}
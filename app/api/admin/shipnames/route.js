// app/api/admin/shipnames/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  logger: console, // SDK 로깅 활성화
});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_FOR_SHIPNAMES = process.env.DYNAMODB_TABLE_ORDER_ITEMS || 'order-items';

/**
 * GET handler for /api/admin/shipnames
 * 선박명 드롭다운에 채울 선박명 목록을 제공합니다.
 * GSI 'shipName-index'를 사용하여 스캔합니다.
 *
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const shipNames = new Set();
    let lastEvaluatedKey = null; // 초기에는 null

    do {
      const scanParams = {
        TableName: TABLE_FOR_SHIPNAMES,
        IndexName: 'shipName-index', // GSI 이름 지정
        ProjectionExpression: 'shipName', // shipName 필드만 가져옵니다.
      };

      // lastEvaluatedKey가 null이 아닌 경우에만 ExclusiveStartKey를 포함합니다.
      // 이렇게 하면 첫 번째 스캔에서는 ExclusiveStartKey가 포함되지 않습니다.
      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }
      
      const command = new ScanCommand(scanParams);
      let response;
      try {
          response = await docClient.send(command);
      } catch (sendError) {
          console.error("Error directly from docClient.send(command):", sendError);
          throw sendError; 
      }
      
      const { Items, LastEvaluatedKey } = response || {}; 

      if (Items) {
        Items.forEach(item => {
          if (item.shipName) {
            shipNames.add(item.shipName);
          }
        });
      }
      lastEvaluatedKey = LastEvaluatedKey;
    } while (lastEvaluatedKey); // LastEvaluatedKey가 null 또는 undefined가 될 때까지 반복

    return NextResponse.json(Array.from(shipNames).sort(), { status: 200 });
  } catch (error) {
    console.error("Error fetching unique ship names from DynamoDB (caught high-level):", error);
    
    if (error.name === 'ResourceNotFoundException') {
        return NextResponse.json({ message: `DynamoDB 테이블 또는 GSI '${TABLE_FOR_SHIPNAMES}/shipName-index'를 찾을 수 없습니다. 이름이 정확한지 확인해주세요.`, error: error.message }, { status: 404 });
    }
    if (error.name === 'AccessDeniedException') {
        return NextResponse.json({ message: `DynamoDB 테이블 또는 GSI '${TABLE_FOR_SHIPNAMES}/shipName-index'에 접근 권한이 없습니다. IAM 권한을 확인해주세요.`, error: error.message }, { status: 403 });
    }
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        return NextResponse.json({ message: `GSI 'shipName-index'가 없거나 ACTIVE 상태가 아닙니다. 인덱스 설정을 확인해주세요.`, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ message: 'Failed to fetch ship names due to an unexpected error', error: error.message }, { status: 500 });
  }
}
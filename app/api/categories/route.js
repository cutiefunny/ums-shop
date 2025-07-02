// app/api/categories/route.js

import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // S3 업로드를 위해 추가
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // S3 프리사인드 URL을 위해 추가

import { v4 as uuidv4 } from 'uuid'; // 고유 ID 생성을 위해

// AWS SDK v3 설정
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// S3 클라이언트 설정 (이미지 업로드용)
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// 각 테이블의 환경 변수 이름 변경 및 기본값 설정
const TABLE_MAIN_CATEGORIES = process.env.DYNAMODB_TABLE_MAIN_CATEGORIES || 'category-main';
const TABLE_SUB1_CATEGORIES = process.env.DYNAMODB_TABLE_SUB1_CATEGORIES || 'category-sub1';
const TABLE_SUB2_CATEGORIES = process.env.DYNAMODB_TABLE_SUB2_CATEGORIES || 'category-sub2';

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME; // .env.local에 S3 버킷 이름 추가 필요

/**
 * GET handler to retrieve categories based on level (main, surve1, surve2).
 * Query parameters:
 * - level: 'main', 'surve1', or 'surve2'
 * - parentId: Optional. Used to query subcategories under a specific parent.
 *
 * Example:
 * GET /api/categories?level=main
 * GET /api/categories?level=surve1&parentId=health-wellness
 * GET /api/categories?level=surve2&parentId=health-wellness-sub1-1
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const parentId = searchParams.get('parentId');

  try {
    let items;

    if (level === 'main') {
      // category-main 테이블에서 모든 메인 카테고리 조회
      // 현재 category-main 테이블에는 GSI가 없으므로 Scan 사용.
      // 대량 데이터 시 비효율적이므로, 필요에 따라 'order'를 정렬 키로 하는 GSI를 추가 고려.
      const command = new ScanCommand({
        TableName: TABLE_MAIN_CATEGORIES,
      });
      const { Items } = await docClient.send(command);

      // 클라이언트에 필요한 형태로 데이터 가공
      // subCategory1Count, subCategory2Count는 이 API가 담당하지 않고,
      // client-side에서 다른 API 호출을 통해 취합하거나 (선호되지 않음),
      // 메인 카테고리에 이 정보를 미리 저장해두거나 (denormalization)
      // 아니면 API가 직접 계산하여 반환하도록 할 수 있습니다.
      // 여기서는 0으로 임시 설정. 실제 필요시 계산 로직 추가.
      items = Items.map(item => ({
        categoryId: item.categoryId,
        name: item.name,
        code: item.code,
        status: item.status,
        order: item.order,
        subCategory1Count: 0, // 이 값을 얻으려면 category-sub1 테이블 쿼리 필요
        subCategory2Count: 0, // 이 값을 얻으려면 category-sub2 테이블 쿼리 필요
      }));

    } else if (level === 'surve1') {
      if (parentId) {
        // category-sub1 테이블에서 mainCategoryId GSI를 사용하여 특정 메인 카테고리의 sub1 조회
        const command = new QueryCommand({
          TableName: TABLE_SUB1_CATEGORIES,
          IndexName: 'mainCategory-order-index', // category-sub1 테이블의 GSI 이름
          KeyConditionExpression: 'mainCategoryId = :mainCatId',
          ExpressionAttributeValues: {
            ':mainCatId': parentId,
          },
          ScanIndexForward: true, // order 필드로 오름차순 정렬 (order GSI에 존재 가정)
        });
        const { Items } = await docClient.send(command);

        items = Items.map(item => ({
          categoryId: item.subCategory1Id, // 클라이언트에서 categoryId로 받으므로 매핑
          name: item.name,
          code: item.code, // sub1에도 code 필드가 있다면 사용
          status: item.status,
          order: item.order,
          subCategory2Count: 0, // 이 값을 얻으려면 category-sub2 테이블 쿼리 필요
        }));

      } else {
        // parentId가 없는 경우, 모든 category-sub1 항목 스캔 (비권장, 대량 데이터 시)
        // 효율성을 위해 특정 메인 카테고리 아래의 sub1만 조회하도록 클라이언트 변경 권장
        const command = new ScanCommand({
          TableName: TABLE_SUB1_CATEGORIES,
        });
        const { Items } = await docClient.send(command);
        items = Items.map(item => ({
          categoryId: item.subCategory1Id,
          name: item.name,
          code: item.code,
          status: item.status,
          order: item.order,
          subCategory2Count: 0,
        }));
      }

    } else if (level === 'surve2') {
      if (parentId) {
        // category-sub2 테이블에서 subCategory1Id GSI를 사용하여 특정 sub1의 sub2 조회
        const command = new QueryCommand({
          TableName: TABLE_SUB2_CATEGORIES,
          IndexName: 'subCategory1-order-index', // category-sub2 테이블의 GSI 이름
          KeyConditionExpression: 'subCategory1Id = :sub1CatId',
          ExpressionAttributeValues: {
            ':sub1CatId': parentId,
          },
          ScanIndexForward: true, // order 필드로 오름차순 정렬 (order GSI에 존재 가정)
        });
        const { Items } = await docClient.send(command);

        items = Items.map(item => ({
          categoryId: item.subCategory2Id, // 클라이언트에서 categoryId로 받으므로 매핑
          name: item.name,
          code: item.code, // sub2에도 code 필드가 있다면 사용
          status: item.status,
          order: item.order,
        }));

      } else {
        // parentId가 없는 경우, 모든 category-sub2 항목 스캔 (비권장, 대량 데이터 시)
        const command = new ScanCommand({
          TableName: TABLE_SUB2_CATEGORIES,
        });
        const { Items } = await docClient.send(command);
        items = Items.map(item => ({
          categoryId: item.subCategory2Id,
          name: item.name,
          code: item.code,
          status: item.status,
          order: item.order,
        }));
      }

    } else {
      return NextResponse.json({ message: 'Invalid category level specified.' }, { status: 400 });
    }

    return NextResponse.json(items, { status: 200 });

  } catch (error) {
    console.error('DynamoDB GET error:', error);
    // GSI 백필링 에러 또는 다른 AWS 에러를 명확히 처리
    if (error.name === 'ValidationException' && error.message.includes('backfilling')) {
      return NextResponse.json({
        message: 'Index is currently backfilling. Please wait until it becomes ACTIVE.',
        error: error.message
      }, { status: 503 }); // 503 Service Unavailable
    }
    return NextResponse.json({ message: 'Failed to fetch categories', error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type');
    const name = formData.get('name');
    const image = formData.get('imageFile'); // File object for main category
    const mainCategoryId = formData.get('mainCategoryId'); // For surve1, surve2
    const surve1CategoryId = formData.get('surve1CategoryId'); // For surve2
    const categoryCode = formData.get('code'); // For surve2

    // Basic validation
    if (!type || !name) {
      return NextResponse.json({ message: 'Category type and name are required.' }, { status: 400 });
    }

    let newItem = {};
    let targetTableName = '';
    let pkName = ''; // Primary Key Name for the target table

    if (type === 'main') {
      targetTableName = TABLE_MAIN_CATEGORIES;
      pkName = 'categoryId';
      
      // 이름 중복 검사
      const isDuplicate = await isCategoryNameDuplicate(targetTableName, name, pkName);
      if (isDuplicate) {
        return NextResponse.json({ message: `메인 카테고리에 '${name}' 항목이 이미 존재합니다.` }, { status: 409 }); // 409 Conflict
      }

      newItem = {
        categoryId: uuidv4(),
        name: name,
        code: categoryCode || '', // Main Category도 code를 가질 수 있도록 변경
        status: 'Active',
        order: 999999, // 대략적인 마지막 순서 (클라이언트에서 정렬 후 조정)
      };

      if (image && image.size > 0) {
        const fileBuffer = Buffer.from(await image.arrayBuffer());
        const fileExtension = image.name.split('.').pop();
        const s3Key = `category-images/main/${newItem.categoryId}.${fileExtension}`;
        
        const s3UploadCommand = new PutObjectCommand({
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: image.type,
        });
        await s3Client.send(s3UploadCommand);
        newItem.imageUrl = `https://${S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
      }

    } else if (type === 'surve1') {
      targetTableName = TABLE_SUB1_CATEGORIES;
      pkName = 'subCategory1Id';

      if (!mainCategoryId) {
        return NextResponse.json({ message: 'mainCategoryId is required for surve1 category.' }, { status: 400 });
      }
      
      // 이름 중복 검사 (같은 mainCategoryId 아래에서만 중복 검사하는 것이 일반적이나,
      // 현재 isCategoryNameDuplicate는 테이블 전체에서 이름 중복 검사)
      // 요구사항에 따라 `code`를 기준으로 중복 검사를 할 수도 있습니다.
      const isDuplicate = await isCategoryNameDuplicate(targetTableName, name, pkName);
      if (isDuplicate) {
        return NextResponse.json({ message: `서브1 카테고리에 '${name}' 항목이 이미 존재합니다.` }, { status: 409 });
      }

      newItem = {
        subCategory1Id: `${mainCategoryId}-sub1-${uuidv4().substring(0, 8)}`, // 더 긴 ID
        name: name,
        mainCategoryId: mainCategoryId,
        code: categoryCode || '', // sub1도 code를 가질 수 있도록 변경
        status: 'Active',
        order: 999999,
      };

    } else if (type === 'surve2') {
      targetTableName = TABLE_SUB2_CATEGORIES;
      pkName = 'subCategory2Id';

      if (!surve1CategoryId || !categoryCode) { // Category Code도 필수
        return NextResponse.json({ message: 'surve1CategoryId and code are required for surve2 category.' }, { status: 400 });
      }

      // 이름 중복 검사
      const isDuplicate = await isCategoryNameDuplicate(targetTableName, name, pkName);
      if (isDuplicate) {
        return NextResponse.json({ message: `서브2 카테고리에 '${name}' 항목이 이미 존재합니다.` }, { status: 409 });
      }
      // 카테고리 코드 중복 검사 (별도)
      // `code` 중복 검사를 위해 `code-index` GSI가 필요합니다.
      const isCodeDuplicate = await isCategoryCodeDuplicate(targetTableName, categoryCode, pkName);
      if (isCodeDuplicate) {
        return NextResponse.json({ message: `Category Code '${categoryCode}' already exists for Surve2.` }, { status: 409 });
      }


      newItem = {
        subCategory2Id: `${surve1CategoryId}-sub2-${uuidv4().substring(0, 8)}`, // 더 긴 ID
        name: name,
        subCategory1Id: surve1CategoryId,
        code: categoryCode,
        status: 'Active',
        order: 999999,
      };

    } else {
      return NextResponse.json({ message: 'Invalid category type.' }, { status: 400 });
    }

    const command = new PutCommand({
      TableName: targetTableName,
      Item: newItem,
    });
    await docClient.send(command);

    return NextResponse.json({ message: `${type} category added successfully`, category: newItem }, { status: 201 });

  } catch (error) {
    console.error('DynamoDB POST error:', error);
    return NextResponse.json({ message: 'Failed to add category', error: error.message }, { status: 500 });
  }
}

async function isCategoryNameDuplicate(tableName, categoryName, pkName) {
  try {
    const command = new QueryCommand({
      TableName: tableName,
      IndexName: 'name-index', // 'name'을 파티션 키로 가지는 GSI 가정
      KeyConditionExpression: '#n = :nameVal',
      ExpressionAttributeNames: {
        '#n': 'name',
      },
      ExpressionAttributeValues: {
        ':nameVal': categoryName,
      },
      Limit: 1, // 하나라도 찾으면 중복이므로 1개만 가져옴
      ProjectionExpression: pkName, // PK만 가져와서 불필요한 데이터 로딩 방지
    });

    const { Items } = await docClient.send(command);
    return Items && Items.length > 0;
  } catch (error) {
    // GSI가 없거나 다른 문제로 쿼리 실패 시, Scan으로 대체 가능 (비효율적)
    if (error.name === 'ValidationException' && error.message.includes('index')) {
        console.warn(`GSI 'name-index' not found for table ${tableName}. Falling back to Scan for duplicate check.`);
        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: '#n = :nameVal',
            ExpressionAttributeNames: {
                '#n': 'name',
            },
            ExpressionAttributeValues: {
                ':nameVal': categoryName,
            },
            Limit: 1,
            ProjectionExpression: pkName,
        });
        const { Items } = await docClient.send(scanCommand);
        return Items && Items.length > 0;
    }
    console.error(`Error checking duplicate name in ${tableName}:`, error);
    throw new Error(`Failed to check duplicate name: ${error.message}`);
  }
}
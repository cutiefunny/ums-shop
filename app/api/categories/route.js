// app/api/categories/route.js

import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // 사용되지 않으므로 제거

import { v4 as uuidv4 } from 'uuid';

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

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * 헬퍼 함수: 카테고리 이름 중복 검사
 * 각 테이블에 'name-index' GSI가 있다고 가정합니다.
 * @param {string} tableName - 중복 검사할 테이블 이름
 * @param {string} categoryName - 검사할 카테고리 이름
 * @param {string} pkName - 테이블의 기본 파티션 키 이름 (categoryId, subCategory1Id, subCategory2Id)
 * @returns {Promise<boolean>} - 중복 여부 (true: 중복, false: 중복 아님)
 */
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
    // 중복 검사 실패 시 에러를 던져서 상위 핸들러에서 처리하도록 함
    throw new Error(`Failed to check duplicate name: ${error.message}`);
  }
}

/**
 * GET handler to retrieve categories based on level (main, surve1, surve2).
 * ... (GET 함수는 이전과 동일)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const parentId = searchParams.get('parentId');

  try {
    let items;

    if (level === 'main') {
      const command = new ScanCommand({
        TableName: TABLE_MAIN_CATEGORIES,
      });
      const { Items } = await docClient.send(command);

      items = Items.map(item => ({
        categoryId: item.categoryId,
        name: item.name,
        code: item.code,
        status: item.status,
        order: item.order,
        subCategory1Count: 0,
        subCategory2Count: 0,
      }));

    } else if (level === 'surve1') {
      if (parentId) {
        const command = new QueryCommand({
          TableName: TABLE_SUB1_CATEGORIES,
          IndexName: 'mainCategory-order-index',
          KeyConditionExpression: 'mainCategoryId = :mainCatId',
          ExpressionAttributeValues: {
            ':mainCatId': parentId,
          },
          ScanIndexForward: true,
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

      } else {
        const command = new ScanCommand({ TableName: TABLE_SUB1_CATEGORIES });
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
        const command = new QueryCommand({
          TableName: TABLE_SUB2_CATEGORIES,
          IndexName: 'subCategory1-order-index',
          KeyConditionExpression: 'subCategory1Id = :sub1CatId',
          ExpressionAttributeValues: {
            ':sub1CatId': parentId,
          },
          ScanIndexForward: true,
        });
        const { Items } = await docClient.send(command);

        items = Items.map(item => ({
          categoryId: item.subCategory2Id,
          name: item.name,
          code: item.code,
          status: item.status,
          order: item.order,
        }));

      } else {
        const command = new ScanCommand({ TableName: TABLE_SUB2_CATEGORIES });
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
    if (error.name === 'ValidationException' && error.message.includes('backfilling')) {
      return NextResponse.json({
        message: 'Index is currently backfilling. Please wait until it becomes ACTIVE.',
        error: error.message
      }, { status: 503 });
    }
    return NextResponse.json({ message: 'Failed to fetch categories', error: error.message }, { status: 500 });
  }
}

/**
 * POST handler to add a new category.
 * This will handle adding main, surve1, surve2 categories to their respective tables.
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const type = formData.get('type');
    const name = formData.get('name');
    const image = formData.get('imageFile'); // File object for main category
    const mainCategoryId = formData.get('mainCategoryId'); // For surve1, surve2
    const surve1CategoryId = formData.get('surve1CategoryId'); // For surve2
    const categoryCode = formData.get('code'); // For all categories now

    // Basic validation
    if (!type || !name) {
      return NextResponse.json({ message: 'Category type and name are required.' }, { status: 400 });
    }

    let newItem = {};
    let targetTableName = '';
    let pkName = ''; 

    if (type === 'main') {
      targetTableName = TABLE_MAIN_CATEGORIES;
      pkName = 'categoryId';
      
      // 이름 중복 검사 (Main Category에만 적용)
      const isDuplicateName = await isCategoryNameDuplicate(targetTableName, name, pkName);
      if (isDuplicateName) {
        return NextResponse.json({ message: `메인 카테고리에 '${name}' 항목이 이미 존재합니다.` }, { status: 409 });
      }

      newItem = {
        categoryId: uuidv4(),
        name: name,
        code: categoryCode || '', 
        status: 'Active',
        order: 999999,
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
      
      // Surve1 카테고리는 이름 중복 검사를 하지 않습니다.
      // 필요하다면, mainCategoryId + name 조합으로 중복 검사를 할 수 있습니다.

      newItem = {
        subCategory1Id: `${mainCategoryId}-sub1-${uuidv4().substring(0, 8)}`,
        name: name,
        mainCategoryId: mainCategoryId,
        code: categoryCode || '', 
        status: 'Active',
        order: 999999,
      };

    } else if (type === 'surve2') {
      targetTableName = TABLE_SUB2_CATEGORIES;
      pkName = 'subCategory2Id';

      if (!surve1CategoryId) {
        return NextResponse.json({ message: 'surve1CategoryId is required for surve2 category.' }, { status: 400 });
      }

      // Surve2 카테고리는 이름 중복 검사를 하지 않습니다.
      // 필요하다면, subCategory1Id + name 조합으로 중복 검사를 할 수 있습니다.
 
      newItem = {
        subCategory2Id: `${surve1CategoryId}-sub2-${uuidv4().substring(0, 8)}`,
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
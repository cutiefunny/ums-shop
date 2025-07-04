// /api/admin/manager/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { hashPassword } from '@/utils/auth'; // 비밀번호 해싱 유틸리티 임포트
import { v4 as uuidv4 } from 'uuid'; // uuidv4 추가

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const ddbDocClient = DynamoDBDocumentClient.from(client);

const ADMIN_USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_ADMIN_USERS || 'admin-users';
const HISTORY_TABLE_NAME = process.env.DYNAMODB_TABLE_HISTORY || 'history';

/**
 * 헬퍼 함수: 이메일 중복 검사 (email-index GSI 사용 가정)
 */
async function isEmailDuplicate(email, excludeUsername = null) {
    try {
        const command = new QueryCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            IndexName: 'email-index', // email을 PK로 하는 GSI가 있어야 함
            KeyConditionExpression: 'email = :emailVal',
            ExpressionAttributeValues: {
                ':emailVal': email,
            },
        });
        const { Items } = await ddbDocClient.send(command);
        // 수정 모드일 경우, 현재 수정 중인 관리자 본인의 이메일은 중복으로 간주하지 않음
        if (excludeUsername) {
            return Items && Items.some(item => item.email === email && item.username !== excludeUsername);
        }
        return Items && Items.length > 0;
    } catch (error) {
        console.error("Error checking email duplication:", error);
        // GSI가 없거나 다른 문제로 쿼리 실패 시, 스캔으로 대체 가능 (비효율적)
        if (error.name === 'ValidationException' && error.message.includes('index')) {
            console.warn(`GSI 'email-index' not found. Falling back to Scan for email duplicate check.`);
            const scanCommand = new ScanCommand({
                TableName: ADMIN_USERS_TABLE_NAME,
                FilterExpression: 'email = :emailVal',
                ExpressionAttributeValues: {
                    ':emailVal': email,
                },
            });
            const { Items } = await ddbDocClient.send(scanCommand);
            if (excludeUsername) {
                return Items && Items.some(item => item.email === email && item.username !== excludeUsername);
            }
            return Items && Items.length > 0;
        }
        throw error; // 다른 예측 못한 오류는 다시 던짐
    }
}


/**
 * GET 요청 처리: 관리자 목록을 조회하고 필터링합니다.
 * @param {Request} request
 * @returns {NextResponse} 관리자 데이터 목록 또는 오류 응답
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const searchTerm = searchParams.get('search'); // 이름 또는 이메일 검색
        const roleFilter = searchParams.get('role'); // 역할 필터

        let filterExpressions = [];
        let expressionAttributeValues = {};
        let expressionAttributeNames = {};

        if (searchTerm) {
            filterExpressions.push(`(contains(#name, :searchTerm) OR contains(email, :searchTerm))`);
            expressionAttributeValues[':searchTerm'] = searchTerm;
            expressionAttributeNames['#name'] = 'name';
        }

        if (roleFilter && roleFilter !== 'All') {
            filterExpressions.push(` #role = :roleFilter`);
            expressionAttributeValues[':roleFilter'] = roleFilter;
            expressionAttributeNames['#role'] = 'role';
        }

        const params = {
            TableName: ADMIN_USERS_TABLE_NAME,
        };

        if (filterExpressions.length > 0) {
            params.FilterExpression = filterExpressions.join(' AND ');
            params.ExpressionAttributeValues = expressionAttributeValues;
            if (Object.keys(expressionAttributeNames).length > 0) {
                 params.ExpressionAttributeNames = expressionAttributeNames;
            }
        }

        const command = new ScanCommand(params);
        const data = await ddbDocClient.send(command);

        const allItems = data.Items || [];

        // 정렬 (예: 이름 순으로 정렬)
        allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        // 페이지네이션
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
        console.error('Error fetching managers:', error);
        return NextResponse.json({ message: 'Failed to fetch managers', error: error.message }, { status: 500 });
    }
}

/**
 * POST 요청 처리: 새 관리자 계정을 생성합니다.
 * @param {Request} request
 * @returns {NextResponse} 생성된 관리자 계정 또는 오류 응답
 */
export async function POST(request) {
    try {
        const { name, email, password, role, canManageProduct, canManageOrder, canManagePacking, canManageUserApproval, canManageQnA, canManageBanner } = await request.json();

        // 필수 필드 유효성 검사
        if (!name || !email || !password || !role) {
            return NextResponse.json({ message: 'Name, email, password, and role are required' }, { status: 400 });
        }

        // 이메일 중복 확인
        const emailExists = await isEmailDuplicate(email);
        if (emailExists) {
            return NextResponse.json({ message: 'This email is already registered.' }, { status: 409 });
        }

        const hashedPassword = await hashPassword(password); // 비밀번호 해싱

        const newManager = {
            username: email, // 이메일을 PK로 사용 (로그인 계정)
            name: name,
            email: email,
            passwordHash: hashedPassword,
            role: role,
            status: 'Active', // 기본 활성 상태
            createdAt: new Date().toISOString(),
            lastLogin: null, // 초기 로그인 시간 없음
            // 권한 필드
            canManageProduct: canManageProduct || false,
            canManageOrder: canManageOrder || false,
            canManagePacking: canManagePacking || false,
            canManageUserApproval: canManageUserApproval || false,
            canManageQnA: canManageQnA || false,
            canManageBanner: canManageBanner || false,
        };

        const command = new PutCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Item: newManager,
        });
        await ddbDocClient.send(command);

        // History 테이블에 기록
        const historyItem = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
            deviceInfo: "백엔드 API (Manager Creation)", // TODO: 클라이언트 기기 정보로 대체
            actionType: "관리자 계정 생성",
            details: `새 관리자 '${name}' (이메일: ${email}, 역할: ${role}) 계정이 생성되었습니다.`,
        };
        const putHistoryCommand = new PutCommand({
            TableName: HISTORY_TABLE_NAME,
            Item: historyItem,
        });
        await ddbDocClient.send(putHistoryCommand);

        return NextResponse.json({ message: 'Manager created successfully', manager: newManager }, { status: 201 });
    } catch (error) {
        console.error('Error creating manager:', error);
        return NextResponse.json({ message: 'Failed to create manager', error: error.message }, { status: 500 });
    }
}
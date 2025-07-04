// /api/admin/manager/[username]/route.js
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'; // PutCommand, QueryCommand 추가
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
        if (excludeUsername) {
            return Items && Items.some(item => item.email === email && item.username !== excludeUsername);
        }
        return Items && Items.length > 0;
    } catch (error) {
        console.error("Error checking email duplication (in [username]/route):", error);
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
 * GET 요청 처리: 특정 관리자 계정을 조회합니다.
 * @param {Request} request
 * @param {{params: {username: string}}} context
 * @returns {NextResponse} 관리자 계정 데이터 또는 오류 응답
 */
export async function GET(request, { params }) {
    try {
        const { username } = params;
        if (!username) {
            return NextResponse.json({ message: 'Missing username' }, { status: 400 });
        }

        const command = new GetCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Key: { username: username },
        });
        const { Item } = await ddbDocClient.send(command);

        if (!Item) {
            return NextResponse.json({ message: 'Manager not found' }, { status: 404 });
        }
        return NextResponse.json(Item, { status: 200 });
    } catch (error) {
        console.error(`Error fetching manager ${params.username}:`, error);
        return NextResponse.json({ message: 'Failed to fetch manager', error: error.message }, { status: 500 });
    }
}

/**
 * PUT 요청 처리: 특정 관리자 계정을 업데이트합니다.
 * @param {Request} request
 * @param {{params: {username: string}}} context
 * @returns {NextResponse} 업데이트된 관리자 계정 또는 오류 응답
 */
export async function PUT(request, { params }) {
    try {
        const { username } = params;
        const body = await request.json(); // name, email, password, role, permissions...

        if (!username) {
            return NextResponse.json({ message: 'Missing username' }, { status: 400 });
        }

        // 비밀번호가 포함되어 있다면 해싱
        if (body.password) {
            body.passwordHash = await hashPassword(body.password);
            delete body.password; // 원본 비밀번호는 삭제
        }

        // 이메일 변경 시 중복 확인
        if (body.email && body.email !== username) { // username이 이메일(PK)이므로, 변경 시에만 체크
            const emailExists = await isEmailDuplicate(body.email, username);
            if (emailExists) {
                return NextResponse.json({ message: 'This email is already registered by another account.' }, { status: 409 });
            }
            // PK(username)를 변경하는 것은 PUT이 아니라 DELETE 후 CREATE에 해당
            // 현재 설계는 username(email)을 PK로 사용하므로, email 변경은 허용하지 않음
            // 프론트엔드에서 email 필드를 disabled 처리하는 것이 일반적
            return NextResponse.json({ message: 'Email (username) cannot be changed directly via PUT request. Please create a new account if email needs to be changed.' }, { status: 400 });
        }


        let UpdateExpression = 'SET';
        const ExpressionAttributeNames = {};
        const ExpressionAttributeValues = {};
        let first = true;

        // body에서 받은 필드들을 UpdateExpression에 추가
        for (const key in body) {
            if (!first) {
                UpdateExpression += ',';
            }
            UpdateExpression += ` #${key} = :${key}`;
            ExpressionAttributeNames[`#${key}`] = key;
            ExpressionAttributeValues[`:${key}`] = body[key];
            first = false;
        }

        // updatedAt 필드 자동 업데이트
        if (!UpdateExpression.includes('#updatedAt')) {
            if (!first) UpdateExpression += ',';
            UpdateExpression += ' #updatedAt = :updatedAt';
            ExpressionAttributeNames['#updatedAt'] = 'updatedAt';
            ExpressionAttributeValues[':updatedAt'] = new Date().toISOString();
        }

        if (Object.keys(body).length === 0) {
            return NextResponse.json({ message: 'No fields provided for update' }, { status: 400 });
        }

        const updateCommand = new UpdateCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Key: { username: username },
            UpdateExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ReturnValues: "ALL_NEW",
        });

        const { Attributes } = await ddbDocClient.send(updateCommand);

        // History 테이블에 기록
        let details = `관리자 '${Attributes?.name || username}' 계정이 수정되었습니다.`;
        // TODO: 변경된 특정 필드를 비교하여 details에 추가할 수 있음

        const historyItem = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
            deviceInfo: "백엔드 API (Manager Update)", // TODO: 클라이언트 기기 정보로 대체
            actionType: "관리자 계정 수정",
            details: details,
        };
        const putHistoryCommand = new PutCommand({
            TableName: HISTORY_TABLE_NAME,
            Item: historyItem,
        });
        await ddbDocClient.send(putHistoryCommand);

        return NextResponse.json({ message: 'Manager updated successfully', manager: Attributes }, { status: 200 });
    } catch (error) {
        console.error(`Error updating manager ${params.username}:`, error);
        return NextResponse.json({ message: 'Failed to update manager', error: error.message }, { status: 500 });
    }
}

/**
 * DELETE 요청 처리: 특정 관리자 계정을 삭제합니다.
 * @param {Request} request
 * @param {{params: {username: string}}} context
 * @returns {NextResponse} 삭제 결과 또는 오류 응답
 */
export async function DELETE(request, { params }) {
    try {
        const { username } = params;
        if (!username) {
            return NextResponse.json({ message: 'Missing username' }, { status: 400 });
        }

        // 삭제될 관리자 정보 미리 가져오기
        const getCommand = new GetCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Key: { username: username },
        });
        const { Item: deletedManager } = await ddbDocClient.send(getCommand);


        const command = new DeleteCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Key: { username: username },
        });
        await ddbDocClient.send(command);

        // History 테이블에 기록
        const historyItem = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            manager: "시스템 관리자", // TODO: 실제 로그인한 관리자 정보로 대체
            deviceInfo: "백엔드 API (Manager Deletion)", // TODO: 클라이언트 기기 정보로 대체
            actionType: "관리자 계정 삭제",
            details: `관리자 '${deletedManager?.name || username}' 계정 (이메일: ${deletedManager?.email || 'N/A'})이(가) 삭제되었습니다.`,
        };
        const putHistoryCommand = new PutCommand({
            TableName: HISTORY_TABLE_NAME,
            Item: historyItem,
        });
        await ddbDocClient.send(putHistoryCommand);

        return NextResponse.json({ message: 'Manager deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error(`Error deleting manager ${params.username}:`, error);
        return NextResponse.json({ message: 'Failed to delete manager', error: error.message }, { status: 500 });
    }
}
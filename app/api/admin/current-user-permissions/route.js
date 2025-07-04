// /api/admin/current-user-permissions/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/utils/jwt'; // JWT 검증 유틸리티
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'ap-northeast-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

const ADMIN_USERS_TABLE_NAME = process.env.DYNAMODB_TABLE_ADMIN_USERS || 'admin-users';

/**
 * GET 요청 처리: 현재 로그인한 관리자의 권한 정보를 반환합니다.
 * 이 API는 클라이언트에서 호출되어 HttpOnly 쿠키의 유효성을 확인하고
 * 해당 관리자의 상세 권한 데이터를 가져옵니다.
 * @returns {NextResponse} 관리자 권한 정보 또는 오류 응답
 */
export async function GET() {
    try {
        const cookieStore = cookies();
        const token = cookieStore.get('admin_jwt')?.value;

        if (!token) {
            return NextResponse.json({ message: 'Unauthorized: No token' }, { status: 401 });
        }

        const decodedToken = await verifyToken(token);

        if (!decodedToken || !decodedToken.userId) {
            // 토큰이 유효하지 않거나 userId가 없는 경우
            const response = NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
            // 유효하지 않은 토큰인 경우 쿠키를 삭제
            response.headers.set('Set-Cookie', `admin_jwt=; Path=/; Max-Age=0; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict`);
            return response;
        }

        // DynamoDB에서 관리자 정보 조회
        const getCommand = new GetCommand({
            TableName: ADMIN_USERS_TABLE_NAME,
            Key: { username: decodedToken.userId }, // username이 PK라고 가정
        });
        const { Item: adminUser } = await ddbDocClient.send(getCommand);

        if (!adminUser) {
            // 토큰은 유효하지만 DB에 관리자 정보가 없는 경우
            const response = NextResponse.json({ message: 'Unauthorized: User not found' }, { status: 401 });
            response.headers.set('Set-Cookie', `admin_jwt=; Path=/; Max-Age=0; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict`);
            return response;
        }

        // 관리자의 권한 필드만 추출하여 반환
        const permissions = {
            role: adminUser.role,
            canManageProduct: adminUser.canManageProduct || false,
            canManageOrder: adminUser.canManageOrder || false,
            canManagePacking: adminUser.canManagePacking || false,
            canManageUserApproval: adminUser.canManageUserApproval || false,
            canManageQnA: adminUser.canManageQnA || false,
            canManageBanner: adminUser.canManageBanner || false,
            canAccessHistory: adminUser.canAccessHistory || false, // History 접근 권한 추가
            canAccessManager: adminUser.canAccessManager || false, // Manager 접근 권한 추가
            // 필요한 다른 권한 필드 추가
        };

        return NextResponse.json(permissions, { status: 200 });

    } catch (error) {
        console.error('Error fetching admin permissions:', error);
        return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
    }
}

// app/api/s3-upload-url/route.js
import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

const s3Client = new S3Client({
  region: process.env.AWS_REGION, // .env.local 또는 Vercel 환경 변수
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ums-shop-storage';

/**
 * GET 요청 처리: S3 Presigned URL을 생성하여 반환합니다.
 * @param {Request} request - 요청 객체 (filename 쿼리 파라미터 포함)
 * @returns {NextResponse} Presigned URL 및 필드 데이터 또는 오류 응답
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ message: 'Filename is required' }, { status: 400 });
    }

    // 파일 확장자 추출 및 고유한 파일 이름 생성
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: S3_BUCKET_NAME,
      Key: `uploads/${uniqueFilename}`, // S3 버킷 내의 경로
      Expires: 600, // URL 유효 시간 (초)
      Fields: {
        'Content-Type': 'image/*', // 이미지 타입만 허용
      },
      Conditions: [
        ['content-length-range', 0, 5 * 1024 * 1024], // 최대 5MB 파일 크기 제한
        {'Content-Type': 'image/*'},
      ],
    });

    return NextResponse.json({ url, fields }, { status: 200 });
  } catch (error) {
    console.error('Error generating S3 presigned URL:', error);
    return NextResponse.json({ message: 'Failed to generate presigned URL', error: error.message }, { status: 500 });
  }
}

// app/api/s3-upload-url/route.js
import { NextResponse } from 'next/server';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-request-presigner'; // 업로드에 유용
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'; // 다운로드에 유용
import { PutObjectCommand } from '@aws-sdk/client-s3'; // PutObject 사용시

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// GET: 파일 업로드용 Presigned URL 생성 (POST 요청 방식)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const contentType = searchParams.get('contentType');

  if (!filename || !contentType) {
    return NextResponse.json({ message: 'Missing filename or contentType' }, { status: 400 });
  }

  const key = `uploads/<span class="math-inline">\{Date\.now\(\)\}\-</span>{filename}`; // S3에 저장될 경로 및 파일명

  try {
    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Conditions: [
        ['content-length-range', 0, 10485760], // 0 to 10 MB
        { 'Content-Type': contentType },
      ],
      Expires: 3600, // 1시간 (초 단위)
    });
    return NextResponse.json({ url, fields, key }, { status: 200 });
  } catch (error) {
    console.error("Error creating presigned URL:", error);
    return NextResponse.json({ message: 'Failed to create presigned URL' }, { status: 500 });
  }
}

// POST: API Route를 통해 직접 파일 업로드 (선택 사항)
// 이 방식은 파일이 먼저 Next.js 서버로 업로드된 후 S3로 다시 업로드되므로, 대용량 파일에 불리
/*
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const filename = formData.get('filename');
    const contentType = formData.get('contentType');

    if (!file || !filename || !contentType) {
      return NextResponse.json({ message: 'Missing file, filename, or contentType' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `uploads/<span class="math-inline">\{Date\.now\(\)\}\-</span>{filename}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return NextResponse.json({ message: 'File uploaded successfully', key }, { status: 200 });
  } catch (error) {
    console.error("Error uploading file to S3 via API route:", error);
    return NextResponse.json({ message: 'Failed to upload file' }, { status: 500 });
  }
}
*/
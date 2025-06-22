// app/api/s3-download-url/route.js
import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key'); // S3 객체 키

  if (!key) {
    return NextResponse.json({ message: 'Missing S3 object key' }, { status: 400 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1시간 유효

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error("Error creating presigned download URL:", error);
    return NextResponse.json({ message: 'Failed to create presigned download URL' }, { status: 500 });
  }
}
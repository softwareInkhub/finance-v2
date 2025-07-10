import { NextResponse } from 'next/server';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../../aws-client';

export async function POST(request: Request) {
  try {
    const { key, userId } = await request.json();
    if (!key || !userId) {
      return NextResponse.json({ error: 'Missing key or userId' }, { status: 400 });
    }
    
    // Security check: Ensure user can only access files from their own folder
    if (!key.startsWith(`users/${userId}/`)) {
      return NextResponse.json({ error: 'Unauthorized: You can only access your own files' }, { status: 403 });
    }
    
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // 1 minute expiry
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }
} 
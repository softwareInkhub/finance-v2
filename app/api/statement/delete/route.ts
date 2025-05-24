import { NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, s3FileUrl } = await request.json();
    if (!statementId || !s3FileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Extract the key from the s3FileUrl
    const key = s3FileUrl.split('.amazonaws.com/')[1];
    // Delete from S3
    await s3.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
    // Delete from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.BANK_STATEMENTS,
        Key: { id: statementId },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json({ error: 'Failed to delete statement' }, { status: 500 });
  }
} 
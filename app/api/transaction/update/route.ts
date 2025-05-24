import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { transactionId, csv, tags } = await request.json();
    if (!transactionId || !csv) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const key = `transactions/${transactionId}.csv`;
    // Overwrite CSV in S3
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: csv,
      ContentType: 'text/csv',
    }));
    // Optionally update tags in DynamoDB
    if (tags) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLES.TRANSACTIONS || 'transactions',
          Key: { id: transactionId },
          UpdateExpression: 'SET #tags = :tags',
          ExpressionAttributeNames: { '#tags': 'tags' },
          ExpressionAttributeValues: { ':tags': tags },
        })
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
} 
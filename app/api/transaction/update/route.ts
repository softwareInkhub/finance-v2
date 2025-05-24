import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { transactionId, transactionData } = await request.json();
    if (!transactionId || !transactionData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // transactionData should have tags as an array for each row (tags: string[])
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        Key: { id: transactionId },
        UpdateExpression: 'SET #transactionData = :transactionData',
        ExpressionAttributeNames: { '#transactionData': 'transactionData' },
        ExpressionAttributeValues: { ':transactionData': transactionData },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
} 
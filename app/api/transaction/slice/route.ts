import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const transactionId = uuidv4();
    const key = `transactions/${transactionId}.csv`;
    // Upload CSV to S3
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: csv,
      ContentType: 'text/csv',
    }));
    const s3FileUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
    // Save metadata to DynamoDB
    const transaction = {
      id: transactionId,
      statementId,
      bankId,
      accountId,
      startRow,
      endRow,
      s3FileUrl,
      createdAt: new Date().toISOString(),
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        Item: transaction,
      })
    );
    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error saving transaction slice:', error);
    return NextResponse.json({ error: 'Failed to save transaction slice' }, { status: 500 });
  }
} 
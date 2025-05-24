import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, tags = [], fileName } = await request.json();
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
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    // Clean parsed data to remove empty string keys and add tags array
    const cleanedData = (parsed.data as Record<string, string>[]).map(obj => {
      const cleaned: Record<string, string | string[]> = {};
      for (const key in obj) {
        if (key && key.trim() !== '' && key !== 'tag' && key !== 'tags') cleaned[key] = obj[key];
      }
      cleaned['tags'] = [];
      return cleaned;
    });
    // Save metadata and data to DynamoDB
    const transaction = {
      id: transactionId,
      statementId,
      bankId,
      accountId,
      startRow,
      endRow,
      s3FileUrl,
      fileName: fileName || '',
      transactionData: cleanedData,
      tags,
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
import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, TABLES, S3_BUCKET } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs'; // Required for file uploads in Next.js API routes

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const bankId = formData.get('bankId');
    const accountId = formData.get('accountId');
    const fileName = formData.get('fileName');
    const userId = formData.get('userId');
    if (!file || typeof file === 'string' || !bankId || !accountId) {
      return NextResponse.json({ error: 'Missing file, bankId, or accountId' }, { status: 400 });
    }
    const statementId = uuidv4();
    let baseFileName = typeof fileName === 'string' && fileName.trim() ? fileName.trim() : `${statementId}.csv`;
    if (!baseFileName.endsWith('.csv')) baseFileName += '.csv';
    const key = `statements/${baseFileName}`;
    // Upload file to S3
    const arrayBuffer = await file.arrayBuffer();
    await s3.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: Buffer.from(arrayBuffer),
      ContentType: 'text/csv',
    }));
    // Save metadata to DynamoDB
    const s3FileUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
    const statement = {
      id: statementId,
      bankId,
      accountId,
      s3FileUrl,
      fileName: baseFileName,
      transactionHeader: [],
      transactionData: [],
      tags: [],
      userId: userId || '',
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.BANK_STATEMENTS,
        Item: statement,
      })
    );
    return NextResponse.json(statement);
  } catch (error) {
    console.error('Error uploading statement:', error);
    return NextResponse.json({ error: 'Failed to upload statement' }, { status: 500 });
  }
} 
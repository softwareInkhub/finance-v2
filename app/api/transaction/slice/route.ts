import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { csv, statementId, startRow, endRow, bankId, accountId, tags = [], fileName, userId, bankName, accountName } = await request.json();
    if (!csv || !statementId || startRow == null || endRow == null || !bankId || !accountId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Parse CSV to array of objects
    const parsed = Papa.parse(csv, { header: true });
    const rows = parsed.data as Record<string, string>[];
    const now = new Date().toISOString();
    // Save each row as a separate transaction item
    const putPromises = rows.map((row) => {
      // Clean row and add extra fields
      const cleaned: Record<string, any> = {};
      for (const key in row) {
        if (key && key.trim() !== '' && key !== 'tag' && key !== 'tags') cleaned[key] = row[key];
      }
      cleaned['tags'] = [];
      cleaned['userId'] = userId || '';
      cleaned['bankId'] = bankId;
      cleaned['bankName'] = bankName || '';
      cleaned['accountId'] = accountId;
      cleaned['accountName'] = accountName || '';
      cleaned['statementId'] = statementId;
      cleaned['fileName'] = fileName || '';
      cleaned['createdAt'] = now;
      cleaned['id'] = uuidv4();
      return docClient.send(new PutCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        Item: cleaned,
      }));
    });
    await Promise.all(putPromises);
    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    console.error('Error saving transaction slice:', error);
    return NextResponse.json({ error: 'Failed to save transaction slice' }, { status: 500 });
  }
} 
import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';

// GET /api/transactions?accountId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  if (!accountId) {
    return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
  }
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        FilterExpression: 'accountId = :accountId',
        ExpressionAttributeValues: { ':accountId': accountId },
      })
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
} 
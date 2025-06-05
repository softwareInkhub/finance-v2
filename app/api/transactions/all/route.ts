import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

// GET /api/transactions/all
export async function GET() {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
      })
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch all transactions' }, { status: 500 });
  }
} 
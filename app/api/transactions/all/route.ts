import { NextResponse } from 'next/server';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

// GET /api/transactions/all?userId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  try {
    const params: ScanCommandInput = {
      TableName: TABLES.TRANSACTIONS || 'transactions',
    };
    if (userId) {
      params.FilterExpression = 'userId = :userId';
      params.ExpressionAttributeValues = { ':userId': userId };
    }
    const result = await docClient.send(
      new ScanCommand(params)
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch all transactions' }, { status: 500 });
  }
} 
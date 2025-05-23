import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';

// GET /api/account?bankId=xxx
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bankId = searchParams.get('bankId');
  if (!bankId) {
    return NextResponse.json({ error: 'bankId is required' }, { status: 400 });
  }
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.ACCOUNTS,
        FilterExpression: 'bankId = :bankId',
        ExpressionAttributeValues: { ':bankId': bankId },
      })
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// POST /api/account
export async function POST(request: Request) {
  try {
    const { bankId, accountHolderName, accountNumber, ifscCode, tags } = await request.json();
    if (!bankId || !accountHolderName || !accountNumber || !ifscCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    const id = uuidv4();
    const account = {
      id,
      bankId,
      accountHolderName,
      accountNumber,
      ifscCode,
      tags: Array.isArray(tags) ? tags : [],
    };
    await docClient.send(
      new PutCommand({
        TableName: TABLES.ACCOUNTS,
        Item: account,
      })
    );
    return NextResponse.json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
} 
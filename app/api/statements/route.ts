import { NextResponse } from 'next/server';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';

// GET /api/statements?accountId=xxx&userId=yyy
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');
  const userId = searchParams.get('userId');
  if (!accountId && !userId) {
    return NextResponse.json({ error: 'accountId or userId is required' }, { status: 400 });
  }
  try {
    let filterExpression = '';
    const expressionAttributeValues: Record<string, string> = {};
    if (accountId && userId) {
      filterExpression = 'accountId = :accountId AND userId = :userId';
      expressionAttributeValues[':accountId'] = accountId;
      expressionAttributeValues[':userId'] = userId;
    } else if (accountId) {
      filterExpression = 'accountId = :accountId';
      expressionAttributeValues[':accountId'] = accountId;
    } else if (userId) {
      filterExpression = 'userId = :userId';
      expressionAttributeValues[':userId'] = userId;
    }
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching statements:', error);
    return NextResponse.json({ error: 'Failed to fetch statements' }, { status: 500 });
  }
} 
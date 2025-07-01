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

    // Fetch all tags to populate tag data
    const tagsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TAGS || 'tags',
      })
    );
    const allTags = tagsResult.Items || [];
    const tagsMap = new Map(allTags.map(tag => [tag.id, tag]));

    // Populate tag data for each transaction (handle both string IDs and full objects)
    const transactions = (result.Items || []).map(transaction => {
      if (Array.isArray(transaction.tags)) {
        transaction.tags = transaction.tags
          .map(tag => typeof tag === 'string' ? tagsMap.get(tag) : tag)
          .filter(Boolean);
      }
      return transaction;
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch all transactions' }, { status: 500 });
  }
} 
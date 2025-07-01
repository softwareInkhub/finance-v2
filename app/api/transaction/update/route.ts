import { NextResponse } from 'next/server';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { transactionId, transactionData, tags } = body;
    if (!transactionId || (!transactionData && !tags)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // Build the update expression dynamically
    const updateFields = [];
    const exprAttrNames: Record<string, string> = {};
    const exprAttrValues: Record<string, string | number | string[]> = {};
    if (transactionData) {
      for (const f of Object.keys(transactionData)) {
        updateFields.push(f);
        exprAttrNames[`#${f}`] = f;
        exprAttrValues[`:${f}`] = transactionData[f];
      }
    }
    if (tags) {
      // Extract only tag IDs from the tags array
      const tagIds = Array.isArray(tags) 
        ? tags.map(tag => typeof tag === 'string' ? tag : tag.id).filter(Boolean)
        : [];
      updateFields.push('tags');
      exprAttrNames['#tags'] = 'tags';
      exprAttrValues[':tags'] = tagIds;
    }
    const updateExpr = 'SET ' + updateFields.map(f => `#${f} = :${f}`).join(', ');
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        Key: { id: transactionId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
} 
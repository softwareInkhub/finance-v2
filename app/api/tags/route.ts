import { NextResponse } from 'next/server';
import { ScanCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// GET /api/tags
export async function GET() {
  try {
    const result = await docClient.send(
      new ScanCommand({ TableName: TABLES.TAGS })
    );
    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/tags
export async function POST(request: Request) {
  try {
    const { name, color } = await request.json();
    if (!name) return NextResponse.json({ error: 'Tag name required' }, { status: 400 });
    const tag = {
      id: uuidv4(),
      name,
      color: color || '#60a5fa', // default: light blue
      createdAt: new Date().toISOString(),
    };
    await docClient.send(new PutCommand({ TableName: TABLES.TAGS, Item: tag }));
    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}

// PUT /api/tags
export async function PUT(request: Request) {
  try {
    const { id, name, color } = await request.json();
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });
    await docClient.send(new UpdateCommand({
      TableName: TABLES.TAGS,
      Key: { id },
      UpdateExpression: 'SET #name = :name, #color = :color',
      ExpressionAttributeNames: { '#name': 'name', '#color': 'color' },
      ExpressionAttributeValues: { ':name': name, ':color': color },
    }));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/tags
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Tag id required' }, { status: 400 });
    // 1. Delete the tag itself
    await docClient.send(new DeleteCommand({ TableName: TABLES.TAGS, Key: { id } }));

    // 2. Remove this tag from all transactions
    // Fetch all transactions
    const txResult = await docClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS || 'transactions' }));
    const transactions = Array.isArray(txResult.Items) ? txResult.Items : [];
    // For each transaction, if it has this tag, remove it and update
    const updatePromises = transactions.map(async (tx) => {
      if (!Array.isArray(tx.tags) || tx.tags.length === 0) return;
      const newTags = tx.tags.filter((t) => t.id !== id);
      if (newTags.length === tx.tags.length) return; // no change
      await docClient.send(new UpdateCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        Key: { id: tx.id },
        UpdateExpression: 'SET #tags = :tags',
        ExpressionAttributeNames: { '#tags': 'tags' },
        ExpressionAttributeValues: { ':tags': newTags },
      }));
    });
    await Promise.all(updatePromises);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
} 
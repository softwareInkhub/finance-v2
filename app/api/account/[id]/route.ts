import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

// PUT /api/account/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bankId, accountHolderName, accountNumber, ifscCode, tags, userId } = await request.json();

  if (!bankId || !accountHolderName || !accountNumber || !ifscCode) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const account = {
    id,
    bankId,
    accountHolderName,
    accountNumber,
    ifscCode,
    tags: Array.isArray(tags) ? tags : [],
    userId: userId || '',
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.ACCOUNTS,
      Item: account,
    })
  );

  return NextResponse.json(account);
}

// DELETE /api/account/[id]
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.ACCOUNTS,
      Key: { id },
    })
  );

  return NextResponse.json({ success: true });
} 
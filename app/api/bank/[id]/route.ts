import { NextResponse } from 'next/server';
import { PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../aws-client';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { bankName, tags } = await request.json();

  if (!bankName) {
    return NextResponse.json({ error: 'Bank name is required' }, { status: 400 });
  }

  const bank = {
    id,
    bankName,
    tags: Array.isArray(tags) ? tags : [],
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLES.BANKS,
      Item: bank,
    })
  );

  return NextResponse.json(bank);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLES.BANKS,
      Key: { id },
    })
  );

  return NextResponse.json({ success: true });
} 
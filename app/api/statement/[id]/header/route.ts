import { NextResponse } from 'next/server';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../../aws-client';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { headerRowIndex, transactionStartIndex, transactionEndIndex } = await request.json();
    if (
      typeof headerRowIndex !== 'number' ||
      typeof transactionStartIndex !== 'number' ||
      typeof transactionEndIndex !== 'number'
    ) {
      return NextResponse.json({ error: 'Missing or invalid indices' }, { status: 400 });
    }
    await docClient.send(
      new UpdateCommand({
        TableName: TABLES.BANK_STATEMENTS,
        Key: { id: params.id },
        UpdateExpression: 'SET headerRowIndex = :h, transactionStartIndex = :s, transactionEndIndex = :e',
        ExpressionAttributeValues: {
          ':h': headerRowIndex,
          ':s': transactionStartIndex,
          ':e': transactionEndIndex,
        },
      })
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving header/transaction indices:', error);
    return NextResponse.json({ error: 'Failed to save selection' }, { status: 500 });
  }
} 
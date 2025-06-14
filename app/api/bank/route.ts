import { NextResponse } from 'next/server';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../aws-client';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const result = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANKS,
      })
    );

    return NextResponse.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching banks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { bankName, tags } = await request.json();

    if (!bankName) {
      return NextResponse.json(
        { error: 'Bank name is required' },
        { status: 400 }
      );
    }

    const id = uuidv4();
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
  } catch (error) {
    console.error('Error creating bank:', error);
    return NextResponse.json(
      { error: 'Failed to create bank' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, bankName } = await request.json();
    if (!id || !bankName) {
      return NextResponse.json(
        { error: 'Bank id and new bankName are required' },
        { status: 400 }
      );
    }
    // Fetch the existing bank
    const scanCmd = new ScanCommand({
      TableName: TABLES.BANKS,
      FilterExpression: '#id = :id',
      ExpressionAttributeNames: { '#id': 'id' },
      ExpressionAttributeValues: { ':id': id },
    });
    const result = await docClient.send(scanCmd);
    const bank = result.Items && result.Items[0];
    if (!bank) {
      return NextResponse.json({ error: 'Bank not found' }, { status: 404 });
    }
    // Update the bank name
    bank.bankName = bankName;
    await docClient.send(
      new PutCommand({
        TableName: TABLES.BANKS,
        Item: bank,
      })
    );
    return NextResponse.json({ success: true, bank });
  } catch (error) {
    console.error('Error updating bank name:', error);
    return NextResponse.json(
      { error: 'Failed to update bank name' },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { statementId, s3FileUrl } = await request.json();
    if (!statementId || !s3FileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // First, find and delete all related transactions
    // Look for transactions with matching statementId, fileName, or s3FileUrl
    const transactionResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.TRANSACTIONS || 'transactions',
        FilterExpression: 'statementId = :statementId OR s3FileUrl = :s3FileUrl',
        ExpressionAttributeValues: {
          ':statementId': statementId,
          ':s3FileUrl': s3FileUrl,
        },
      })
    );

    const relatedTransactions = transactionResult.Items || [];
    console.log(`Found ${relatedTransactions.length} related transactions to delete`);

    // Delete all related transactions
    if (relatedTransactions.length > 0) {
      const deletePromises = relatedTransactions.map((transaction) =>
        docClient.send(
          new DeleteCommand({
            TableName: TABLES.TRANSACTIONS || 'transactions',
            Key: { id: transaction.id },
          })
        )
      );
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${relatedTransactions.length} related transactions`);
    }

    // Extract the key from the s3FileUrl
    const key = s3FileUrl.split('.amazonaws.com/')[1];
    
    // Delete from S3
    await s3.send(new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }));
    
    // Delete from DynamoDB
    await docClient.send(
      new DeleteCommand({
        TableName: TABLES.BANK_STATEMENTS,
        Key: { id: statementId },
      })
    );
    
    return NextResponse.json({ 
      success: true, 
      deletedTransactions: relatedTransactions.length 
    });
  } catch (error) {
    console.error('Error deleting statement:', error);
    return NextResponse.json({ error: 'Failed to delete statement' }, { status: 500 });
  }
} 
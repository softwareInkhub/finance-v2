import { NextResponse } from 'next/server';
import { CopyObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, s3, S3_BUCKET, TABLES } from '../aws-client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get all statements for this user
    const statementsResult = await docClient.send(
      new ScanCommand({
        TableName: TABLES.BANK_STATEMENTS,
        FilterExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
    );

    const statements = statementsResult.Items || [];
    const migrationResults = [];

    for (const statement of statements) {
      try {
        const oldKey = statement.s3FileUrl.split('.amazonaws.com/')[1];
        
        // Skip if already in new structure
        if (oldKey.startsWith(`users/${userId}/`)) {
          migrationResults.push({
            statementId: statement.id,
            fileName: statement.fileName,
            status: 'already_migrated',
            message: 'File already in new structure'
          });
          continue;
        }

        // Create new key in user-specific folder
        const newKey = `users/${userId}/statements/${statement.fileName}`;
        
        // Copy file to new location
        await s3.send(new CopyObjectCommand({
          Bucket: S3_BUCKET,
          CopySource: `${S3_BUCKET}/${oldKey}`,
          Key: newKey,
        }));

        // Delete old file
        await s3.send(new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: oldKey,
        }));

        // Update DynamoDB record with new URL
        const newS3FileUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${newKey}`;
        await docClient.send({
          TableName: TABLES.BANK_STATEMENTS,
          Key: { id: statement.id },
          UpdateExpression: 'SET s3FileUrl = :s3FileUrl',
          ExpressionAttributeValues: {
            ':s3FileUrl': newS3FileUrl,
          },
        });

        migrationResults.push({
          statementId: statement.id,
          fileName: statement.fileName,
          status: 'success',
          message: 'File migrated successfully'
        });

      } catch (error) {
        migrationResults.push({
          statementId: statement.id,
          fileName: statement.fileName,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = migrationResults.filter(r => r.status === 'success').length;
    const errorCount = migrationResults.filter(r => r.status === 'error').length;
    const alreadyMigratedCount = migrationResults.filter(r => r.status === 'already_migrated').length;

    return NextResponse.json({
      success: true,
      message: `Migration completed. ${successCount} files migrated, ${errorCount} errors, ${alreadyMigratedCount} already migrated.`,
      results: migrationResults,
      summary: {
        total: statements.length,
        success: successCount,
        error: errorCount,
        alreadyMigrated: alreadyMigratedCount
      }
    });

  } catch (error) {
    console.error('Error during file migration:', error);
    return NextResponse.json({ 
      error: 'Failed to migrate files',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
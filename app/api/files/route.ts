import { NextResponse } from 'next/server';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { s3, S3_BUCKET } from '../aws-client';

export const runtime = 'nodejs';

// GET /api/files?userId=xxx&folder=statements
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const folder = searchParams.get('folder'); // e.g., 'statements'
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }
  try {
    const prefix = folder
      ? `users/${userId}/${folder}/`
      : `users/${userId}/`;
    const delimiter = folder ? undefined : '/';
    const listRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: prefix,
        Delimiter: delimiter,
      })
    );
    if (!folder) {
      // List folders
      const folders = (listRes.CommonPrefixes || []).map((cp) => {
        const parts = cp.Prefix?.split('/').filter(Boolean) || [];
        return parts[2]; // users/{userId}/{folder}/
      }).filter(Boolean);
      return NextResponse.json({ folders });
    } else {
      // List files in the folder
      const files = (listRes.Contents || [])
        .filter(obj => !obj.Key?.endsWith('/'))
        .map(obj => ({
          key: obj.Key,
          fileName: obj.Key?.split('/').pop(),
          lastModified: obj.LastModified,
          size: obj.Size,
          url: `https://${S3_BUCKET}.s3.amazonaws.com/${obj.Key}`,
        }));
      return NextResponse.json({ files });
    }
  } catch (error) {
    console.error('Error listing files/folders:', error);
    return NextResponse.json({ error: 'Failed to list files/folders' }, { status: 500 });
  }
} 
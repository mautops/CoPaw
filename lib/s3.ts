import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET!;

export async function getS3Object(key: string): Promise<{ body: string; contentType: string }> {
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const res = await s3.send(cmd);
  const body = await res.Body!.transformToString('utf-8');
  const contentType = res.ContentType ?? 'application/octet-stream';
  return { body, contentType };
}

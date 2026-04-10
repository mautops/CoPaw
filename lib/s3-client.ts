import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// 从环境变量读取配置
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'https://s3.amazonaws.com';
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || '';
const S3_BUCKET = process.env.S3_BUCKET || 'hi-ops-reports';

// 初始化 S3 客户端
export const s3Client = new S3Client({
  endpoint: S3_ENDPOINT,
  region: S3_REGION,
  credentials: {
    accessKeyId: S3_ACCESS_KEY,
    secretAccessKey: S3_SECRET_KEY,
  },
  forcePathStyle: true, // 兼容 MinIO 等 S3 兼容存储
});

/** 上传文件到 S3 */
export async function uploadToS3(params: {
  key: string;
  content: string;
  contentType?: string;
  bucket?: string;
}): Promise<{ url: string; key: string }> {
  const bucket = params.bucket || S3_BUCKET;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: params.content,
    ContentType: params.contentType || 'text/markdown; charset=utf-8',
  });

  await s3Client.send(command);

  // 返回公开访问 URL(如果 bucket 是公开的)
  const url = `${S3_ENDPOINT}/${bucket}/${params.key}`;

  return { url, key: params.key };
}

/** 生成预签名下载 URL(有效期 1 小时) */
export async function getPresignedDownloadUrl(params: {
  key: string;
  bucket?: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = params.bucket || S3_BUCKET;
  const expiresIn = params.expiresIn || 3600; // 默认 1 小时

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

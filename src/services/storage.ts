import { S3Client } from "bun";
import { config } from "../config";

const s3 = new S3Client({
  accessKeyId: config.S3_ACCESS_KEY,
  secretAccessKey: config.S3_SECRET_KEY,
  bucket: config.S3_BUCKET,
  endpoint: config.S3_ENDPOINT,
  region: config.S3_REGION,
});

export async function uploadVideo(
  localPath: string,
  s3Key: string
): Promise<void> {
  const file = s3.file(s3Key);
  await Bun.write(file, Bun.file(localPath));
}

export function getPresignedUrl(s3Key: string): string {
  return s3.presign(s3Key, {
    expiresIn: config.PRESIGN_EXPIRY_SECONDS,
    method: "GET",
    type: "video/mp4",
  });
}

export async function deleteVideo(s3Key: string): Promise<void> {
  const file = s3.file(s3Key);
  await file.delete();
}

export async function checkS3Connection(): Promise<boolean> {
  try {
    const file = s3.file("_health_check");
    await file.exists();
    return true;
  } catch {
    return false;
  }
}

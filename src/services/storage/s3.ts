import { S3Client } from "bun";
import { config } from "../../config";

const s3 = new S3Client({
	accessKeyId: config.S3_ACCESS_KEY,
	secretAccessKey: config.S3_SECRET_KEY,
	bucket: config.S3_BUCKET,
	endpoint: config.S3_ENDPOINT,
	region: config.S3_REGION,
});

export const s3Storage = {
	async upload(localPath: string, key: string): Promise<void> {
		await Bun.write(s3.file(key), Bun.file(localPath));
	},

	getUrl(key: string): string {
		return s3.presign(key, {
			expiresIn: config.PRESIGN_EXPIRY_SECONDS,
			method: "GET",
			type: "video/mp4",
		});
	},

	async delete(key: string): Promise<void> {
		await s3.file(key).delete();
	},

	async check(): Promise<boolean> {
		try {
			await s3.file("_health_check").exists();
			return true;
		} catch {
			return false;
		}
	},
};

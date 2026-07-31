import { config } from "../../config";
import { diskStorage } from "./local";
import { s3Storage } from "./s3";

interface StorageBackend {
	upload(localPath: string, key: string): Promise<void>;
	getUrl(key: string): string;
	delete(key: string): Promise<void>;
	check(): Promise<boolean>;
}

const backend: StorageBackend =
	config.STORAGE_DRIVER === "local" ? diskStorage : s3Storage;

export function uploadVideo(localPath: string, key: string): Promise<void> {
	return backend.upload(localPath, key);
}

export function getVideoUrl(key: string): string {
	return backend.getUrl(key);
}

export function deleteVideo(key: string): Promise<void> {
	return backend.delete(key);
}

export function checkStorageConnection(): Promise<boolean> {
	return backend.check();
}

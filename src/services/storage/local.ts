import { createHmac, timingSafeEqual } from "node:crypto";
import { access, constants, mkdir, rm } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { config } from "../../config";

const root = resolve(config.LOCAL_STORAGE_DIR);

export function resolveKeyPath(key: string): string {
	const full = resolve(root, key);
	if (!full.startsWith(root + sep)) {
		throw new Error(`Invalid storage key: ${key}`);
	}
	return full;
}

function sign(key: string, expiresAt: number): string {
	return createHmac("sha256", config.LOCAL_STORAGE_SECRET)
		.update(`${key}:${expiresAt}`)
		.digest("hex");
}

export function verifySignature(
	key: string,
	exp: string | undefined,
	sig: string | undefined,
): boolean {
	if (!exp || !sig) return false;

	const expiresAt = Number(exp);
	if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) {
		return false;
	}

	const expected = Buffer.from(sign(key, expiresAt), "hex");
	const actual = Buffer.from(sig, "hex");
	if (expected.length !== actual.length) return false;

	return timingSafeEqual(expected, actual);
}

export const diskStorage = {
	async upload(localPath: string, key: string): Promise<void> {
		const dest = resolveKeyPath(key);
		await mkdir(dirname(dest), { recursive: true });
		await Bun.write(dest, Bun.file(localPath));
	},

	getUrl(key: string): string {
		const expiresAt =
			Math.floor(Date.now() / 1000) + config.PRESIGN_EXPIRY_SECONDS;
		return `/files/${key}?exp=${expiresAt}&sig=${sign(key, expiresAt)}`;
	},

	async delete(key: string): Promise<void> {
		await rm(resolveKeyPath(key), { force: true });
	},

	async check(): Promise<boolean> {
		try {
			await mkdir(root, { recursive: true });
			await access(root, constants.W_OK);
			return true;
		} catch {
			return false;
		}
	},
};

import { afterAll, expect, setSystemTime, test } from "bun:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const testDir = join(tmpdir(), "ytdl-storage-test");

process.env.STORAGE_DRIVER = "local";
process.env.LOCAL_STORAGE_DIR = testDir;
process.env.LOCAL_STORAGE_SECRET = "test-secret";

const { diskStorage, resolveKeyPath, verifySignature } = await import("./local");

function parseUrl(url: string) {
	const [path, query] = url.split("?");
	const params = new URLSearchParams(query);
	return {
		key: (path ?? "").replace(/^\/files\//, ""),
		exp: params.get("exp") ?? undefined,
		sig: params.get("sig") ?? undefined,
	};
}

afterAll(async () => {
	setSystemTime();
	await rm(testDir, { recursive: true, force: true });
});

test("signed url verifies", () => {
	const { key, exp, sig } = parseUrl(diskStorage.getUrl("videos/abc123.mp4"));
	expect(key).toBe("videos/abc123.mp4");
	expect(verifySignature(key, exp, sig)).toBe(true);
});

test("tampered signature is rejected", () => {
	const { key, exp, sig } = parseUrl(diskStorage.getUrl("videos/abc123.mp4"));
	const tampered = `${sig?.slice(0, -1)}${sig?.endsWith("0") ? "1" : "0"}`;
	expect(verifySignature(key, exp, tampered)).toBe(false);
});

test("signature for another key is rejected", () => {
	const { exp, sig } = parseUrl(diskStorage.getUrl("videos/abc123.mp4"));
	expect(verifySignature("videos/other.mp4", exp, sig)).toBe(false);
});

test("expired signature is rejected", () => {
	setSystemTime(new Date("2020-01-01T00:00:00Z"));
	const { key, exp, sig } = parseUrl(diskStorage.getUrl("videos/abc123.mp4"));
	setSystemTime();
	expect(verifySignature(key, exp, sig)).toBe(false);
});

test("missing exp or sig is rejected", () => {
	const { key, exp, sig } = parseUrl(diskStorage.getUrl("videos/abc123.mp4"));
	expect(verifySignature(key, undefined, sig)).toBe(false);
	expect(verifySignature(key, exp, undefined)).toBe(false);
});

test("keys stay inside the storage root", () => {
	expect(resolveKeyPath("videos/abc123.mp4")).toBe(
		join(testDir, "videos", "abc123.mp4"),
	);
	expect(() => resolveKeyPath("../escaped.mp4")).toThrow();
	expect(() => resolveKeyPath("videos/../../escaped.mp4")).toThrow();
	expect(() => resolveKeyPath("/etc/passwd")).toThrow();
	expect(() => resolveKeyPath("")).toThrow();
});

test("upload then delete round trip", async () => {
	const source = join(testDir, "source.mp4");
	await Bun.write(source, "video bytes");

	await diskStorage.upload(source, "videos/roundtrip.mp4");
	const stored = join(testDir, "videos", "roundtrip.mp4");
	expect(await Bun.file(stored).exists()).toBe(true);
	expect(await Bun.file(stored).text()).toBe("video bytes");

	await diskStorage.delete("videos/roundtrip.mp4");
	// a BunFile caches its stat, so re-open the path to see the deletion
	expect(await Bun.file(stored).exists()).toBe(false);
});

test("deleting a missing key does not throw", async () => {
	await diskStorage.delete("videos/never-existed.mp4");
});

test("check creates the storage root", async () => {
	expect(await diskStorage.check()).toBe(true);
});

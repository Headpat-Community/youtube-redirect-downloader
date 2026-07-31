import { Hono } from "hono";
import { resolveKeyPath, verifySignature } from "../services/storage/local";

export const filesRoutes = new Hono();

filesRoutes.get("/*", async (c) => {
	const key = c.req.path.replace(/^\/files\//, "");

	if (!verifySignature(key, c.req.query("exp"), c.req.query("sig"))) {
		return c.text("Forbidden", 403);
	}

	let path: string;
	try {
		path = resolveKeyPath(key);
	} catch {
		return c.text("Not found", 404);
	}

	const file = Bun.file(path);
	if (!(await file.exists())) {
		return c.text("Not found", 404);
	}

	const size = file.size;
	const headers: Record<string, string> = {
		"Content-Type": "video/mp4",
		"Accept-Ranges": "bytes",
	};

	const range = c.req.header("range");
	if (!range) {
		return new Response(file, {
			headers: { ...headers, "Content-Length": String(size) },
		});
	}

	const match = range.match(/^bytes=(\d*)-(\d*)$/);
	if (!match) {
		return new Response(null, {
			status: 416,
			headers: { ...headers, "Content-Range": `bytes */${size}` },
		});
	}

	const [, startRaw, endRaw] = match;
	let start = startRaw ? Number(startRaw) : 0;
	let end = endRaw ? Number(endRaw) : size - 1;

	// bytes=-500 asks for the last 500 bytes
	if (!startRaw && endRaw) {
		start = Math.max(0, size - Number(endRaw));
		end = size - 1;
	}

	end = Math.min(end, size - 1);

	if (start > end || start >= size) {
		return new Response(null, {
			status: 416,
			headers: { ...headers, "Content-Range": `bytes */${size}` },
		});
	}

	return new Response(file.slice(start, end + 1), {
		status: 206,
		headers: {
			...headers,
			"Content-Length": String(end - start + 1),
			"Content-Range": `bytes ${start}-${end}/${size}`,
		},
	});
});

import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { server as wisp } from "@mercuryworkshop/wisp-js";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";

// Import baremuxPath from the CommonJS module
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const downloadDir = path.join(__dirname, "../public/downloads");

// Crear directorio de descargas si no existe
try {
	await fs.mkdir(downloadDir, { recursive: true });
} catch (err) {
	console.error("Error creating download directory:", err);
}

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

const userAgents = [
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
];

function getRandomUserAgent() {
	return userAgents[Math.floor(Math.random() * userAgents.length)];
}



// Wisp Configuration: Refer to the documentation at https://www.npmjs.com/package/@mercuryworkshop/wisp-js

// Wisp logging is not available in this version
Object.assign(wisp.options, {
	allow_udp_streams: false,
	hostname_blacklist: [/example\.com/],
	dns_servers: ["1.1.1.3", "1.0.0.3"],
		headers: {
			"user-agent": getRandomUserAgent(),
			"accept-language": "en-US,en;q=0.9",
			"accept-encoding": "gzip, deflate, br",
			"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
		},
});

const fastify = Fastify({
	logger: false,
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
});

fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
});

fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decoratereply: false,
});

// Ruta para obtener información de video de YouTube
fastify.post("/api/youtube/info", async (request, reply) => {
	try {
		const { url } = request.body;
		if (!url) {
			return reply.code(400).send({ error: "URL is required" });
		}

		const command = `yt-dlp -j "${url}" 2>/dev/null`;
		const { stdout } = await execAsync(command);
		const videoInfo = JSON.parse(stdout);

		return reply.send({
			title: videoInfo.title,
			duration: videoInfo.duration,
			thumbnail: videoInfo.thumbnail,
			uploader: videoInfo.uploader,
			formats: videoInfo.formats ? videoInfo.formats.length : 0,
		});
	} catch (error) {
		console.error("Error getting video info:", error.message);
		return reply.code(500).send({ error: "Failed to get video info" });
	}
});

// Ruta para descargar video de YouTube
fastify.post("/api/youtube/download", async (request, reply) => {
	try {
		const { url, format } = request.body;
		if (!url) {
			return reply.code(400).send({ error: "URL is required" });
		}

		const videoId = url.includes("v=") ? url.split("v=")[1].split("&")[0] : url.split("/").pop();
		const outputPath = path.join(downloadDir, `${videoId}.mp4`);

		const formatOption = format === "audio" ? "-f bestaudio -x --audio-format mp3" : "-f best";
		const command = `yt-dlp ${formatOption} -o "${outputPath}" "${url}" 2>&1`;

		await execAsync(command);

		return reply.send({
			success: true,
			downloadUrl: `/downloads/${videoId}.${format === "audio" ? "mp3" : "mp4"}`,
			message: "Download started",
		});
	} catch (error) {
		console.error("Error downloading video:", error.message);
		return reply.code(500).send({ error: "Failed to download video" });
	}
});

// Servir archivos descargados
fastify.register(fastifyStatic, {
	root: downloadDir,
	prefix: "/downloads/",
	decoratereply: false,
});

// Ruta de prueba para yt-dlp
fastify.get("/api/youtube/test", async (request, reply) => {
	try {
		const { stdout } = await execAsync("yt-dlp --version");
		return reply.send({ status: "yt-dlp is working", version: stdout.trim() });
	} catch (error) {
		return reply.code(500).send({ error: "yt-dlp is not installed" });
	}
});

fastify.setNotFoundHandler((res, reply) => {
	return reply.code(404).type("text/html").sendFile("404.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log(`Server running on port ${address.port}`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});

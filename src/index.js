import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { createServer } from "http";
import { server as wisp } from "@mercuryworkshop/wisp-js";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCompress from "@fastify/compress";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";

// Import baremuxPath from the CommonJS module
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { baremuxPath } = require("@mercuryworkshop/bare-mux/node");

// Get libcurl.js path for wasm file
const libcurlJsPath = fileURLToPath(new URL("../node_modules/libcurl.js/", import.meta.url));

import fs from "fs/promises";
import path from "path";
import { dirname } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// Wisp Configuration
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

// Request limiting for 512MB Render
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 50;

const fastify = Fastify({
	logger: false,
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				// Limit concurrent requests
				if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
					res.writeHead(503, { "Content-Type": "text/plain" });
					res.end("Server busy - too many requests");
					return;
				}

				activeRequests++;
				res.on("finish", () => activeRequests--);

				// Set security and CORS headers
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				res.setHeader("Access-Control-Allow-Origin", "*");
				res.setHeader("X-Frame-Options", "ALLOWALL");
				res.setHeader("Content-Security-Policy", "");
				res.setHeader("X-Content-Type-Options", "nosniff");

				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

// Static file serving with decorateReply enabled
await fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true,
	prefix: "/",
});

// Static file serving - SCRAMJET
await fastify.register(fastifyStatic, {
	root: scramjetPath,
	prefix: "/scram/",
	decorateReply: false,
	constraints: {},
});

// Static file serving - LIBCURL
await fastify.register(fastifyStatic, {
	root: libcurlPath,
	prefix: "/libcurl/",
	decorateReply: false,
	constraints: {},
});

// Static file serving - BAREMUX
await fastify.register(fastifyStatic, {
	root: baremuxPath,
	prefix: "/baremux/",
	decorateReply: false,
	constraints: {},
});

// Explicit route for libcurl.wasm with correct MIME type
fastify.get("/libcurl/libcurl.wasm", async (request, reply) => {
	try {
		const wasmPath = path.join(libcurlJsPath, "libcurl.wasm");
		reply.header("Content-Type", "application/wasm");
		reply.header("Content-Disposition", "inline");
		reply.header("Cross-Origin-Resource-Policy", "cross-origin");
		reply.header("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
		const buffer = await fs.readFile(wasmPath);
		return reply.send(buffer);
	} catch (err) {
		console.error("Error serving libcurl.wasm:", err);
		return reply.code(404).send("Not Found");
	}
});

// Auth hook - allow proxy routes without password
fastify.addHook("onRequest", async (request, reply) => {
	const url = request.url;

	// Rutas que NO requieren password (proxy y service workers)
	if (
		url.startsWith("/uv/") ||
		url.startsWith("/scramjet/") ||
		url.startsWith("/wisp/") ||
		url.startsWith("/bare/") ||
		url.startsWith("/scram/") ||
		url.startsWith("/baremux/") ||
		url.startsWith("/libcurl/") ||
		url === "/sw.js" ||
		url === "/register-sw.js" ||
		url.endsWith(".wasm") ||
		url.endsWith(".js") ||
		url.endsWith(".css")
	) {
		return; // Allow without auth
	}
});

// Add CORS and caching headers for all files
fastify.addHook("onSend", async (request, reply) => {
	// Cache static assets
	if (request.url.match(/\.(js|css|wasm|woff|woff2|ttf|eot)$/)) {
		reply.header("Cache-Control", "public, max-age=86400"); // 24 hours
	}

	// Ensure WASM has correct MIME type
	if (request.url.includes(".wasm")) {
		reply.header("Content-Type", "application/wasm");
		reply.header("Cross-Origin-Resource-Policy", "cross-origin");
	}

	// Set security headers for HTML
	if (request.url.endsWith(".html") || !request.url.includes(".")) {
		reply.header("X-Frame-Options", "ALLOWALL");
		reply.header("Content-Security-Policy", "");
	}
});

// 404 handler - serve index.html for SPA routing
fastify.setNotFoundHandler((request, reply) => {
	return reply.sendFile("index.html");
});

fastify.server.on("listening", () => {
	const address = fastify.server.address();
	console.log(`[BlackWave-Pro] Server running on port ${address.port}`);
	console.log(`[BlackWave-Pro] Max concurrent requests: ${MAX_CONCURRENT_REQUESTS}`);
	console.log(`[BlackWave-Pro] Compression enabled for responses > 1KB`);
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
	console.log("[BlackWave-Pro] SIGTERM signal received: closing HTTP server");
	fastify.close();
	process.exit(0);
}

let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 8080;

fastify.listen({
	port: port,
	host: "0.0.0.0",
});

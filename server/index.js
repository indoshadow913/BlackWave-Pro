import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, "../dist");

const app = express();
const server = createServer(app);

// Create Bare server
const bare = createBareServer("/bare/");

// Serve everything from dist (includes transports copied during build)
app.use(express.static(distPath));

// CRITICAL: Handle Bare protocol requests with RETURN
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    return bare.routeRequest(req, res);
  }

  app(req, res);
});

// CRITICAL: Handle WebSocket upgrades with RETURN
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    return bare.routeUpgrade(req, socket, head);
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[BlackWave Pro] Server running on port ${PORT}`);
  console.log(`[BlackWave Pro] Serving from: ${distPath}`);
  console.log(`[BlackWave Pro] Bare server at /bare/`);
  console.log(`[BlackWave Pro] Epoxy transport at /epoxy/`);
  console.log(`[BlackWave Pro] BareMux at /baremux/`);
  console.log(`[BlackWave Pro] Scramjet at /scram/`);
});

process.on("SIGTERM", () => {
  console.log("[BlackWave Pro] SIGTERM received, shutting down...");
  server.close();
  process.exit(0);
});

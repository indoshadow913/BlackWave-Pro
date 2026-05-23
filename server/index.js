import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, "../dist");

const app = express();
const server = createServer(app);

// Create Bare server
const bare = createBareServer("/bare/");

// Serve static files from dist
app.use(express.static(distPath));

// SPA fallback - serve index.html ONLY for non-proxy routes
app.get("*", (req, res, next) => {
  // Exclude proxy routes
  if (
    req.path.startsWith("/bare/") ||
    req.path.startsWith("/scram/") ||
    req.path.startsWith("/epoxy/") ||
    req.path.startsWith("/baremux/")
  ) {
    return next();
  }

  // Serve index.html for all other routes (SPA routing)
  res.sendFile(path.join(distPath, "index.html"));
});

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

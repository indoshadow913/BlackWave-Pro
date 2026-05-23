import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// Create Bare server
const bare = createBareServer("/bare/");

// Serve static files from dist (Vite build output)
app.use(express.static("dist"));

// Serve Epoxy transport
app.use("/epoxy/", express.static("node_modules/@mercuryworkshop/epoxy-transport/dist/"));

// Serve BareMux
app.use("/baremux/", express.static("node_modules/@mercuryworkshop/bare-mux/dist/"));

// Serve Scramjet
app.use("/scram/", express.static("node_modules/@mercuryworkshop/scramjet/dist/"));

// Handle Bare protocol requests
server.on("request", (req, res) => {
  if (bare.shouldRoute(req)) {
    bare.routeRequest(req, res);
  } else {
    app(req, res);
  }
});

// Handle WebSocket upgrades for Bare
server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  }
});

// 404 handler - serve index.html for SPA routing
app.use((req, res) => {
  res.sendFile("dist/index.html", { root: process.cwd() });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`[BlackWave Pro] Server running on port ${PORT}`);
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

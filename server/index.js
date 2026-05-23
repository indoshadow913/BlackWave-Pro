import express from "express";
import { createBareServer } from "@tomphttp/bare-server-node";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, "../dist");
const epoxPath = join(__dirname, "../node_modules/@mercuryworkshop/epoxy-transport/dist");
const baremuxPath = join(__dirname, "../node_modules/@mercuryworkshop/bare-mux/dist");
const scramjetPath = join(__dirname, "../node_modules/@mercuryworkshop/scramjet/dist");

const app = express();
const server = createServer(app);

// Create Bare server
const bare = createBareServer("/bare/");

console.log("[BlackWave] Paths:");
console.log("  dist:", distPath);
console.log("  epoxy:", epoxPath);
console.log("  baremux:", baremuxPath);
console.log("  scramjet:", scramjetPath);

// Serve transports BEFORE static files
app.use("/epoxy/", express.static(epoxPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/scram/", express.static(scramjetPath));

// Serve static files from dist (Vite build output)
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

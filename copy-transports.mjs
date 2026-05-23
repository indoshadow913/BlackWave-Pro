import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distPath = path.join(__dirname, "dist");
const nodeModulesPath = path.join(__dirname, "node_modules");

// Ensure dist exists
if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

// Copy function
function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-transports] Source not found: ${src}`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  files.forEach((file) => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);

    if (stat.isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });

  console.log(`[copy-transports] Copied: ${src} → ${dest}`);
}

// Copy transports
const transports = [
  {
    name: "epoxy",
    src: path.join(nodeModulesPath, "@mercuryworkshop/epoxy-transport/dist"),
    dest: path.join(distPath, "epoxy"),
  },
  {
    name: "baremux",
    src: path.join(nodeModulesPath, "@mercuryworkshop/bare-mux/dist"),
    dest: path.join(distPath, "baremux"),
  },
  {
    name: "scramjet",
    src: path.join(nodeModulesPath, "@mercuryworkshop/scramjet/dist"),
    dest: path.join(distPath, "scram"),
  },
];

console.log("[copy-transports] Starting transport copy...");
transports.forEach((transport) => {
  copyDir(transport.src, transport.dest);
});

// Also copy sw.js
const swSrc = path.join(__dirname, "public/sw.js");
const swDest = path.join(distPath, "sw.js");
if (fs.existsSync(swSrc)) {
  fs.copyFileSync(swSrc, swDest);
  console.log(`[copy-transports] Copied: ${swSrc} → ${swDest}`);
}

console.log("[copy-transports] ✅ All transports and static files copied successfully");

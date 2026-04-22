import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import httpProxy from "http-proxy";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear proxy
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  followRedirects: true,
});

// Crear servidor HTTP personalizado
const server = createServer((req, res) => {
  // Servir archivos estáticos
  if (req.url === "/" || req.url.startsWith("/public/") || req.url.endsWith(".html") || req.url.endsWith(".js") || req.url.endsWith(".css")) {
    const filePath = req.url === "/" ? "/index.html" : req.url;
    const fullPath = join(__dirname, "../public", filePath);
    
    // Usar Fastify para servir archivos estáticos
    const app = Fastify();
    app.register(fastifyStatic, {
      root: join(__dirname, "../public"),
    });
    
    app.ready(() => {
      app.server.emit("request", req, res);
    });
    return;
  }
  
  // Proxy para /proxy/*
  if (req.url.startsWith("/proxy/")) {
    const targetUrl = req.url.slice(7); // Remover "/proxy/"
    
    console.log("Proxying to:", targetUrl);
    
    // Agregar headers realistas
    req.headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
    req.headers["accept-language"] = "en-US,en;q=0.9";
    req.headers["dnt"] = "1";
    
    proxy.web(req, res, { target: targetUrl }, (err) => {
      console.error("Proxy error:", err);
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h1>Proxy Error</h1><p>" + err.message + "</p>");
    });
    return;
  }
  
  // 404 para otras rutas
  res.writeHead(404, { "Content-Type": "text/html" });
  res.end("<h1>404 Not Found</h1>");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`BlackWave-Pro escuchando en puerto ${PORT}`);
});

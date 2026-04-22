import { fileURLToPath } from "url";
import { createServer } from "http";
import { dirname, join } from "path";
import { readFileSync, existsSync } from "fs";
import httpProxy from "http-proxy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const publicPath = join(__dirname, "../public");

// Crear proxy HTTP
const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
  followRedirects: true,
  timeout: 30000,
  proxyTimeout: 30000,
  ws: true,
  onProxyReq: (proxyReq, req, res) => {
    // Agregar headers para parecer un navegador real
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.9');
    proxyReq.setHeader('Accept-Encoding', 'gzip, deflate, br');
    proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8');
    proxyReq.setHeader('Sec-Fetch-Dest', 'document');
    proxyReq.setHeader('Sec-Fetch-Mode', 'navigate');
    proxyReq.setHeader('Sec-Fetch-Site', 'none');
    proxyReq.setHeader('Upgrade-Insecure-Requests', '1');
    proxyReq.setHeader('Cache-Control', 'max-age=0');
    proxyReq.setHeader('DNT', '1');
    proxyReq.setHeader('Connection', 'keep-alive');
    proxyReq.setHeader('Pragma', 'no-cache');
    
    // Remover headers que pueden identificar como proxy
    proxyReq.removeHeader('X-Forwarded-For');
    proxyReq.removeHeader('X-Forwarded-Proto');
    proxyReq.removeHeader('X-Forwarded-Host');
  },
});

// Manejar errores del proxy
proxy.on("error", (err, req, res) => {
  console.error("Proxy error:", err);
  res.writeHead(502, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Bad Gateway", message: err.message }));
});

// Función para servir archivos estáticos
function serveStatic(filePath, res) {
  try {
    const fullPath = join(publicPath, filePath);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath);
      const ext = filePath.split('.').pop();
      const mimeTypes = {
        html: 'text/html',
        css: 'text/css',
        js: 'application/javascript',
        json: 'application/json',
        png: 'image/png',
        jpg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content);
      return true;
    }
  } catch (err) {
    console.error("Error serving static file:", err);
  }
  return false;
}

// Crear servidor HTTP
const server = createServer((req, res) => {
  // Headers de seguridad
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  
  console.log(`${req.method} ${req.url}`);
  
  // Manejar peticiones de proxy
  if (req.url.startsWith("/proxy/")) {
    const targetUrl = req.url.slice(7); // Remover "/proxy/"
    try {
      const decodedUrl = decodeURIComponent(targetUrl);
      console.log("Proxying to:", decodedUrl);
      proxy.web(req, res, { target: decodedUrl });
    } catch (err) {
      console.error("Proxy error:", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid URL" }));
    }
  }
  // Servir archivos estáticos
  else if (req.url === "/" || req.url === "") {
    serveStatic("index.html", res);
  }
  else if (req.url.startsWith("/")) {
    const filePath = req.url.split("?")[0]; // Remover query string
    if (!serveStatic(filePath, res)) {
      // Si no existe el archivo, servir index.html (SPA)
      serveStatic("index.html", res);
    }
  }
  else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  }
});

// Manejar WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
  if (req.url.startsWith("/proxy/")) {
    const targetUrl = req.url.slice(7);
    try {
      const decodedUrl = decodeURIComponent(targetUrl);
      proxy.ws(req, socket, head, { target: decodedUrl });
    } catch (err) {
      socket.end();
    }
  } else {
    socket.end();
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

// Manejar errores del servidor
server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

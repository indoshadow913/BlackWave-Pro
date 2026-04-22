import { fileURLToPath } from "url";
import { createServer } from "http";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import httpProxy from "http-proxy";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

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

const fastify = Fastify({
  serverFactory: (handler) => {
    return createServer()
      .on("request", (req, res) => {
        // Headers de seguridad
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        
        // Manejar peticiones de proxy
        if (req.url.startsWith("/proxy/")) {
          const targetUrl = req.url.slice(7); // Remover "/proxy/"
          try {
            const decodedUrl = decodeURIComponent(targetUrl);
            console.log("Proxying to:", decodedUrl);
            
            // Pasar la petición al proxy
            proxy.web(req, res, { target: decodedUrl });
          } catch (err) {
            console.error("Proxy error:", err);
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid URL" }));
          }
        } else {
          handler(req, res);
        }
      })
      .on("upgrade", (req, socket, head) => {
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
  },
});

// Registrar archivos estáticos
fastify.register(fastifyStatic, {
  root: publicPath,
  decorateReply: true,
});

// Ruta raíz
fastify.get("/", (request, reply) => {
  reply.sendFile("index.html");
});

// Ruta 404 - servir index.html para SPA
fastify.setNotFoundHandler((request, reply) => {
  reply.sendFile("index.html");
});

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({ port: 10000, host: "0.0.0.0" });
    console.log("Server running on http://0.0.0.0:10000");
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

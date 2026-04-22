import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import httpProxy from "http-proxy";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// Cookies de YouTube para evitar bloqueos
const YOUTUBE_COOKIES = [
  'CONSENT=YES+',
  'ANID=',
  'NID=',
  'PREF=yt-player-bandwidth=',
].join('; ');

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
    proxyReq.setHeader('Referer', 'https://www.youtube.com/');
    proxyReq.setHeader('DNT', '1');
    
    // Agregar cookies de YouTube
    if (req.headers.host && req.headers.host.includes('youtube')) {
      proxyReq.setHeader('Cookie', YOUTUBE_COOKIES);
    }
  },
});

// Manejar respuestas del proxy para reescribir URLs
proxy.on("proxyRes", (proxyRes, req, res) => {
  // Reescribir URLs en HTML
  if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
    let chunks = [];
    const originalWrite = res.write;
    const originalEnd = res.end;
    
    proxyRes.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    proxyRes.on('end', () => {
      try {
        let html = Buffer.concat(chunks).toString('utf-8');
        
        // Obtener la URL original del proxy
        const originalUrl = req.url.slice(7); // Remover "/proxy/"
        const decodedUrl = decodeURIComponent(originalUrl);
        const baseUrl = new URL(decodedUrl).origin;
        
        // Reescribir href en links
        html = html.replace(/href=["'](?!(?:javascript|data|#|\/\/))([^"']+)["']/gi, (match, url) => {
          if (url.startsWith('http')) {
            return `href="/proxy/${encodeURIComponent(url)}"`;
          } else if (url.startsWith('/')) {
            return `href="/proxy/${encodeURIComponent(baseUrl + url)}"`;
          } else {
            return `href="/proxy/${encodeURIComponent(baseUrl + '/' + url)}"`;
          }
        });
        
        // Reescribir src en scripts e imágenes
        html = html.replace(/src=["'](?!(?:javascript|data|#|\/\/))([^"']+)["']/gi, (match, url) => {
          if (url.startsWith('http')) {
            return `src="/proxy/${encodeURIComponent(url)}"`;
          } else if (url.startsWith('/')) {
            return `src="/proxy/${encodeURIComponent(baseUrl + url)}"`;
          } else {
            return `src="/proxy/${encodeURIComponent(baseUrl + '/' + url)}"`;
          }
        });
        
        res.write(html);
        res.end();
      } catch (err) {
        console.error('URL rewriting error:', err);
        res.write(Buffer.concat(chunks));
        res.end();
      }
    });
  }
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
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
        res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        
        // Manejar peticiones de proxy
        if (req.url.startsWith("/proxy/")) {
          const targetUrl = req.url.slice(7); // Remover "/proxy/"
          try {
            const decodedUrl = decodeURIComponent(targetUrl);
            // Agregar headers de usuario real
            req.headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
            req.headers['accept-language'] = 'en-US,en;q=0.9';
            req.headers['accept-encoding'] = 'gzip, deflate, br';
            req.headers['accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8';
            req.headers['dnt'] = '1';
            proxy.web(req, res, { target: decodedUrl });
          } catch (err) {
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

// Ruta para servir index.html en rutas no encontradas (SPA fallback)
fastify.setNotFoundHandler((request, reply) => {
  return reply.sendFile("index.html");
});

// Evento cuando el servidor está escuchando
fastify.server.on("listening", () => {
  const address = fastify.server.address();
  console.log("✅ BlackWave-Pro is listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

// Manejar señales de cierre
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  fastify.close();
  process.exit(0);
}

// Obtener puerto
let port = parseInt(process.env.PORT || "");
if (isNaN(port)) port = 10000;

// Iniciar servidor
fastify.listen({
  port: port,
  host: "0.0.0.0",
});

import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
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

import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Scramjet } from "scramjet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = Fastify({
  logger: true,
});

// Registrar plugin de archivos estáticos
await app.register(fastifyStatic, {
  root: join(__dirname, "../public"),
  prefix: "/",
});

// Crear instancia de Scramjet
const scramjet = new Scramjet();

// Ruta para proxy con Scramjet
app.get("/proxy/:url", async (request, reply) => {
  const url = request.params.url;
  
  try {
    const decodedUrl = decodeURIComponent(url);
    console.log("Proxying to:", decodedUrl);
    
    // Usar Scramjet para proxificar
    const response = await scramjet.fetch(decodedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    
    const content = await response.text();
    reply.type("text/html").send(content);
  } catch (err) {
    console.error("Proxy error:", err);
    reply.status(400).send({ error: "Invalid URL" });
  }
});

// Ruta raíz
app.get("/", async (request, reply) => {
  reply.sendFile("index.html");
});

// Ruta 404
app.setNotFoundHandler((request, reply) => {
  reply.sendFile("index.html");
});

// Iniciar servidor
const start = async () => {
  try {
    await app.listen({ port: 3000, host: "0.0.0.0" });
    console.log("BlackWave-Pro escuchando en puerto 3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();

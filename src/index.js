import { createServer } from "node:http";
import { createBareServer } from "@mercuryworkshop/bare-mux/node";
import { createWispServer } from "@mercuryworkshop/wisp-js/node";
import { scramjet } from "@mercuryworkshop/scramjet";
import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = fastify();
const bare = createBareServer("/bare/");
const wisp = createWispServer();

app.register(fastifyStatic, {
    root: join(__dirname, "../public"),
    prefix: "/",
});

app.register(scramjet, {
    prefix: "/service/",
});

app.setNotFoundHandler((request, reply) => {
    reply.sendFile("404.html");
});

const server = createServer();

server.on("request", (req, res) => {
    if (bare.shouldRoute(req)) {
          bare.routeRequest(req, res);
    } else {
          app.routing(req, res);
    }
});

server.on("upgrade", (req, socket, head) => {
    if (bare.shouldRoute(req)) {
          bare.routeUpgrade(req, socket, head);
    } else if (req.url.endsWith("/wisp/")) {
          wisp.routeUpgrade(req, socket, head);
    } else {
          socket.end();
    }
});

const port = process.env.PORT || 8080;

server.listen(port, () => {
    console.log(`FreeWave Proxy running at http://localhost:${port}`);
});

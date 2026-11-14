import express from "express";
import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "../shared/protocol";
import { config } from "./config";
import { cleanup, migrate, pool } from "./db";
import { resolveIdentity, verifyToken } from "./identity";
import { Matchmaker } from "./matchmaker";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use(express.json({ limit: "4kb" }));

app.post("/api/identity", async (req, res) => {
  try {
    const result = await resolveIdentity(req.body?.token, req.ip ?? "unknown");
    if ("error" in result) return res.status(429).json(result);
    res.json(result);
  } catch (e) {
    console.error("[api] identity", e);
    res.status(500).json({ error: "server" });
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    res.json({ ok: true, ...mm.stats });
  } catch {
    res.status(503).json({ ok: false });
  }
});

// Serve the built web app (dist/web) next to this bundle in production.
const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = [path.join(here, "web"), path.join(here, "../dist/web")].find((d) => existsSync(d));
if (webDir) {
  app.use(express.static(webDir, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api\/|socket\.io\/).*/, (_req, res) => res.sendFile(path.join(webDir, "index.html")));
}

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  serveClient: false,
  maxHttpBufferSize: 8 * 1024,
  pingInterval: 10_000,
  pingTimeout: 8_000,
});
const mm = new Matchmaker(io);

io.use((socket, next) => {
  const id = verifyToken(socket.handshake.auth?.token);
  if (!id) return next(new Error("unauthorized"));
  socket.data.deviceId = id;
  next();
});
io.on("connection", (socket) => mm.attach(socket, socket.data.deviceId as string));

async function main() {
  await migrate();
  await cleanup().catch((e) => console.error("[db] temizlik", e));
  setInterval(() => cleanup().catch((e) => console.error("[db] temizlik", e)), 3600_000).unref();
  server.listen(config.port, () => {
    console.log(`Küçük Konuşma çalışıyor: http://localhost:${config.port}${webDir ? "" : " (web derlemesi yok, sadece API)"}`);
  });
}

function shutdown() {
  console.log("Kapanıyor…");
  io.close();
  server.close(() => void pool.end().finally(() => process.exit(0)));
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

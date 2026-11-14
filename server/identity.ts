import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "./config";
import { pool } from "./db";

// Anonymous identity: every browser gets a random device id signed by the server.
// The signed token lives in the browser's localStorage; no name, email or phone.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function sign(id: string): string {
  return createHmac("sha256", config.sessionSecret).update(id).digest("base64url");
}

export function issueToken(id: string): string {
  return `${id}.${sign(id)}`;
}

/** Returns the device id when the token is genuine, otherwise null. */
export function verifyToken(token: unknown): string | null {
  if (typeof token !== "string") return null;
  const [id, sig] = token.split(".");
  if (!id || !sig || !UUID.test(id)) return null;
  const expected = Buffer.from(sign(id));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return id;
}

// Simple in-memory limiter for new identities per IP.
const created = new Map<string, number[]>();

export function canCreateIdentity(ip: string): boolean {
  const hourAgo = Date.now() - 3600_000;
  const list = (created.get(ip) ?? []).filter((t) => t > hourAgo);
  if (list.length >= config.identitiesPerIpPerHour) {
    created.set(ip, list);
    return false;
  }
  list.push(Date.now());
  created.set(ip, list);
  return true;
}

setInterval(() => {
  const hourAgo = Date.now() - 3600_000;
  for (const [ip, list] of created) {
    const fresh = list.filter((t) => t > hourAgo);
    if (fresh.length) created.set(ip, fresh);
    else created.delete(ip);
  }
}, 600_000).unref();

/** Keeps a valid existing token, otherwise creates a new device. */
export async function resolveIdentity(token: unknown, ip: string): Promise<{ token: string } | { error: "rate" }> {
  const existing = verifyToken(token);
  if (existing) {
    const { rowCount } = await pool.query("select 1 from devices where id = $1", [existing]);
    if (rowCount) return { token: token as string };
  }
  if (!canCreateIdentity(ip)) return { error: "rate" };
  const id = randomUUID();
  await pool.query("insert into devices(id) values ($1)", [id]);
  return { token: issueToken(id) };
}

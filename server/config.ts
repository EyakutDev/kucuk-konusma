// All runtime settings come from environment variables (see .env.example).

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} bir sayı olmalı (verilen: ${v})`);
  return n;
}

const isProd = process.env.NODE_ENV === "production";

const secret = process.env.SESSION_SECRET ?? "";
if (isProd && secret.length < 32) {
  throw new Error("SESSION_SECRET en az 32 karakter olmalı. Üretmek için: openssl rand -hex 32");
}

export const config = {
  isProd,
  port: num("PORT", 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://kucuk:kucuk@localhost:5432/kucuk",
  sessionSecret: secret || "dev-only-secret-do-not-use-in-production-0000",
  /** Set to 1 when running behind a reverse proxy (nginx, Caddy) so client IPs are read correctly. */
  trustProxy: num("TRUST_PROXY", 0),

  roundSeconds: num("ROUND_SECONDS", 120),
  maxExtensions: num("MAX_EXTENSIONS", 2),

  /** How many different people must report a device within the window before it is banned. */
  reportBanThreshold: num("REPORT_BAN_THRESHOLD", 3),
  reportWindowHours: num("REPORT_WINDOW_HOURS", 24),
  banHours: num("BAN_HOURS", 24),

  /** Messages are kept this long only so reports can be reviewed, then deleted. */
  messageRetentionHours: num("MESSAGE_RETENTION_HOURS", 72),
  /** Chat records and reports (no message text) are kept this long for ban decisions. */
  recordRetentionDays: num("RECORD_RETENTION_DAYS", 30),

  /** Max new anonymous identities per IP per hour; slows down ban evasion. */
  identitiesPerIpPerHour: num("IDENTITIES_PER_IP_PER_HOUR", 20),
};

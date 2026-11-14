import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, Profile, ServerToClientEvents } from "../../shared/protocol";
import { COLORS } from "../../shared/protocol";

export type KKSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ---------- storage (best effort: private windows may refuse) ----------
function load(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function save(key: string, value: string | null): void {
  try { value === null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* ignore */ }
}

// ---------- anonymous identity ----------
const TOKEN_KEY = "kk.token";

export async function fetchToken(forceNew = false): Promise<string> {
  const current = forceNew ? null : load(TOKEN_KEY);
  const res = await fetch("/api/identity", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: current }),
  });
  if (!res.ok) throw new Error(res.status === 429 ? "rate" : "server");
  const { token } = (await res.json()) as { token: string };
  save(TOKEN_KEY, token);
  return token;
}

export function connect(token: string): KKSocket {
  return io({ auth: { token }, transports: ["websocket", "polling"] });
}

// ---------- profile ----------
const ADJ = ["Sakin", "Mavi", "Hızlı", "Gece", "Kuzey", "Sessiz", "Neşeli", "Uykulu", "Meraklı", "Yaz", "Güneşli", "Bulutlu"];
const NOUN = ["Martı", "Tilki", "Kirpi", "Baykuş", "Rüzgâr", "Kedi", "Sincap", "Bulut", "Ayı", "Yıldız", "Çınar", "Dalga"];
const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

export function randomName(not?: string): string {
  let n: string;
  do n = `${pick(ADJ)} ${pick(NOUN)}`; while (n === not);
  return n;
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toLocaleUpperCase("tr") || "?";
}

const PROFILE_KEY = "kk.profile";

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(load(PROFILE_KEY) ?? "null") as Profile | null;
    if (p && typeof p.name === "string" && (COLORS as readonly string[]).includes(p.color)) return p;
  } catch { /* ignore */ }
  return { name: randomName(), color: COLORS[0] };
}

export function saveProfile(p: Profile): void {
  save(PROFILE_KEY, JSON.stringify(p));
}

export function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "23:05" for today, "15 Kasım 23:05" otherwise. */
export function clockTime(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === new Date().toDateString()) return time;
  return `${d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" })} ${time}`;
}

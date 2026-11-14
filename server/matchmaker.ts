import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import {
  COLORS, MAX_MESSAGE_LENGTH, NAME_MAX, NAME_MIN, REPORT_REASONS,
  type ClientToServerEvents, type EndReason, type Profile, type ServerToClientEvents,
} from "../shared/protocol";
import { TOPICS, randomTopicIndex } from "../shared/topics";
import { containsProfanity } from "../shared/filter";
import { config } from "./config";
import { pool } from "./db";

type IO = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

interface Player {
  socket: Sock;
  deviceId: string;
  profile: Profile | null;
  state: "idle" | "joining" | "queued" | "chat";
  /** Topic shown on the wait screen; used for the chat when this player waited first. */
  pendingTopic: number;
  chat: Chat | null;
  lastMessageAt: number;
  lastTypingAt: number;
}

interface Chat {
  id: string;
  a: Player;
  b: Player;
  topic: number;
  roundMs: number;
  endsAt: number;
  ext: number;
  wants: Map<Player, boolean>;
  timer: NodeJS.Timeout;
  ended: boolean;
}

const MIN_MESSAGE_GAP_MS = 350;

export class Matchmaker {
  private queue: Player[] = [];

  constructor(private io: IO) {}

  get stats() {
    return { queued: this.queue.length, sockets: this.io.engine.clientsCount };
  }

  attach(socket: Sock, deviceId: string): void {
    const p: Player = {
      socket, deviceId, profile: null, state: "idle", pendingTopic: randomTopicIndex(),
      chat: null, lastMessageAt: 0, lastTypingAt: 0,
    };

    socket.on("join", (profile, ack) => void this.join(p, profile, ack).catch((e) => this.fail(e, ack)));
    socket.on("cancel", () => this.dequeue(p));
    socket.on("send", (text, ack) => void this.send(p, text, ack).catch((e) => this.fail(e, ack)));
    socket.on("typing", () => this.typing(p));
    socket.on("want", (want) => this.want(p, want));
    socket.on("nextTopic", () => this.nextTopic(p));
    socket.on("leave", () => this.leave(p));
    socket.on("report", (reason, ack) => void this.report(p, reason, ack).catch((e) => this.fail(e, ack)));
    socket.on("disconnect", () => {
      this.dequeue(p);
      if (p.chat) this.end(p.chat, () => "ended");
      p.state = "idle";
    });
  }

  private fail(e: unknown, ack: unknown): void {
    console.error("[mm]", e);
    if (typeof ack === "function") ack({ ok: false, error: "bad_request" });
  }

  // ---------- queue ----------

  private async join(p: Player, raw: Profile, ack: (r: any) => void): Promise<void> {
    if (typeof ack !== "function") return;
    if (p.state !== "idle") return ack({ ok: false, error: "busy" });

    const name = typeof raw?.name === "string" ? raw.name.trim().replace(/\s+/g, " ") : "";
    const color = typeof raw?.color === "string" && (COLORS as readonly string[]).includes(raw.color) ? raw.color : COLORS[0];
    if (name.length < NAME_MIN || name.length > NAME_MAX || containsProfanity(name)) return ack({ ok: false, error: "bad_name" });

    p.state = "joining";
    const { rows } = await pool.query<{ banned_until: Date | null }>("select banned_until from devices where id = $1", [p.deviceId]);
    const until = rows[0]?.banned_until;
    if (until && until.getTime() > Date.now()) {
      p.state = "idle";
      return ack({ ok: false, error: "banned", until: until.getTime() });
    }
    if (p.state !== "joining") return; // cancelled or disconnected while we were waiting

    p.profile = { name, color };
    p.pendingTopic = randomTopicIndex(p.pendingTopic);
    ack({ ok: true, topic: TOPICS[p.pendingTopic] });

    const partner = await this.findPartner(p);
    if (p.state !== "joining") return;
    // Re-check: another join may have taken this partner while we were querying.
    if (partner && partner.state === "queued" && this.queue.includes(partner)) {
      this.queue = this.queue.filter((q) => q !== partner);
      this.startChat(partner, p);
    } else {
      p.state = "queued";
      this.queue.push(p);
    }
  }

  private async findPartner(p: Player): Promise<Player | null> {
    for (const q of [...this.queue]) {
      if (q.deviceId === p.deviceId || q.state !== "queued") continue;
      // People who reported each other are never matched again.
      const { rowCount } = await pool.query(
        "select 1 from reports where (reporter = $1 and reported = $2) or (reporter = $2 and reported = $1) limit 1",
        [p.deviceId, q.deviceId],
      );
      if (rowCount) continue;
      if (q.state === "queued" && this.queue.includes(q)) return q;
    }
    return null;
  }

  private dequeue(p: Player): void {
    this.queue = this.queue.filter((q) => q !== p);
    if (p.state === "queued" || p.state === "joining") p.state = "idle";
  }

  // ---------- chat lifecycle ----------

  /** `a` is the player who waited first; their topic is used. */
  private startChat(a: Player, b: Player): void {
    const now = Date.now();
    const roundMs = config.roundSeconds * 1000;
    const chat: Chat = {
      id: randomUUID(), a, b, topic: a.pendingTopic, roundMs, endsAt: now + roundMs, ext: 0,
      wants: new Map(), timer: setTimeout(() => this.decide(chat), roundMs), ended: false,
    };
    for (const p of [a, b]) {
      p.state = "chat";
      p.chat = chat;
      p.lastMessageAt = 0;
    }
    pool.query("insert into chats(id, device_a, device_b) values ($1, $2, $3)", [chat.id, a.deviceId, b.deviceId])
      .catch((e) => console.error("[db] chat kaydı", e));

    for (const [me, other] of [[a, b], [b, a]] as const) {
      me.socket.emit("match", {
        chatId: chat.id, partner: other.profile!, topic: TOPICS[chat.topic],
        serverNow: now, endsAt: chat.endsAt, roundMs, ext: 0, maxExt: config.maxExtensions,
      });
    }
  }

  private decide(chat: Chat): void {
    if (chat.ended) return;
    if (chat.ext >= config.maxExtensions) return this.end(chat, () => "cap");
    if (chat.wants.get(chat.a) && chat.wants.get(chat.b)) {
      chat.ext += 1;
      chat.wants.clear();
      const now = Date.now();
      chat.endsAt = now + chat.roundMs;
      chat.timer = setTimeout(() => this.decide(chat), chat.roundMs);
      for (const p of [chat.a, chat.b]) p.socket.emit("extended", { serverNow: now, endsAt: chat.endsAt, ext: chat.ext });
      return;
    }
    // Same result for both: nobody learns who did not want to continue.
    this.end(chat, () => "time");
  }

  private end(chat: Chat, reasonFor: (p: Player) => EndReason): void {
    if (chat.ended) return;
    chat.ended = true;
    clearTimeout(chat.timer);
    const reasonA = reasonFor(chat.a);
    for (const p of [chat.a, chat.b]) {
      p.chat = null;
      p.state = "idle";
      if (p.socket.connected) p.socket.emit("ended", { reason: reasonFor(p) });
    }
    pool.query("update chats set ended_at = now(), end_reason = $2, extensions = $3 where id = $1", [chat.id, reasonA, chat.ext])
      .catch((e) => console.error("[db] chat bitişi", e));
  }

  private partnerOf(p: Player): Player | null {
    const c = p.chat;
    if (!c || c.ended) return null;
    return c.a === p ? c.b : c.a;
  }

  // ---------- in-chat actions ----------

  private async send(p: Player, raw: string, ack: (r: any) => void): Promise<void> {
    if (typeof ack !== "function") return;
    const chat = p.chat;
    const other = this.partnerOf(p);
    if (!chat || !other) return ack({ ok: false, error: "not_in_chat" });
    const text = typeof raw === "string" ? raw.trim().slice(0, MAX_MESSAGE_LENGTH) : "";
    if (!text) return ack({ ok: false, error: "bad_request" });
    const now = Date.now();
    if (now - p.lastMessageAt < MIN_MESSAGE_GAP_MS) return ack({ ok: false, error: "rate" });
    p.lastMessageAt = now;

    // Filtered messages never leave the sender and are not stored.
    if (containsProfanity(text)) return ack({ ok: false, error: "blocked" });

    const id = randomUUID();
    other.socket.emit("message", { id, text });
    ack({ ok: true, id });
    pool.query("insert into messages(id, chat_id, sender, body) values ($1, $2, $3, $4)", [id, chat.id, p.deviceId, text])
      .catch((e) => console.error("[db] mesaj kaydı", e));
  }

  private typing(p: Player): void {
    const other = this.partnerOf(p);
    const now = Date.now();
    if (!other || now - p.lastTypingAt < 1000) return;
    p.lastTypingAt = now;
    other.socket.emit("typing");
  }

  private want(p: Player, want: unknown): void {
    const chat = p.chat;
    if (!chat || chat.ended || chat.ext >= config.maxExtensions) return;
    chat.wants.set(p, want === true);
  }

  private nextTopic(p: Player): void {
    const chat = p.chat;
    const other = this.partnerOf(p);
    if (!chat || !other) return;
    chat.topic = randomTopicIndex(chat.topic);
    p.socket.emit("topic", { topic: TOPICS[chat.topic], by: "me" });
    other.socket.emit("topic", { topic: TOPICS[chat.topic], by: "them" });
  }

  private leave(p: Player): void {
    if (p.chat) this.end(p.chat, (x) => (x === p ? "left" : "ended"));
  }

  private async report(p: Player, reason: unknown, ack: (r: any) => void): Promise<void> {
    if (typeof ack !== "function") return;
    const chat = p.chat;
    const other = this.partnerOf(p);
    if (!chat || !other) return ack({ ok: false, error: "not_in_chat" });
    const r = (REPORT_REASONS as readonly unknown[]).includes(reason) ? (reason as string) : "other";

    this.end(chat, (x) => (x === p ? "report" : "ended"));
    ack({ ok: true });

    await pool.query(
      "insert into reports(chat_id, reporter, reported, reason) values ($1, $2, $3, $4) on conflict do nothing",
      [chat.id, p.deviceId, other.deviceId, r],
    );
    // Ban when enough different people reported this device recently.
    const { rows } = await pool.query<{ n: string }>(
      "select count(distinct reporter) as n from reports where reported = $1 and created_at > now() - make_interval(hours => $2)",
      [other.deviceId, config.reportWindowHours],
    );
    if (Number(rows[0]?.n ?? 0) >= config.reportBanThreshold) {
      await pool.query(
        "update devices set banned_until = greatest(coalesce(banned_until, now()), now() + make_interval(hours => $2)) where id = $1",
        [other.deviceId, config.banHours],
      );
      console.log(`[mm] cihaz ${config.banHours} saat uzaklaştırıldı`);
    }
  }
}

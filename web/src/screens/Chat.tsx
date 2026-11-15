import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MAX_MESSAGE_LENGTH, type Profile, type ReportReason } from "../../../shared/protocol";
import { Avatar, Icons, Sheet } from "../components/ui";
import { fmt } from "../lib";

export type Item =
  | { key: number; kind: "me" | "them" | "sys" | "ext"; text: string }
  | { key: number; kind: "blocked"; text: string };

export interface ChatState {
  partner: Profile;
  topic: string;
  /** Changes on every topic change, to replay the flip animation. */
  topicKey: number;
  endsAt: number; // in local clock
  roundMs: number;
  ext: number;
  maxExt: number;
  want: boolean;
  items: Item[];
  typingUntil: number;
  lastActivity: number;
  /** Changes on every extension, to replay the refill / flash. */
  extKey: number;
}

const QUIET_AFTER_MS = 20_000;
const WARN_MS = 30_000;

const REPORTS: { reason: ReportReason; label: string }[] = [
  { reason: "language", label: "Uygunsuz dil" },
  { reason: "harassment", label: "Taciz veya rahatsız etme" },
  { reason: "spam", label: "Spam veya reklam" },
  { reason: "other", label: "Başka bir sebep" },
];

function useNow(ms: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export function Chat(props: {
  chat: ChatState;
  onSend: (text: string) => void;
  onTyping: () => void;
  onWant: (want: boolean) => void;
  onNextTopic: () => void;
  onLeave: () => void;
  onReport: (reason: ReportReason) => void;
}) {
  const { chat } = props;
  const now = useNow(250);
  const [text, setText] = useState("");
  const [sheet, setSheet] = useState<"menu" | "report" | null>(null);
  const [inputActivity, setInputActivity] = useState(0);
  const msgsRef = useRef<HTMLDivElement>(null);
  const topicRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const remaining = Math.max(0, chat.endsAt - now);
  const warn = remaining > 0 && remaining <= WARN_MS;
  const capped = chat.ext >= chat.maxExt;
  const typing = now < chat.typingUntil;
  const quiet = now - Math.max(chat.lastActivity, inputActivity) >= QUIET_AFTER_MS && !typing && !text;

  useLayoutEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.items.length, typing, warn]);

  // When the keyboard opens the message list shrinks; keep the latest message in view.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const keepBottom = () => { const el = msgsRef.current; if (el) el.scrollTop = el.scrollHeight; };
    vv.addEventListener("resize", keepBottom);
    return () => vv.removeEventListener("resize", keepBottom);
  }, []);

  // Replay the topic flip when the topic changes (not on first render).
  const firstTopic = useRef(true);
  useEffect(() => {
    if (firstTopic.current) { firstTopic.current = false; return; }
    const t = topicRef.current;
    if (!t) return;
    t.classList.remove("flip");
    void t.offsetWidth;
    t.classList.add("flip");
  }, [chat.topicKey]);

  // Replay the extension feedback: bar refills, clock flashes once.
  useEffect(() => {
    if (!chat.extKey) return;
    const c = clockRef.current, b = barRef.current;
    if (c) { c.classList.remove("flash"); void c.offsetWidth; c.classList.add("flash"); }
    if (b) { b.classList.add("refill"); const id = setTimeout(() => b.classList.remove("refill"), 1500); return () => clearTimeout(id); }
  }, [chat.extKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    props.onSend(t);
    setText("");
  };

  return (
    <section className="screen" id="s-chat">
      <div className="pad chat-top">
        <div className="chat-head">
          <Avatar name={chat.partner.name} color={chat.partner.color} />
          <div className="who"><b>{chat.partner.name}</b><small>{chat.ext + 1}. tur</small></div>
          <span className={`clock${warn ? " warn" : ""}`} ref={clockRef} aria-label="Kalan süre">{fmt(remaining)}</span>
          <button className="menu-btn" aria-label="Seçenekler" onClick={() => setSheet("menu")}>{Icons.dots}</button>
        </div>
        <div className={`bar${warn ? " warn" : ""}`} ref={barRef}>
          <i style={{ width: `${(remaining / chat.roundMs) * 100}%` }} />
        </div>
        <div className={`topic${quiet ? " quiet" : ""}`} ref={topicRef}>
          <div className="topic-text">
            <span className="label">Örnek konu</span>
            <p>{chat.topic}</p>
            {quiet && <p className="quiet-hint"><i />Biraz sessiz kaldınız. Yeni bir konu?</p>}
          </div>
          <button aria-label="Konu kartını değiştir" onClick={props.onNextTopic}>
            {Icons.refresh}<span>Değiştir</span>
          </button>
        </div>
      </div>

      <div className="pad msgs" ref={msgsRef} aria-live="polite" style={{ ["--pc" as string]: chat.partner.color }}>
        {chat.items.map((it) =>
          it.kind === "blocked" ? (
            <BlockedMessage key={it.key} text={it.text} />
          ) : (
            <div key={it.key} className={`msg ${it.kind === "ext" ? "sys ext" : it.kind}`}>{it.text}</div>
          ),
        )}
        {typing && <div className="typing"><i /><i /><i /></div>}
      </div>

      <div className="pad chat-foot">
        {/* The extension choice only appears in the last 30 seconds, as one compact row. */}
        {warn && !capped && (
          <button className="extend-mini" aria-pressed={chat.want} onClick={() => props.onWant(!chat.want)}>
            {Icons.clockPlus}
            <span className="t">
              <b>{chat.want ? "Devam etmek istiyorsun" : "Devam etmek ister misin?"}</b>
              <small>Karşı taraf seçimini görmez · {chat.ext}/{chat.maxExt}</small>
            </span>
            <span className="switch" aria-hidden="true" />
          </button>
        )}
        {warn && capped && <p className="last-round">Son tur · uzatma hakkı doldu</p>}
        <form className="composer" onSubmit={submit}>
          <div className="wrap">
            <input
              className="input"
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder="Mesaj yaz…"
              autoComplete="off"
              aria-label="Mesaj"
              value={text}
              onChange={(e) => { setText(e.target.value); setInputActivity(Date.now()); if (e.target.value) props.onTyping(); }}
            />
            {text.length >= 150 && <span className={`chars${text.length >= MAX_MESSAGE_LENGTH ? " full" : ""}`}>{text.length}/{MAX_MESSAGE_LENGTH}</span>}
            <button className="send" aria-label="Gönder" disabled={!text.trim()}>{Icons.arrowUp}</button>
          </div>
        </form>
      </div>

      {sheet === "menu" && (
        <Sheet onClose={() => setSheet(null)}>
          <button className="opt" onClick={() => setSheet("report")}>Bildir</button>
          <button className="opt danger" onClick={() => { setSheet(null); props.onLeave(); }}>Sohbetten ayrıl</button>
          <button className="opt plain" onClick={() => setSheet(null)}>Vazgeç</button>
        </Sheet>
      )}
      {sheet === "report" && (
        <Sheet onClose={() => setSheet(null)}>
          <h3>Neden bildiriyorsun?</h3>
          <p>Sohbet hemen sona erer. Karşı taraf kimin bildirdiğini görmez.</p>
          {REPORTS.map((r) => (
            <button key={r.reason} className="opt" onClick={() => { setSheet(null); props.onReport(r.reason); }}>{r.label}</button>
          ))}
          <button className="opt plain" onClick={() => setSheet(null)}>Vazgeç</button>
        </Sheet>
      )}
    </section>
  );
}

function BlockedMessage({ text }: { text: string }) {
  return (
    <>
      <div className="msg me blocked">{text}</div>
      <div className="blocked-note">{Icons.alert}Gönderilmedi: Küfür veya hakaret içeriyor.</div>
    </>
  );
}

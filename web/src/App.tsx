import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchPayload, Profile, ReportReason } from "../../shared/protocol";
import { containsProfanity } from "../../shared/filter";
import { connect, fetchToken, loadProfile, saveProfile, type KKSocket } from "./lib";
import { Login } from "./screens/Login";
import { Wait } from "./screens/Wait";
import { Chat, type ChatState, type Item } from "./screens/Chat";
import { End, type EndKind } from "./screens/End";

type Screen = "login" | "wait" | "chat" | "end";

const MATCH_REVEAL_MS = 1400;
let itemKey = 0;
const item = (kind: Item["kind"], text: string): Item => ({ key: ++itemKey, kind, text } as Item);

export function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [busy, setBusy] = useState(false);
  const [nameError, setNameError] = useState<"bad_name" | null>(null);
  const [bannedUntil, setBannedUntil] = useState<number | null>(null);
  const [connected, setConnected] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [waitTopic, setWaitTopic] = useState("");
  const [matched, setMatched] = useState<Profile | null>(null);
  const [chat, setChat] = useState<ChatState | null>(null);
  const [endReason, setEndReason] = useState<EndKind>("time");

  const socketRef = useRef<KKSocket | null>(null);
  const screenRef = useRef<Screen>(screen);
  screenRef.current = screen;
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const revealTimer = useRef<number>();

  useEffect(() => saveProfile(profile), [profile]);

  const goEnd = useCallback((reason: EndKind) => {
    window.clearTimeout(revealTimer.current);
    setEndReason(reason);
    setMatched(null);
    setChat(null);
    setScreen("end");
  }, []);

  /** Ask the server for a partner. Used from login, end screen and after reconnecting. */
  const join = useCallback(() => {
    const s = socketRef.current;
    if (!s) return;
    setBusy(true);
    s.emit("join", profileRef.current, (res) => {
      setBusy(false);
      if (res.ok) {
        setNameError(null);
        setBannedUntil(null);
        setWaitTopic(res.topic);
        setMatched(null);
        setScreen("wait");
      } else if (res.error === "bad_name") {
        setNameError("bad_name");
        setScreen("login");
      } else if (res.error === "banned") {
        setBannedUntil(res.until ?? null);
        setScreen("login");
      } else if (res.error !== "busy") {
        setScreen("login");
      }
    });
  }, []);

  // ---------- socket ----------
  useEffect(() => {
    let socket: KKSocket | null = null;
    let cancelled = false;

    (async () => {
      let token: string;
      try {
        token = await fetchToken();
      } catch (e) {
        setFatal((e as Error).message === "rate" ? "Bu ağdan çok fazla yeni bağlantı geldi. Biraz sonra tekrar dene." : "Sunucuya ulaşılamadı. Sayfayı yenileyip tekrar dene.");
        return;
      }
      if (cancelled) return;
      socket = connect(token);
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        // The server forgets the queue on disconnect; rejoin if we were still searching.
        if (screenRef.current === "wait") join();
      });
      socket.on("disconnect", () => {
        setConnected(false);
        if (screenRef.current === "chat") goEnd("connection");
      });
      socket.on("connect_error", async (err) => {
        setConnected(false);
        if (err.message === "unauthorized" && socket) {
          // Token no longer valid (e.g. the server secret changed): get a new identity.
          try { socket.auth = { token: await fetchToken(true) }; socket.connect(); } catch { /* retry later */ }
        }
      });

      socket.on("match", (m: MatchPayload) => {
        const offset = Date.now() - m.serverNow; // local minus server
        const now = Date.now();
        setChat({
          partner: m.partner,
          topic: m.topic,
          topicKey: 0,
          endsAt: m.endsAt + offset,
          roundMs: m.roundMs,
          ext: m.ext,
          maxExt: m.maxExt,
          want: false,
          items: [item("sys", `${m.partner.name} ile eşleştin. Süre başladı.`)],
          typingUntil: 0,
          lastActivity: now,
          extKey: 0,
        });
        setWaitTopic(m.topic);
        setMatched(m.partner);
        revealTimer.current = window.setTimeout(() => setScreen("chat"), MATCH_REVEAL_MS);
      });

      socket.on("message", (m) => {
        setChat((c) => c && { ...c, items: [...c.items, item("them", m.text)], typingUntil: 0, lastActivity: Date.now() });
      });
      socket.on("typing", () => {
        setChat((c) => c && { ...c, typingUntil: Date.now() + 3000 });
      });
      socket.on("topic", (t) => {
        setChat((c) => c && {
          ...c,
          topic: t.topic,
          topicKey: c.topicKey + 1,
          lastActivity: Date.now(),
          items: [...c.items, item("sys", t.by === "me" ? "Konu kartını değiştirdin." : `${c.partner.name} konu kartını değiştirdi.`)],
        });
      });
      socket.on("extended", (e) => {
        const offset = Date.now() - e.serverNow;
        setChat((c) => c && {
          ...c,
          ext: e.ext,
          endsAt: e.endsAt + offset,
          want: false,
          extKey: c.extKey + 1,
          items: [...c.items, item("ext", `+${c.roundMs >= 60_000 ? `${Math.round(c.roundMs / 60_000)} dk` : `${Math.round(c.roundMs / 1000)} sn`} · Süre uzadı (${e.ext}/${c.maxExt})`)],
        });
      });
      socket.on("ended", (e) => goEnd(e.reason));
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(revealTimer.current);
      socket?.disconnect();
    };
  }, [goEnd, join]);

  // ---------- actions ----------
  const send = (text: string) => {
    if (containsProfanity(text)) {
      setChat((c) => c && { ...c, items: [...c.items, item("blocked", text)] });
      return;
    }
    socketRef.current?.emit("send", text, (res) => {
      setChat((c) => {
        if (!c) return c;
        if (res.ok) return { ...c, items: [...c.items, item("me", text)], lastActivity: Date.now() };
        if (res.error === "blocked") return { ...c, items: [...c.items, item("blocked", text)] };
        return c;
      });
    });
  };
  const want = (w: boolean) => {
    setChat((c) => c && { ...c, want: w });
    socketRef.current?.emit("want", w);
  };
  const report = (reason: ReportReason) => socketRef.current?.emit("report", reason, () => undefined);
  const cancel = () => {
    socketRef.current?.emit("cancel");
    setScreen("login");
  };

  if (fatal) {
    return (
      <div className="app">
        <div className="pad end-body"><div className="cell status-cell"><h2>Bağlanamadık</h2><p>{fatal}</p></div></div>
      </div>
    );
  }

  return (
    <div className="app">
      {!connected && screen !== "login" && <div className="conn" role="status">Bağlantı koptu, yeniden bağlanılıyor…</div>}
      {screen === "login" && (
        <Login
          profile={profile}
          onProfile={(p) => { setNameError(null); setProfile(p); }}
          onStart={join}
          busy={busy || !connected}
          serverError={nameError}
          bannedUntil={bannedUntil}
        />
      )}
      {screen === "wait" && <Wait me={profile} topic={waitTopic} partner={matched} onCancel={cancel} />}
      {screen === "chat" && chat && (
        <Chat
          chat={chat}
          onSend={send}
          onTyping={() => socketRef.current?.emit("typing")}
          onWant={want}
          onNextTopic={() => socketRef.current?.emit("nextTopic")}
          onLeave={() => socketRef.current?.emit("leave")}
          onReport={report}
        />
      )}
      {screen === "end" && <End reason={endReason} onAgain={join} onRest={() => setScreen("login")} />}
    </div>
  );
}

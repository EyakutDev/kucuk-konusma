import { useEffect, useRef, useState } from "react";
import { COLORS, NAME_MAX, NAME_MIN, type Profile } from "../../../shared/protocol";
import { containsProfanity } from "../../../shared/filter";
import { Avatar, Brand, Icons, PrivacySheet, RulesSheet } from "../components/ui";
import { clockTime, fmt, randomName } from "../lib";

const RING = 213.63; // circumference of r=34

/** Looping 2:00 countdown in the hero: shows the core idea without words. */
function HeroRing() {
  const prog = useRef<SVGCircleElement>(null);
  const [label, setLabel] = useState("2:00");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const LOOP = 9000, start = performance.now();
    const id = setInterval(() => {
      const t = ((performance.now() - start) % LOOP) / LOOP;
      prog.current?.style.setProperty("stroke-dashoffset", String(RING * t));
      setLabel(fmt(120_000 * (1 - t)));
    }, 100);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="ring-wrap" aria-hidden="true">
      <svg className="ring" viewBox="0 0 80 80">
        <circle className="track" cx="40" cy="40" r="34" />
        <circle className="prog" ref={prog} cx="40" cy="40" r="34" />
      </svg>
      <b>{label}</b>
    </div>
  );
}

export function Login(props: {
  profile: Profile;
  onProfile: (p: Profile) => void;
  onStart: () => void;
  busy: boolean;
  serverError: "bad_name" | null;
  bannedUntil: number | null;
}) {
  const { profile, onProfile } = props;
  const [sheet, setSheet] = useState<"rules" | "privacy" | null>(null);
  const [localBad, setLocalBad] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const bad = localBad || props.serverError === "bad_name";
  const start = () => {
    const name = profile.name.trim();
    if (name.length < NAME_MIN || containsProfanity(name)) {
      setLocalBad(true);
      nameRef.current?.focus();
      return;
    }
    props.onStart();
  };

  return (
    <section className="screen" id="s-login">
      <div className="pad topbar">
        <Brand />
        <button className="chip-btn" onClick={() => setSheet("rules")}>Kurallar</button>
      </div>
      <div className="pad login-body">
        <div className="bento">
          <div className="cell hero span2">
            <div className="hero-text">
              <h1><span>Bir yabancı.</span><span>İki dakika.</span></h1>
              <p>İkiniz de isterseniz süre uzar. İstemezseniz yeni birine geçersiniz.</p>
            </div>
            <HeroRing />
          </div>
          <div className="cell span2 identity">
            <div className="id-head"><label className="label" htmlFor="name">Seni böyle görecekler</label><span>Hesap yok</span></div>
            <div className="id-preview">
              <div className="idp-head">
                <Avatar name={profile.name} color={profile.color} />
                <div className="idp-name">
                  <input
                    ref={nameRef}
                    className={`name-inline${bad ? " bad" : ""}`}
                    id="name"
                    maxLength={NAME_MAX}
                    autoComplete="off"
                    aria-label="Rumuz"
                    value={profile.name}
                    onChange={(e) => { setLocalBad(false); onProfile({ ...profile, name: e.target.value }); }}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                  />
                  <button type="button" className="idp-edit" aria-label="Rumuzu düzenle" onClick={() => { nameRef.current?.focus(); nameRef.current?.select(); }}>
                    {Icons.pencil}
                  </button>
                </div>
                <span className="idp-round">1. tur</span>
                <button className="icon-btn sm" aria-label="Başka rumuz öner" onClick={() => { setLocalBad(false); onProfile({ ...profile, name: randomName(profile.name) }); }}>
                  {Icons.shuffle}
                </button>
              </div>
              <div className="idp-msg" aria-hidden="true">
                <span className="mini-av" style={{ background: profile.color }} />
                <span className="idp-bubble">Selam!</span>
                <span className="idp-typing"><i /><i /><i /></span>
              </div>
            </div>
            {bad && <p className="err">Bu rumuz kullanılamaz. Başka bir rumuz seç.</p>}
            <div className="colors" role="group" aria-label="Renk">
              {COLORS.map((c, i) => (
                <button
                  key={c}
                  className="swatch"
                  style={{ background: c }}
                  aria-label={`Renk ${i + 1}`}
                  aria-pressed={profile.color === c}
                  onClick={() => onProfile({ ...profile, color: c })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="pad login-foot">
        {props.bannedUntil && (
          <p className="banned">
            Bu cihaz kurallara uyulmadığı için bir süreliğine uzaklaştırıldı. {clockTime(props.bannedUntil)} itibarıyla tekrar deneyebilirsin.
          </p>
        )}
        <button className="btn" onClick={start} disabled={props.busy}>
          18 yaşından büyüğüm, başla {Icons.arrowRight}
        </button>
        <p className="foot-note">Sohbet bitince mesajlar silinir. <button onClick={() => setSheet("privacy")}>Gizlilik</button></p>
      </div>
      {sheet === "rules" && <RulesSheet onClose={() => setSheet(null)} />}
      {sheet === "privacy" && <PrivacySheet onClose={() => setSheet(null)} />}
    </section>
  );
}

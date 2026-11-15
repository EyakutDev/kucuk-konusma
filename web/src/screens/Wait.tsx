import { useEffect, useRef } from "react";
import type { Profile } from "../../../shared/protocol";
import { Brand, Icons } from "../components/ui";
import { initials } from "../lib";

/**
 * Rings leave the centre of the search area like a stone dropped in water.
 * Radius grows with p^1.9, so rings spread out (get sparser) further away.
 * When `stopped` turns true no new rings start and the last ones drift out.
 */
function Ripples({ stopped }: { stopped: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stopAt = useRef<number>(Infinity);

  useEffect(() => {
    if (stopped && stopAt.current === Infinity) stopAt.current = performance.now();
  }, [stopped]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    let raf = 0;
    const PERIOD = 850, LIFE = 4600;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const screen = cv.parentElement!;
      const meet = screen.querySelector(".meet");
      if (!meet) return;
      const w = screen.clientWidth, h = screen.clientHeight, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const m = meet.getBoundingClientRect(), sr = screen.getBoundingClientRect();
      const cx = m.left - sr.left + m.width / 2, cy = m.top - sr.top + m.height / 2;
      const R = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 20;
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim();
      const ring = (p: number) => {
        ctx.globalAlpha = 0.6 * Math.pow(1 - p, 1.3);
        ctx.lineWidth = 0.6 + 2 * (1 - p);
        ctx.beginPath();
        ctx.arc(cx, cy, 46 + (R - 46) * Math.pow(p, 1.9), 0, Math.PI * 2);
        ctx.stroke();
      };
      if (reduce) [0.12, 0.3, 0.52, 0.78].forEach(ring);
      else {
        const t = now - t0, stop = stopAt.current - t0;
        for (let k = Math.max(0, Math.floor((t - LIFE) / PERIOD)); k * PERIOD <= t; k++) {
          const born = k * PERIOD;
          if (born > stop) break;
          const p = (t - born) / LIFE;
          if (p >= 0 && p <= 1) ring(p);
        }
      }
      ctx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas className="ripples" ref={canvas} aria-hidden="true" />;
}

export function Wait({ me, topic, partner, onCancel }: { me: Profile; topic: string; partner: Profile | null; onCancel: () => void }) {
  return (
    <section className="screen" id="s-wait">
      <Ripples stopped={!!partner} />
      <div className="pad topbar"><Brand /></div>
      <div className="pad wait-body">
        <div className="bento">
          <div className={`cell span2 search-cell${partner ? " matched" : ""}`}>
            <div className="meet" aria-hidden="true">
              <div className="meet-line" />
              <div className="meet-me" style={{ background: me.color }}>{initials(me.name)}</div>
              <div className="meet-them" style={partner ? { background: partner.color } : undefined}>{partner ? initials(partner.name) : "?"}</div>
            </div>
            <p className="wait-title" aria-live="polite">{partner ? `${partner.name} ile eşleştin` : "Biri aranıyor…"}</p>
            <p className="wait-tip">{partner ? "Sohbet başlıyor." : "Rastgele biriyle eşleşeceksin."}</p>
          </div>
          <div className="cell span2 topic-cell">
            <span className="label">Örnek konu</span>
            <p>{topic}</p>
            <small>İstersen bununla başla, istersen başka bir şeyden konuş.</small>
          </div>
          <div className="cell tip-cell">
            {Icons.eyeOff}
            <p>Devam isteğin karşı tarafa görünmez.</p>
          </div>
          <div className="cell tip-cell">
            {Icons.shield}
            <p>Telefon, adres gibi bilgilerini paylaşma.</p>
          </div>
        </div>
      </div>
      <div className="pad wait-foot"><button className="btn ghost" onClick={onCancel} disabled={!!partner}>Vazgeç</button></div>
    </section>
  );
}

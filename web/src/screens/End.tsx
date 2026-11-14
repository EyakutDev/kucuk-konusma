import type { ReactNode } from "react";
import type { EndReason } from "../../../shared/protocol";
import { Brand, Icons } from "../components/ui";

export type EndKind = EndReason | "connection";

const COPY: Record<EndKind, [string, string]> = {
  time: ["Süre doldu", "Sohbet sona erdi. Sıradaki kişi seni bekliyor olabilir."],
  cap: ["Sohbet tamamlandı", "Bu sohbetteki iki uzatma hakkı da kullanıldı."],
  left: ["Sohbetten ayrıldın", "Karşı taraf yalnızca sohbetin sona erdiğini görür."],
  report: ["Bildirimin alındı", "Teşekkürler. Bu kişiyle bir daha eşleşmeyeceksin."],
  ended: ["Sohbet sona erdi", "Sıradaki kişi seni bekliyor olabilir."],
  connection: ["Bağlantı koptu", "İnternet bağlantın kesildiği için sohbet sona erdi."],
};

const ICON: Record<EndKind, ReactNode> = {
  time: (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="3" strokeLinecap="round"><circle className="ring-empty" cx="16" cy="16" r="12" /><path d="M16 9v7" stroke="currentColor" /></svg>
  ),
  ended: (
    <svg viewBox="0 0 32 32" fill="none" strokeWidth="3" strokeLinecap="round"><circle className="ring-empty" cx="16" cy="16" r="12" /><path d="M16 9v7" stroke="currentColor" /></svg>
  ),
  cap: (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="16" cy="16" r="12" /><path d="m11 16.5 3.5 3.5 6.5-7" /></svg>
  ),
  left: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M9 16l-4-4 4-4" /><path d="M5 12h10" /></svg>
  ),
  report: Icons.shield,
  connection: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8.8a15 15 0 0 1 4.2-2.6M22 8.8A15 15 0 0 0 10 5.1" /><path d="M5 12.5a10 10 0 0 1 5.2-2.7M19 12.5a10 10 0 0 0-2.2-1.6" /><path d="M8.5 16.1a5 5 0 0 1 7 0" /><circle cx="12" cy="19.5" r=".8" fill="currentColor" /><path d="M3 3l18 18" /></svg>
  ),
};

export function End({ reason, onAgain, onRest }: { reason: EndKind; onAgain: () => void; onRest: () => void }) {
  const [title, text] = COPY[reason];
  return (
    <section className="screen" id="s-end">
      <div className="pad topbar"><Brand /></div>
      <div className="pad end-body">
        <div className="bento">
          <div className="cell span2 status-cell">
            <div className="status-icon" aria-hidden="true">{ICON[reason]}</div>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <button className="cell span2 next-cell" onClick={onAgain}>
            <span className="next-text"><b>Yeni eşleşme</b><small>Rastgele biri, yeni bir konu</small></span>
            <span className="next-arrow" aria-hidden="true">{Icons.arrowRight}</span>
          </button>
          <button className="cell span2 mini-cell rest-cell" onClick={onRest}>
            {Icons.moon}
            <span>Ara ver</span>
          </button>
        </div>
      </div>
    </section>
  );
}

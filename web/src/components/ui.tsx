import type { ReactNode } from "react";
import { initials } from "../lib";

export function BrandIcon() {
  return (
    <svg className="brand-icon" viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="23" fill="#D04A33" />
      <path d="M34 18H66A16 16 0 0 1 82 34V52A16 16 0 0 1 66 68H46L27 82L31 68H34A16 16 0 0 1 18 52V34A16 16 0 0 1 34 18Z" fill="#FFFFFF" />
      <circle cx="50" cy="43" r="12" fill="none" stroke="#FBECE8" strokeWidth="5" />
      <path d="M50 31A12 12 0 1 1 39.14 48.11" fill="none" stroke="#D04A33" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <BrandIcon />
      Küçük Konuşma
    </div>
  );
}

export function Avatar({ name, color, className = "", id }: { name: string; color: string; className?: string; id?: string }) {
  return (
    <div className={`avatar ${className}`} style={{ background: color }} id={id} aria-hidden="true">
      {initials(name)}
    </div>
  );
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </>
  );
}

export function RulesSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h3>Kurallar</h3>
      <ol>
        <li>Nazik ol. Küfür ve hakaret içeren mesajlar gönderilmez.</li>
        <li>Kişisel bilgilerini (telefon, adres, sosyal medya) paylaşma.</li>
        <li>Rahatsız olursan sohbet menüsünden bildir.</li>
      </ol>
      <p>Kurallara uymayan cihazlar uygulamadan uzaklaştırılır.</p>
      <button className="opt plain" onClick={onClose}>Kapat</button>
    </Sheet>
  );
}

export function PrivacySheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <h3>Gizlilik</h3>
      <p>Hesap yok; adın, e-postan ya da telefon numaran istenmez. Tarayıcına yalnızca rastgele bir cihaz kimliği kaydedilir.</p>
      <p>Sohbet bitince mesajlar senin ve karşı tarafın ekranından silinir; kimse geri açamaz.</p>
      <p>Bildirimleri inceleyebilmek için mesajlar sunucuda 3 gün saklanır, sonra kalıcı olarak silinir.</p>
      <button className="opt plain" onClick={onClose}>Kapat</button>
    </Sheet>
  );
}

export const Icons = {
  shuffle: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" /></svg>
  ),
  pencil: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></svg>
  ),
  arrowRight: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
  ),
  arrowUp: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="m6 11 6-6 6 6" /></svg>
  ),
  dots: (
    <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
  ),
  refresh: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" /></svg>
  ),
  clockPlus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12.5A8.5 8.5 0 1 1 12 3.5" /><path d="M12 7.5V12l3 2" /><path className="plus" d="M19 3v5M16.5 5.5h5" /></svg>
  ),
  eyeOff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="m9 12 2 2 4-4" /></svg>
  ),
  moon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.5" /></svg>
  ),
};

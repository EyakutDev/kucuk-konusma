import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

// Size the app to the *visible* part of the screen. On phones the on-screen keyboard
// shrinks the visual viewport but not the layout viewport (iOS Safari), so 100% height
// would leave the composer and messages hidden behind the keyboard. The "kb" class
// switches the chat to a compact layout whenever the visible height is small.
const COMPACT_BELOW = 620;
function syncViewport() {
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  const root = document.documentElement;
  root.style.setProperty("--vv-h", `${h}px`);
  root.style.setProperty("--vv-top", `${vv ? vv.offsetTop : 0}px`);
  root.classList.toggle("kb", h < COMPACT_BELOW);
}
window.visualViewport?.addEventListener("resize", syncViewport);
window.visualViewport?.addEventListener("scroll", syncViewport);
window.addEventListener("resize", syncViewport);
syncViewport();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

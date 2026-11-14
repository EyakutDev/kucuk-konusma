import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The web app lives in web/; in dev, API and socket traffic go to the Node server on :3000.
export default defineConfig({
  root: "web",
  plugins: [react()],
  build: { outDir: "../dist/web", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
      "/socket.io": { target: "http://localhost:3000", ws: true },
    },
  },
});

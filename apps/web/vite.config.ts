import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const API = "http://localhost:4500";

export default defineConfig({
  define: {
    // Busts the offline query cache when a new build ships.
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      // Custom worker: precache + notification clicks (Mark done / Snooze).
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // The manifest is hand-written in public/manifest.webmanifest.
      manifest: false,
      // Registered from src/lib/pwa.ts so the app can offer "Reload to update".
      injectRegister: false,
      registerType: "prompt",
      devOptions: { enabled: true, type: "module" },
      injectManifest: {
        // The whole app shell is precached, so it opens with no connection.
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2,webmanifest}"],
      },
    }),
  ],
  resolve: {
    dedupe: ["@tanstack/react-query", "react", "react-dom"],
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@api": fileURLToPath(new URL("../api/src", import.meta.url)),
      $: fileURLToPath(new URL("../api/src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": { target: API, changeOrigin: true },
    },
  },
});

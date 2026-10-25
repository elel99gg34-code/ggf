import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Tauri 개발 서버는 1420 포트를 쓴다 (tauri.conf.json의 devUrl과 맞춘다).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 1420, strictPort: true },
  preview: { port: 1420, strictPort: true },
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: { target: "es2021", outDir: "dist", chunkSizeWarningLimit: 1500 },
});

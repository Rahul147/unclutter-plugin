import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json";

export default defineConfig(({ command }) => {
  const isDev = command === "serve";
  const manifestForEnv = JSON.parse(JSON.stringify(manifest));
  if (isDev) {
    delete manifestForEnv.icons;
    manifestForEnv.host_permissions = Array.from(
      new Set([
        ...(manifestForEnv.host_permissions || []),
        "http://localhost:5173/*",
        "http://127.0.0.1:5173/*",
      ])
    );
  }

  return {
    plugins: [crx({ manifest: manifestForEnv })],
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      cors: {
        origin: ["chrome-extension://*", "*"],
        methods: ["GET", "HEAD", "OPTIONS"],
        allowedHeaders: ["*"],
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
      hmr: {
        host: "127.0.0.1",
        protocol: "ws",
        port: 5173,
      },
    },
    build: {
      sourcemap: true,
      target: "es2022",
      // Let CRXJS manage inputs; it injects HTML and service worker entries
    },
  };
});

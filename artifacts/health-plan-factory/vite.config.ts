import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

const basePath = process.env.BASE_PATH ?? "/";

// Expose Supabase config to the browser via VITE_ env vars.
// These are forwarded from the server-side secrets so the browser client can initialise.
const supabaseDefines: Record<string, string> = {};
if (process.env.SUPABASE_URL) {
  supabaseDefines["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(process.env.SUPABASE_URL);
}
if (process.env.SUPABASE_ANON_KEY) {
  supabaseDefines["import.meta.env.VITE_SUPABASE_ANON_KEY"] = JSON.stringify(process.env.SUPABASE_ANON_KEY);
}

export default defineConfig({
  base: basePath,
  define: supabaseDefines,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/e2e/**"],
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});

import { defineConfig, loadEnv, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ["./client", "./shared", "./vendor"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ""),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ""),
  },
  build: {
    outDir: "dist/spa",
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react"],
        },
      },
    },
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./vendor/cms-core/client"),
      "@shared": path.resolve(__dirname, "./vendor/cms-core/shared"),
      "@site": path.resolve(__dirname, "./client"),
    },
  },
};
});

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      let expressApp: any = null;
      let ready = false;

      // Load Express asynchronously so Vite starts serving immediately
      import("./server").then(({ createServer }) => {
        expressApp = createServer();
        ready = true;
      });

      server.middlewares.use((req, res, next) => {
        if (ready) {
          expressApp(req, res, next);
        } else {
          next(); // Pass through to Vite while Express loads
        }
      });
    },
  };
}

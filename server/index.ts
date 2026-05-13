import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { handleDemo } from "./routes/demo";
import {
  generateSitemapIndex,
  generatePagesSitemap,
  generatePostsSitemap,
} from "./lib/generateSitemap";

const PUBLIC_CMS_RESOURCE_PATTERN = /^(pages|posts|site_settings_public|blog_sidebar_settings|cms_forms)\?/;

function getPublicCmsConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

// Lazy-load Netlify function handlers (dev server only)
// These are only used as proxies during development
let searchReplaceHandler: any;
let inviteUserHandler: any;
let deleteUserHandler: any;
let publishHandler: any;
let triggerQaHandler: any;
let qaGetLatestRunHandler: any;
let qaRunStatusHandler: any;
let qaListRunsHandler: any;
let qaReportHandler: any;
let bulkImportHandler: any;
let bulkImportFetchHandler: any;
let aiMigrationAssistHandler: any;

// Flag prevents retry loop on every request when a handler fails to load
let handlersLoaded = false;

const loadHandlers = async () => {
  if (handlersLoaded) return;
  handlersLoaded = true; // Set immediately to prevent concurrent retries

  // Use process.cwd() (always the project root, regardless of where Vite's
  // module runner places its temp bundle) to build absolute import paths.
  // Relative paths like "../vendor/..." resolve from node_modules/.vite-temp/
  // at runtime which is wrong.
  const fnDir = path.resolve(process.cwd(), "vendor/cms-core/netlify/functions");

  const tryLoad = async (name: string): Promise<any> => {
    try {
      // Dynamic import with absolute path + .ts extension so Vite's module
      // runner can find and transform the TypeScript file.
      // vite-ignore suppresses the static analysis warning for the dynamic path.
      return await import(/* @vite-ignore */ path.join(fnDir, name + ".ts"));
    } catch (err) {
      console.warn(
        `[dev] Could not load Netlify function "${name}":`,
        err instanceof Error ? err.message : err,
      );
      return null;
    }
  };

  const [searchReplace, inviteUser, deleteUser, publish, triggerQa, qaGetLatestRun, qaRunStatus, qaListRuns, qaReport, bulkImport, bulkImportFetch, aiMigrationAssist] =
    await Promise.all([
      tryLoad("search-replace"),
      tryLoad("invite-user"),
      tryLoad("delete-user"),
      tryLoad("publish"),
      tryLoad("trigger-qa"),
      tryLoad("qa-get-latest-run"),
      tryLoad("qa-run-status"),
      tryLoad("qa-list-runs"),
      tryLoad("qa-report"),
      tryLoad("bulk-import"),
      tryLoad("bulk-import-fetch"),
      tryLoad("ai-migration-assist"),
    ]);

  searchReplaceHandler = searchReplace?.handler ?? null;
  inviteUserHandler = inviteUser?.handler ?? null;
  deleteUserHandler = deleteUser?.handler ?? null;
  publishHandler = publish?.handler ?? null;
  triggerQaHandler = triggerQa?.handler ?? null;
  qaGetLatestRunHandler = qaGetLatestRun?.handler ?? null;
  qaRunStatusHandler = qaRunStatus?.handler ?? null;
  qaListRunsHandler = qaListRuns?.handler ?? null;
  qaReportHandler = qaReport?.handler ?? null;
  bulkImportHandler = bulkImport?.handler ?? null;
  bulkImportFetchHandler = bulkImportFetch?.handler ?? null;
  aiMigrationAssistHandler = aiMigrationAssist?.handler ?? null;
};

export function createServer() {
  const app = express();

  // Security middleware — mirrors production Netlify headers in dev
  // CSP and COEP are relaxed so Vite HMR and inline scripts work locally
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Middleware
  const allowedOrigin = process.env.ALLOWED_ORIGIN || process.env.URL;
  app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Load handlers on first request (lazy loading)
  app.use(async (req, res, next) => {
    if (!handlersLoaded) {
      await loadHandlers();
    }
    next();
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.post("/", (req, res, next) => {
    const formName = typeof req.body?.["form-name"] === "string"
      ? req.body["form-name"].trim()
      : "";

    if (!formName) {
      next();
      return;
    }

    const submission = Object.entries(req.body || {}).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        if (Array.isArray(value)) {
          accumulator[key] = value.map((entry) => String(entry)).join(", ");
        } else if (value != null) {
          accumulator[key] = String(value);
        }
        return accumulator;
      },
      {},
    );

    console.info(`[dev] Simulated Netlify form submission received for "${formName}"`, submission);
    res.status(200).json({ ok: true, simulated: true, formName });
  });

  app.get("/api/public-cms", async (req, res) => {
    const resource = typeof req.query.resource === "string" ? req.query.resource : "";

    if (!PUBLIC_CMS_RESOURCE_PATTERN.test(resource)) {
      return res.status(400).json({ error: "Invalid public CMS resource" });
    }

    const { url, anonKey } = getPublicCmsConfig();
    if (!url || !anonKey) {
      return res.status(500).json({ error: "Public CMS config is unavailable" });
    }

    try {
      const response = await fetch(`${url}/rest/v1/${resource}`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      const body = await response.text();
      res.status(response.status);
      res.type(response.headers.get("content-type") || "application/json");
      res.send(body);
    } catch (error) {
      console.error("Public CMS proxy error:", error);
      res.status(502).json({ error: "Failed to reach public CMS" });
    }
  });

  // Dev adapter for Netlify functions
  app.post("/.netlify/functions/search-replace", async (req, res) => {
    if (!searchReplaceHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await searchReplaceHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Search-replace dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for invite-user Netlify function
  app.post("/.netlify/functions/invite-user", async (req, res) => {
    if (!inviteUserHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await inviteUserHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Invite-user dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for delete-user Netlify function
  app.post("/.netlify/functions/delete-user", async (req, res) => {
    if (!deleteUserHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await deleteUserHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Delete-user dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for publish Netlify function
  app.post("/.netlify/functions/publish", async (req, res) => {
    if (!publishHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await publishHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Publish dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for trigger-qa Netlify function
  app.post("/.netlify/functions/trigger-qa", async (req, res) => {
    if (!triggerQaHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await triggerQaHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Trigger-qa dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for qa-get-latest-run Netlify function
  app.get("/.netlify/functions/qa-get-latest-run", async (req, res) => {
    if (!qaGetLatestRunHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await qaGetLatestRunHandler(
        {
          httpMethod: "GET",
          headers: req.headers as Record<string, string>,
          body: "",
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("QA get-latest-run dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for qa-list-runs Netlify function
  app.get("/.netlify/functions/qa-list-runs", async (req, res) => {
    if (!qaListRunsHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await qaListRunsHandler(
        {
          httpMethod: "GET",
          headers: req.headers as Record<string, string>,
          body: "",
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: (req.query as Record<string, string>) || null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("QA list-runs dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for qa-report Netlify function
  app.get("/.netlify/functions/qa-report", async (req, res) => {
    if (!qaReportHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await qaReportHandler(
        {
          httpMethod: "GET",
          headers: req.headers as Record<string, string>,
          body: "",
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: (req.query as Record<string, string>) || null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("QA report dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for qa-run-status Netlify function
  app.get("/.netlify/functions/qa-run-status", async (req, res) => {
    if (!qaRunStatusHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await qaRunStatusHandler(
        {
          httpMethod: "GET",
          headers: req.headers as Record<string, string>,
          body: "",
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: (req.query as Record<string, string>) || null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("QA run-status dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for bulk-import Netlify function
  app.post("/.netlify/functions/bulk-import", async (req, res) => {
    if (!bulkImportHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await bulkImportHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Bulk-import dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for bulk-import-fetch Netlify function
  app.post("/.netlify/functions/bulk-import-fetch", async (req, res) => {
    if (!bulkImportFetchHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await bulkImportFetchHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("Bulk-import-fetch dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dev adapter for ai-migration-assist Netlify function
  app.post("/.netlify/functions/ai-migration-assist", async (req, res) => {
    if (!aiMigrationAssistHandler) {
      return res.status(503).json({ error: "Netlify functions not available" });
    }
    try {
      const result = await aiMigrationAssistHandler(
        {
          httpMethod: "POST",
          headers: req.headers as Record<string, string>,
          body: JSON.stringify(req.body),
          rawUrl: req.url,
          rawQuery: "",
          path: req.path,
          queryStringParameters: null,
          multiValueQueryStringParameters: null,
          multiValueHeaders: {},
          isBase64Encoded: false,
        } as any,
        {} as any,
      );
      if (result) {
        res.status(result.statusCode || 200);
        if (result.headers) {
          for (const [key, value] of Object.entries(result.headers)) {
            if (value) res.setHeader(key, String(value));
          }
        }
        res.send(result.body);
      } else {
        res.status(500).json({ error: "No response from handler" });
      }
    } catch (err) {
      console.error("AI-migration-assist dev proxy error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dynamic sitemaps — mirror the Netlify function architecture
  function getSiteUrl(req: express.Request): string {
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost:8080";
    return `${protocol}://${host}`;
  }

  app.get("/sitemap.xml", (req, res) => {
    try {
      const xml = generateSitemapIndex(getSiteUrl(req));
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap] Index error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/sitemap-pages.xml", async (req, res) => {
    try {
      const xml = await generatePagesSitemap(getSiteUrl(req));
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap] Pages error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  app.get("/sitemap-posts.xml", async (req, res) => {
    try {
      const xml = await generatePostsSitemap(getSiteUrl(req));
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      console.error("[Sitemap] Posts error:", err);
      res.status(500).send("Internal Server Error");
    }
  });

  return app;
}

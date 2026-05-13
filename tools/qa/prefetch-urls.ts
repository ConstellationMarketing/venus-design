/**
 * Pre-fetch script — run before Playwright tests to build urls.json.
 *
 * Queries Supabase (pages + posts tables) for all published URLs and writes
 * the result to tools/qa/urls.json so scan-site.spec.ts can read it
 * synchronously at module load time (required by Playwright's test model).
 *
 * Usage: tsx tools/qa/prefetch-urls.ts
 * Called automatically via the `qa` npm script before `playwright test`.
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { fetchPublishedUrls } from "./fetch-urls.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = process.env.QA_BASE_URL || "http://localhost:8080";
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[QA Prefetch] Missing required environment variables:\n" +
      "  VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.",
  );
  process.exit(1);
}

console.log("[QA Prefetch] Fetching published URLs from Supabase...");

const urls = await fetchPublishedUrls(supabaseUrl, supabaseAnonKey);

console.log(`\n[QA Prefetch] Discovered ${urls.length} URL(s):`);
for (const url of urls) {
  console.log(`  ${url}`);
}

const outPath = path.join(__dirname, "urls.json");
fs.writeFileSync(outPath, JSON.stringify(urls, null, 2), "utf-8");

console.log(`\n[QA Prefetch] Saved to ${outPath}`);

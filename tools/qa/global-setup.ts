/**
 * Playwright global setup — runs exactly once before any worker or test file
 * is loaded. This is the correct place to print the URL list so it appears
 * only once regardless of how many workers or projects Playwright spawns.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function globalSetup(): void {
  const urlsJsonPath = path.join(__dirname, 'urls.json');

  if (!fs.existsSync(urlsJsonPath)) {
    // The error will also be thrown inside scan-site.spec.ts at module load;
    // just skip here to avoid a duplicate message.
    return;
  }

  const urls: string[] = JSON.parse(fs.readFileSync(urlsJsonPath, 'utf-8'));

  console.log(`\n[QA] Scanning ${urls.length} published URL(s) from urls.json:`);
  for (const u of urls) {
    console.log(`  ${u}`);
  }
  console.log('');
}

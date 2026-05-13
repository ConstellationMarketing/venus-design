/**
 * qa-report — Netlify function that downloads and parses the QA report
 * artifact from GitHub Actions and returns a structured JSON report.
 *
 * GET /.netlify/functions/qa-report?runId={id}
 *
 * If runId is omitted the function looks up the latest completed run
 * automatically.
 *
 * The artifact zip produced by upload-artifact@v4 is parsed using fflate
 * (pure-JS DEFLATE/ZIP library, bundles cleanly with esbuild).
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { unzipSync } from 'fflate';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const githubToken = process.env.GITHUB_QA_TOKEN || process.env.GITHUB_TOKEN;
const githubRepository = process.env.GITHUB_REPOSITORY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || '*';

const GITHUB_HEADERS = {
  Authorization: `token ${githubToken}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'Jupiter-CMS-QA/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RawIssue {
  url: string;
  type: string;
  message: string;
}

type IssueSeverity = 'error' | 'warning' | 'info';

// ---------------------------------------------------------------------------
// ZIP extractor backed by fflate (pure JS, esbuild-friendly)
// ---------------------------------------------------------------------------

function extractFileFromZip(buffer: Buffer, targetFile: string): Buffer | null {
  try {
    const unzipped = unzipSync(new Uint8Array(buffer));
    for (const [name, data] of Object.entries(unzipped)) {
      if (name === targetFile || name.endsWith('/' + targetFile)) {
        return Buffer.from(data);
      }
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Issue severity classification
// ---------------------------------------------------------------------------

function getSeverity(type: string): IssueSeverity {
  if (type === 'http' || type === 'render') return 'error';
  if (type === 'links' || type === 'console' || type === 'conversion' || type === 'spelling')
    return 'warning';
  return 'info';
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

function buildReport(issues: RawIssue[], allUrls: string[]) {
  // Build a per-URL map including URLs with no issues
  const byUrl = new Map<string, RawIssue[]>();
  for (const url of allUrls) {
    byUrl.set(url, []);
  }
  for (const issue of issues) {
    const list = byUrl.get(issue.url) ?? [];
    list.push(issue);
    byUrl.set(issue.url, list);
  }

  const results = Array.from(byUrl.entries()).map(([url, urlIssues]) => {
    const hasError = urlIssues.some((i) => getSeverity(i.type) === 'error');
    const status =
      urlIssues.length === 0 ? 'pass' : hasError ? 'fail' : 'warning';
    return {
      url,
      status,
      issues: urlIssues.map((i) => ({
        type: i.type,
        message: i.message,
        severity: getSeverity(i.type),
      })),
      issueCount: urlIssues.length,
    };
  });

  const totalUrls = allUrls.length;
  const passedUrls = results.filter((r) => r.status === 'pass').length;
  const failedUrls = results.filter((r) => r.status === 'fail').length;
  const warningUrls = results.filter((r) => r.status === 'warning').length;
  const totalIssues = issues.length;

  const issuesByType: Record<string, number> = {};
  const issuesBySeverity: Record<string, number> = {};
  for (const issue of issues) {
    issuesByType[issue.type] = (issuesByType[issue.type] ?? 0) + 1;
    const sev = getSeverity(issue.type);
    issuesBySeverity[sev] = (issuesBySeverity[sev] ?? 0) + 1;
  }

  return {
    summary: {
      totalUrls,
      passedUrls,
      failedUrls,
      warningUrls,
      totalIssues,
      issuesByType,
      issuesBySeverity,
      passRate: totalUrls > 0 ? Math.round((passedUrls / totalUrls) * 100) : 0,
      generatedAt: new Date().toISOString(),
    },
    results,
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
  };
}

// ---------------------------------------------------------------------------
// Fetch with AbortController timeout (keeps us within Netlify's 10 s limit)
// ---------------------------------------------------------------------------

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  ms = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(id),
  );
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!githubToken || !githubRepository) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'GitHub not configured',
        message: 'Set GITHUB_QA_TOKEN and GITHUB_REPOSITORY environment variables',
      }),
    };
  }

  try {
    let runId = event.queryStringParameters?.runId;

    // If no runId is provided, resolve the latest completed run automatically
    if (!runId) {
      console.log('[qa-report] Fetching latest completed workflow run…');
      const runsRes = await fetchWithTimeout(
        `https://api.github.com/repos/${githubRepository}/actions/workflows/qa-scan.yml/runs?per_page=1&status=completed`,
        { headers: GITHUB_HEADERS },
      );
      if (!runsRes.ok) {
        throw new Error(`GitHub API returned ${runsRes.status}`);
      }
      const runsData = await runsRes.json();
      const latestRun = runsData.workflow_runs?.[0];
      if (!latestRun) {
        return {
          statusCode: 404,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'No completed QA runs found' }),
        };
      }
      runId = String(latestRun.id);
      console.log(`[qa-report] Resolved latest run ID: ${runId}`);
    } else {
      console.log(`[qa-report] Using provided run ID: ${runId}`);
    }

    // List artifacts for this run
    console.log('[qa-report] Listing artifacts…');
    const artifactsRes = await fetchWithTimeout(
      `https://api.github.com/repos/${githubRepository}/actions/runs/${runId}/artifacts`,
      { headers: GITHUB_HEADERS },
    );
    if (!artifactsRes.ok) {
      throw new Error(`Failed to list artifacts: ${artifactsRes.status}`);
    }
    const artifactsData = await artifactsRes.json();

    // Find the QA report artifact (name starts with "qa-report-")
    const qaArtifact = artifactsData.artifacts?.find((a: { name: string }) =>
      a.name.startsWith('qa-report-'),
    );
    if (!qaArtifact) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'QA report artifact not found for this run',
        }),
      };
    }
    console.log(`[qa-report] Found artifact: ${qaArtifact.name} (id=${qaArtifact.id})`);

    // Download the artifact zip (GitHub returns a 302 redirect; fetch follows it)
    console.log('[qa-report] Downloading artifact ZIP…');
    const downloadRes = await fetchWithTimeout(
      `https://api.github.com/repos/${githubRepository}/actions/artifacts/${qaArtifact.id}/zip`,
      { headers: GITHUB_HEADERS },
    );
    if (!downloadRes.ok) {
      throw new Error(`Failed to download artifact: ${downloadRes.status}`);
    }
    const zipBuffer = Buffer.from(await downloadRes.arrayBuffer());
    console.log(`[qa-report] ZIP downloaded — ${zipBuffer.length} bytes`);

    // Extract qa-report.json from the zip
    console.log('[qa-report] Extracting qa-report.json from ZIP…');
    const reportBuf = extractFileFromZip(zipBuffer, 'qa-report.json');
    if (!reportBuf) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'qa-report.json not found inside artifact zip',
        }),
      };
    }
    const issues: RawIssue[] = JSON.parse(reportBuf.toString('utf8'));
    console.log(`[qa-report] Parsed ${issues.length} issues from report`);

    // Also try to extract urls.json so we know the full list of scanned URLs
    // (including pages that had no issues). Falls back to unique URLs in issues.
    const urlsBuf = extractFileFromZip(zipBuffer, 'urls.json');
    const allUrls: string[] = urlsBuf
      ? JSON.parse(urlsBuf.toString('utf8'))
      : [...new Set(issues.map((i) => i.url))];

    const report = buildReport(issues, allUrls);
    console.log('[qa-report] Report built successfully — returning response');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(report),
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.name === 'AbortError';
    console.error('[qa-report] Error:', error);
    if (isTimeout) {
      return {
        statusCode: 504,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'GitHub request timed out — try again in a moment',
        }),
      };
    }
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to fetch QA report',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

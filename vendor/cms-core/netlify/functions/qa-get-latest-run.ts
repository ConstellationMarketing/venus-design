import type { Handler, HandlerEvent } from '@netlify/functions';

// Prefer GITHUB_QA_TOKEN; fall back to GITHUB_TOKEN for compatibility with existing env setup
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

// Read-only endpoint — returns the most recent qa-scan.yml workflow run.
// No auth required: exposes only public workflow metadata, no secrets.
export const handler: Handler = async (event: HandlerEvent) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Return null gracefully when GitHub is not configured (non-fatal for admin UI)
  if (!githubToken || !githubRepository) {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(null),
    };
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${githubRepository}/actions/workflows/qa-scan.yml/runs?per_page=1`,
      { headers: GITHUB_HEADERS },
    );

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const data = await res.json();
    const run = data.workflow_runs?.[0] ?? null;

    if (!run) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(null),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        html_url: run.html_url,
        created_at: run.created_at,
      }),
    };
  } catch (error) {
    console.error('qa-get-latest-run error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to fetch latest QA run',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

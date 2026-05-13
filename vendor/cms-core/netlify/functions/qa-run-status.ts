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

// Read-only polling endpoint — returns status for a specific workflow run.
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

  // Require runId query param
  const runId = event.queryStringParameters?.runId;
  if (!runId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required query parameter: runId' }),
    };
  }

  // Require GitHub configuration
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
    const res = await fetch(
      `https://api.github.com/repos/${githubRepository}/actions/runs/${runId}`,
      { headers: GITHUB_HEADERS },
    );

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}`);
    }

    const run = await res.json();

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
    console.error('qa-run-status error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to fetch QA run status',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

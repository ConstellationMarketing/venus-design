import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Prefer GITHUB_QA_TOKEN; fall back to GITHUB_TOKEN for compatibility with existing env setup
const githubToken = process.env.GITHUB_QA_TOKEN || process.env.GITHUB_TOKEN;
const githubRepository = process.env.GITHUB_REPOSITORY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || '*';

const GITHUB_HEADERS = {
  Authorization: `token ${githubToken}`,
  Accept: 'application/vnd.github.v3+json',
  'User-Agent': 'Jupiter-CMS-QA/1.0',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

/** Verify Supabase JWT and return the authenticated user, or null. */
async function verifyAdmin(authHeader: string | undefined) {
  if (!authHeader) return null;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export const handler: Handler = async (event: HandlerEvent) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  // Require Supabase configuration for auth
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Supabase not configured' }),
    };
  }

  // Require authenticated admin session
  const user = await verifyAdmin(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Unauthorized — valid admin session required' }),
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

  let targetUrl = '';
  try {
    const body = JSON.parse(event.body || '{}');
    targetUrl = body.targetUrl || '';
  } catch {
    // body is optional; proceed with empty targetUrl
  }

  try {
    // Dispatch the qa-scan.yml workflow via GitHub Actions workflow_dispatch
    const dispatchRes = await fetch(
      `https://api.github.com/repos/${githubRepository}/actions/workflows/qa-scan.yml/dispatches`,
      {
        method: 'POST',
        headers: GITHUB_HEADERS,
        body: JSON.stringify({
          ref: 'main',
          inputs: { targetUrl },
        }),
      },
    );

    if (!dispatchRes.ok) {
      const text = await dispatchRes.text().catch(() => '');
      throw new Error(`GitHub dispatch failed (${dispatchRes.status}): ${text}`);
    }

    // GitHub takes 1–5 seconds to register a new workflow run after dispatch.
    // We wait 3 seconds so the subsequent runs query finds the newly created run.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Fetch the most recent run for this workflow to return the run ID
    const runsRes = await fetch(
      `https://api.github.com/repos/${githubRepository}/actions/workflows/qa-scan.yml/runs?per_page=1`,
      { headers: GITHUB_HEADERS },
    );

    if (!runsRes.ok) {
      throw new Error(`Failed to fetch workflow runs (${runsRes.status})`);
    }

    const runsData = await runsRes.json();
    const latestRun = runsData.workflow_runs?.[0];

    if (!latestRun) {
      // Dispatch succeeded but no run found yet — frontend polling will pick it up
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          workflowRunId: null,
          status: 'queued',
          htmlUrl: null,
          message: 'Workflow dispatched; run not yet visible in API',
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        workflowRunId: latestRun.id,
        status: latestRun.status,
        htmlUrl: latestRun.html_url,
      }),
    };
  } catch (error) {
    console.error('trigger-qa error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to trigger QA scan',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

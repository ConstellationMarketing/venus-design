import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

function getConfig() {
  return {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    netlifyBuildHookUrl: process.env.NETLIFY_BUILD_HOOK_URL,
    allowedOrigin: process.env.ALLOWED_ORIGIN || process.env.URL || '*',
  };
}

function getCorsHeaders(allowedOrigin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

export const handler: Handler = async (event: HandlerEvent) => {
  const { supabaseUrl, supabaseServiceRoleKey, netlifyBuildHookUrl, allowedOrigin } = getConfig();
  const corsHeaders = getCorsHeaders(allowedOrigin);
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

  // Check if Supabase is configured
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Supabase not configured' }),
    };
  }

  // Verify auth token from request
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Authorization header required' }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  // Verify the token with Supabase
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid or expired token' }),
    };
  }

  // Check if build hook is configured
  if (!netlifyBuildHookUrl) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Build hook not configured',
        message: 'Please set NETLIFY_BUILD_HOOK_URL environment variable',
      }),
    };
  }

  try {
    // Trigger Netlify build hook
    const response = await fetch(netlifyBuildHookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Build hook returned ${response.status}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: 'Build triggered successfully',
        user: user.email,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Error triggering build:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to trigger build',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

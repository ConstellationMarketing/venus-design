import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FetchRequest {
  url: string;
  headers?: Record<string, string>;
  jsonPath?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getByPath(obj: unknown, path: string): unknown {
  const parts = path.trim().split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

function flattenObject(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      result[fullKey] = value;
    } else if (value && typeof value === "object" && value !== null) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, fullKey),
      );
    } else {
      result[fullKey] = value;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  // Authenticate
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Authorization header required" }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return {
      statusCode: 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Invalid or expired token" }),
    };
  }

  // Check admin role
  const { data: cmsUser } = await supabase
    .from("cms_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!cmsUser || cmsUser.role !== "admin") {
    return {
      statusCode: 403,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: "Admin access required" }),
    };
  }

  try {
    const body: FetchRequest = JSON.parse(event.body || "{}");

    if (!body.url || typeof body.url !== "string") {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "URL is required" }),
      };
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(body.url);
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Invalid URL format" }),
      };
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "Only HTTP/HTTPS URLs are supported" }),
      };
    }

    // Fetch the URL with optional custom headers
    const fetchHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(body.headers ?? {}),
    };

    const response = await fetch(body.url, {
      method: "GET",
      headers: fetchHeaders,
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `API returned ${response.status}: ${response.statusText}`,
        }),
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json") && !contentType.includes("text")) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: `Unexpected content type: ${contentType}. Expected JSON.`,
        }),
      };
    }

    const text = await response.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Response is not valid JSON",
        }),
      };
    }

    // Navigate to the records using jsonPath if provided
    let target = data;
    if (body.jsonPath && body.jsonPath.trim()) {
      target = getByPath(data, body.jsonPath);
      if (target === undefined) {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: `JSON path "${body.jsonPath}" did not resolve to any data`,
          }),
        };
      }
    }

    // Ensure it's an array
    if (!Array.isArray(target)) {
      if (target && typeof target === "object") {
        target = [target];
      } else {
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({
            error: body.jsonPath
              ? `JSON path "${body.jsonPath}" did not resolve to an array`
              : "Response must be an array of objects or an object",
          }),
        };
      }
    }

    // Flatten and collect columns
    const records: Record<string, unknown>[] = [];
    const columnSet = new Set<string>();

    for (const item of target as unknown[]) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const flat = flattenObject(item as Record<string, unknown>);
      for (const key of Object.keys(flat)) {
        columnSet.add(key);
      }
      records.push(flat);
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        records,
        columns: Array.from(columnSet),
        totalFetched: records.length,
      }),
    };
  } catch (error) {
    console.error("Bulk import fetch error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `Fetch failed: ${message}`,
      }),
    };
  }
};

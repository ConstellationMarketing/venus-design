import type { Handler, HandlerEvent } from "@netlify/functions";

const PUBLIC_CMS_RESOURCE_PATTERN = /^(pages|posts|site_settings_public|blog_sidebar_settings)\?/;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

function getPublicCmsConfig() {
  return {
    url: process.env.VITE_SUPABASE_URL || "",
    anonKey: process.env.VITE_SUPABASE_ANON_KEY || "",
  };
}

function buildRestHeaders(apiKey: string) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

function resolveRoutePath(event: HandlerEvent) {
  const rawUrlPath = event.rawUrl ? new URL(event.rawUrl).pathname : "";
  const candidates = [event.path || "", rawUrlPath].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = candidate
      .replace(/^\/\.netlify\/functions\/api/, "")
      .replace(/^\/api/, "");

    if (normalized) {
      return normalized.startsWith("/") ? normalized : `/${normalized}`;
    }
  }

  return "/";
}

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

async function handlePublicCms(event: HandlerEvent) {
  if (event.httpMethod !== "GET") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const resource = event.queryStringParameters?.resource || "";
  if (!PUBLIC_CMS_RESOURCE_PATTERN.test(resource)) {
    return jsonResponse(400, { error: "Invalid public CMS resource" });
  }

  const { url, anonKey } = getPublicCmsConfig();
  if (!url || !anonKey) {
    return jsonResponse(500, { error: "Public CMS config is unavailable" });
  }

  try {
    const response = await fetch(`${url}/rest/v1/${resource}`, {
      headers: buildRestHeaders(anonKey),
    });
    const body = await response.text();

    return {
      statusCode: response.status,
      headers: {
        ...corsHeaders,
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
      body,
    };
  } catch (error) {
    console.error("Public CMS proxy error:", error);
    return jsonResponse(502, { error: "Failed to reach public CMS" });
  }
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  const routePath = resolveRoutePath(event);

  if (routePath === "/ping") {
    if (event.httpMethod !== "GET") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    return jsonResponse(200, {
      message: process.env.PING_MESSAGE ?? "ping",
    });
  }

  if (routePath === "/demo") {
    if (event.httpMethod !== "GET") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    return jsonResponse(200, {
      message: "Hello from Netlify function",
    });
  }

  if (routePath === "/public-cms") {
    return handlePublicCms(event);
  }

  return jsonResponse(404, { error: "Not found" });
};

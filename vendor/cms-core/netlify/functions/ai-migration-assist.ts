import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const MAX_TOKENS_PER_CALL = 4000;
const AI_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AIAction =
  | "ping"
  | "infer_recipe"
  | "extract_faq"
  | "derive_hero"
  | "generate_meta"
  | "clean_html"
  | "assess_confidence";

interface AIRequest {
  action: AIAction;
  payload: Record<string, unknown>;
  templateType: string;
  domainHints?: string[];
}

// ---------------------------------------------------------------------------
// Rate Limiting (simple token bucket)
// ---------------------------------------------------------------------------

let tokenBucket = 20;
let lastRefill = Date.now();
const REFILL_RATE = 20; // tokens per minute
const REFILL_INTERVAL = 60_000;

function tryConsumeToken(): boolean {
  const now = Date.now();
  const elapsed = now - lastRefill;
  if (elapsed >= REFILL_INTERVAL) {
    tokenBucket = REFILL_RATE;
    lastRefill = now;
  }
  if (tokenBucket > 0) {
    tokenBucket--;
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// OpenAI Helper
// ---------------------------------------------------------------------------

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  responseFormat?: "json_object",
): Promise<{ success: boolean; content: string; tokensUsed: number; error?: string }> {
  if (!openaiApiKey) {
    return { success: false, content: "", tokensUsed: 0, error: "OPENAI_API_KEY not configured" };
  }

  if (!tryConsumeToken()) {
    return { success: false, content: "", tokensUsed: 0, error: "Rate limit exceeded. Try again in a minute." };
  }

  // Truncate user prompt to max tokens (rough estimate: 1 token ≈ 4 chars)
  const maxChars = MAX_TOKENS_PER_CALL * 4;
  const truncatedPrompt = userPrompt.length > maxChars
    ? userPrompt.slice(0, maxChars) + "\n\n[Content truncated]"
    : userPrompt;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: truncatedPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        ...(responseFormat ? { response_format: { type: responseFormat } } : {}),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return {
        success: false,
        content: "",
        tokensUsed: 0,
        error: `OpenAI API error: ${response.status} ${errText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const tokensUsed = data.usage?.total_tokens ?? 0;

    return { success: true, content, tokensUsed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    if (msg.includes("abort")) {
      return { success: false, content: "", tokensUsed: 0, error: "AI request timed out (30s)" };
    }
    return { success: false, content: "", tokensUsed: 0, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Action Handlers
// ---------------------------------------------------------------------------

async function handlePing(): Promise<Record<string, unknown>> {
  return {
    available: !!openaiApiKey,
    model: openaiApiKey ? "gpt-4o-mini" : undefined,
  };
}

async function handleInferRecipe(
  payload: Record<string, unknown>,
  templateType: string,
): Promise<Record<string, unknown>> {
  const mappedSample = JSON.stringify(payload.mappedSample ?? {}, null, 2);
  const correctedOutput = JSON.stringify(payload.correctedOutput ?? {}, null, 2);

  const systemPrompt = `You are an expert content migration assistant. Analyze the transformation between a source record and its corrected CMS output, and suggest transformation rules.

Template type: ${templateType}

Return a JSON object with:
{
  "rules": [
    {
      "targetField": "field name",
      "ruleType": "one of: direct_map, static_value, html_clean, h2_split, faq_extract, hero_extract, slugify, concat, regex_replace",
      "config": { ... rule-specific config ... },
      "description": "human-readable description"
    }
  ],
  "reasoning": "brief explanation of the transformation patterns you detected"
}`;

  const userPrompt = `Source record (after field mapping):
${mappedSample}

Desired output:
${correctedOutput}

What transformation rules explain how the source was converted to the output?`;

  const result = await callOpenAI(systemPrompt, userPrompt, "json_object");
  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, rules: parsed.rules ?? [], reasoning: parsed.reasoning ?? "", tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse AI response as JSON" };
  }
}

async function handleExtractFaq(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const html = String(payload.html ?? "");

  const systemPrompt = `You are an expert at extracting FAQ content from HTML. Extract question/answer pairs from the provided HTML content.

Return a JSON object:
{
  "items": [
    { "question": "...", "answer": "..." }
  ],
  "confidence": 0.0-1.0
}

Only extract genuine FAQ-like content. If no FAQ content is found, return empty items with low confidence.`;

  const result = await callOpenAI(systemPrompt, html, "json_object");
  if (!result.success) return { success: false, error: result.error };

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, items: parsed.items ?? [], confidence: parsed.confidence ?? 0.5, tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse FAQ extraction result" };
  }
}

async function handleDeriveHero(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const html = String(payload.html ?? "");
  const title = String(payload.title ?? "");

  const systemPrompt = `You are an expert at extracting hero section content from HTML. Given the page title and body content, extract appropriate hero section content.

Return a JSON object:
{
  "tagline": "compelling headline (can differ from title)",
  "description": "1-2 sentence summary as HTML paragraph",
  "backgroundImage": "URL of the most relevant image, or empty string",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `Title: ${title}\n\nBody HTML:\n${html}`;

  const result = await callOpenAI(systemPrompt, userPrompt, "json_object");
  if (!result.success) return { success: false, error: result.error };

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, hero: parsed, tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse hero derivation result" };
  }
}

async function handleGenerateMeta(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const title = String(payload.title ?? "");
  const body = String(payload.body ?? "");

  const systemPrompt = `You are an SEO expert. Generate meta title and meta description for the given page content.

Return a JSON object:
{
  "meta_title": "SEO-optimized title (50-60 chars)",
  "meta_description": "SEO-optimized description (120-160 chars)",
  "confidence": 0.0-1.0
}`;

  const userPrompt = `Page title: ${title}\n\nContent (first 2000 chars):\n${body.slice(0, 2000)}`;

  const result = await callOpenAI(systemPrompt, userPrompt, "json_object");
  if (!result.success) return { success: false, error: result.error };

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, ...parsed, tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse meta generation result" };
  }
}

async function handleCleanHtml(
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const html = String(payload.html ?? "");

  const systemPrompt = `You are an expert at cleaning HTML content. Clean the provided HTML by:
- Removing page builder shortcodes and wrapper elements
- Keeping semantic HTML (h2, h3, p, ul, ol, li, a, strong, em, blockquote, img)
- Removing inline styles and builder-specific classes
- Fixing broken HTML structure

Return a JSON object:
{
  "cleanedHtml": "the cleaned HTML",
  "changes": ["list of changes made"],
  "confidence": 0.0-1.0
}`;

  const result = await callOpenAI(systemPrompt, html, "json_object");
  if (!result.success) return { success: false, error: result.error };

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, ...parsed, tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse HTML cleaning result" };
  }
}

async function handleAssessConfidence(
  payload: Record<string, unknown>,
  templateType: string,
): Promise<Record<string, unknown>> {
  const record = JSON.stringify(payload.record ?? {}, null, 2);

  const systemPrompt = `You are a content quality assessor. Evaluate the quality and completeness of the following CMS ${templateType} record.

Return a JSON object:
{
  "overallConfidence": 0.0-1.0,
  "issues": [
    { "field": "field name", "severity": "error|warning", "message": "description" }
  ],
  "suggestions": ["improvement suggestion 1", "suggestion 2"]
}`;

  const result = await callOpenAI(systemPrompt, record, "json_object");
  if (!result.success) return { success: false, error: result.error };

  try {
    const parsed = JSON.parse(result.content);
    return { success: true, ...parsed, tokensUsed: result.tokensUsed };
  } catch {
    return { success: false, error: "Failed to parse confidence assessment result" };
  }
}

// ---------------------------------------------------------------------------
// Auth Helper
// ---------------------------------------------------------------------------

async function authenticateAdmin(authHeader: string | undefined): Promise<{
  ok: boolean;
  error?: string;
  userId?: string;
}> {
  if (!authHeader) {
    return { ok: false, error: "Authorization header required" };
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return { ok: false, error: "Supabase not configured" };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { ok: false, error: "Invalid or expired token" };
  }

  const { data: cmsUser } = await supabase
    .from("cms_users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (!cmsUser || cmsUser.role !== "admin") {
    return { ok: false, error: "Admin access required" };
  }

  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// Main Handler
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

  // Authenticate
  const auth = await authenticateAdmin(event.headers.authorization);
  if (!auth.ok) {
    return {
      statusCode: auth.error === "Admin access required" ? 403 : 401,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    const request: AIRequest = JSON.parse(event.body || "{}");

    if (!request.action) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: "action is required" }),
      };
    }

    let result: Record<string, unknown>;

    switch (request.action) {
      case "ping":
        result = await handlePing();
        break;
      case "infer_recipe":
        result = await handleInferRecipe(request.payload, request.templateType);
        break;
      case "extract_faq":
        result = await handleExtractFaq(request.payload);
        break;
      case "derive_hero":
        result = await handleDeriveHero(request.payload);
        break;
      case "generate_meta":
        result = await handleGenerateMeta(request.payload);
        break;
      case "clean_html":
        result = await handleCleanHtml(request.payload);
        break;
      case "assess_confidence":
        result = await handleAssessConfidence(request.payload, request.templateType);
        break;
      default:
        return {
          statusCode: 400,
          headers: CORS_HEADERS,
          body: JSON.stringify({ error: `Unknown action: ${request.action}` }),
        };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        action: request.action,
        result,
      }),
    };
  } catch (err) {
    console.error("AI migration assist error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `AI assist failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      }),
    };
  }
};

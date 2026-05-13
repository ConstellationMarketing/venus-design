import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchReplaceRequest {
  searchText: string;
  replaceText: string;
  caseSensitive: boolean;
  statusFilter: "all" | "published" | "draft";
  dryRun: boolean;
  confirmToken?: string;
  rollback?: boolean;
  operationId?: string;
}

interface Match {
  rowId: string;
  tableName: string;
  itemTitle: string;
  itemUrl: string;
  fieldPath: string;
  oldValue: string;
  newValue: string;
}

interface PreviewResult {
  matches: Match[];
  totalMatches: number;
  affectedItems: number;
  confirmToken: string;
}

interface ExecuteResult {
  operationId: string;
  totalChanges: number;
  affectedItems: number;
}

interface RollbackResult {
  operationId: string;
  restoredChanges: number;
}

// ---------------------------------------------------------------------------
// Table search configuration
// ---------------------------------------------------------------------------

interface TableSearchConfig {
  tableName: string;
  textFields: string[];
  jsonbFields: string[];
  /** Whether the status filter applies to this table */
  hasStatus: boolean;
  /** Derive a human-readable title from a row */
  getTitle: (row: Record<string, unknown>) => string;
  /** Derive a URL / identifier from a row */
  getUrl: (row: Record<string, unknown>) => string;
}

const TABLE_CONFIGS: TableSearchConfig[] = [
  {
    tableName: "pages",
    textFields: [
      "title",
      "meta_title",
      "meta_description",
      "og_title",
      "og_description",
    ],
    jsonbFields: ["content"],
    hasStatus: true,
    getTitle: (row) => (row.title as string) || "Untitled Page",
    getUrl: (row) => (row.url_path as string) || "/",
  },
  {
    tableName: "posts",
    textFields: [
      "title",
      "slug",
      "excerpt",
      "meta_title",
      "meta_description",
      "og_title",
      "og_description",
      "body",
    ],
    jsonbFields: ["content"],
    hasStatus: true,
    getTitle: (row) => (row.title as string) || "Untitled Post",
    getUrl: (row) => `/blog/${(row.slug as string) || ""}`,
  },
  {
    tableName: "site_settings",
    textFields: [
      "site_name",
      "logo_alt",
      "phone_number",
      "phone_display",
      "phone_availability",
      "header_cta_text",
      "header_cta_url",
      "address_line1",
      "address_line2",
      "copyright_text",
      "footer_tagline_html",
      "site_url",
      "global_schema",
    ],
    jsonbFields: [
      "navigation_items",
      "footer_about_links",
      "footer_practice_links",
      "social_links",
    ],
    hasStatus: false,
    getTitle: () => "Site Settings",
    getUrl: () => "(global)",
  },
  {
    tableName: "templates",
    textFields: ["name", "default_meta_title", "default_meta_description"],
    jsonbFields: ["default_content"],
    hasStatus: false,
    getTitle: (row) => (row.name as string) || "Untitled Template",
    getUrl: (row) => `template:${(row.name as string) || row.id}`,
  },
];

/** Whitelist of table names we allow for dynamic queries (injection-safe) */
const ALLOWED_TABLES = new Set(TABLE_CONFIGS.map((c) => c.tableName));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceString(
  value: string,
  search: string,
  replace: string,
  caseSensitive: boolean,
): string {
  if (caseSensitive) {
    return value.split(search).join(replace);
  }
  return value.replace(new RegExp(escapeRegex(search), "gi"), replace);
}

function containsSearch(
  value: string,
  search: string,
  caseSensitive: boolean,
): boolean {
  if (caseSensitive) {
    return value.includes(search);
  }
  return value.toLowerCase().includes(search.toLowerCase());
}

function traverseAndReplace(
  obj: unknown,
  search: string,
  replace: string,
  caseSensitive: boolean,
  path: string,
  matches: { path: string; oldValue: string; newValue: string }[],
): unknown {
  if (typeof obj === "string") {
    if (containsSearch(obj, search, caseSensitive)) {
      const newValue = replaceString(obj, search, replace, caseSensitive);
      matches.push({ path, oldValue: obj, newValue });
      return newValue;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, i) =>
      traverseAndReplace(
        item,
        search,
        replace,
        caseSensitive,
        `${path}[${i}]`,
        matches,
      ),
    );
  }

  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = traverseAndReplace(
        value,
        search,
        replace,
        caseSensitive,
        path ? `${path}.${key}` : key,
        matches,
      );
    }
    return result;
  }

  return obj;
}

// ---------------------------------------------------------------------------
// Search a single table for matches
// ---------------------------------------------------------------------------

async function searchTable(
  supabase: ReturnType<typeof createClient>,
  config: TableSearchConfig,
  searchText: string,
  replaceText: string,
  caseSensitive: boolean,
  statusFilter: "all" | "published" | "draft",
): Promise<Match[]> {
  let query = supabase.from(config.tableName).select("*");

  // Apply status filter only to tables that have a status column
  if (config.hasStatus) {
    if (statusFilter === "published") {
      query = query.eq("status", "published");
    } else if (statusFilter === "draft") {
      query = query.eq("status", "draft");
    }
  }

  const { data: rows, error } = await query;

  if (error) {
    console.error(`Error querying ${config.tableName}:`, error);
    return [];
  }

  const matches: Match[] = [];

  for (const row of rows || []) {
    // Search text fields
    for (const field of config.textFields) {
      const value = row[field];
      if (
        typeof value === "string" &&
        containsSearch(value, searchText, caseSensitive)
      ) {
        const newValue = replaceString(
          value,
          searchText,
          replaceText,
          caseSensitive,
        );
        matches.push({
          rowId: row.id,
          tableName: config.tableName,
          itemTitle: config.getTitle(row),
          itemUrl: config.getUrl(row),
          fieldPath: field,
          oldValue: value,
          newValue,
        });
      }
    }

    // Search JSONB fields
    for (const jsonbField of config.jsonbFields) {
      if (row[jsonbField]) {
        const jsonMatches: {
          path: string;
          oldValue: string;
          newValue: string;
        }[] = [];
        traverseAndReplace(
          row[jsonbField],
          searchText,
          replaceText,
          caseSensitive,
          jsonbField,
          jsonMatches,
        );

        for (const m of jsonMatches) {
          matches.push({
            rowId: row.id,
            tableName: config.tableName,
            itemTitle: config.getTitle(row),
            itemUrl: config.getUrl(row),
            fieldPath: m.path,
            oldValue: m.oldValue,
            newValue: m.newValue,
          });
        }
      }
    }
  }

  return matches;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
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
      headers,
      body: JSON.stringify({ error: "Invalid or expired token" }),
    };
  }

  try {
    const body: SearchReplaceRequest = JSON.parse(event.body || "{}");

    // -----------------------------------------------------------------------
    // Rollback
    // -----------------------------------------------------------------------
    if (body.rollback && body.operationId) {
      return await handleRollback(supabase, body.operationId, user.id, headers);
    }

    // -----------------------------------------------------------------------
    // Validate inputs
    // -----------------------------------------------------------------------
    if (!body.searchText || body.searchText.trim() === "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Search text is required" }),
      };
    }

    if (!body.dryRun && !body.replaceText && body.replaceText !== "") {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Replace text is required" }),
      };
    }

    if (!body.dryRun && body.searchText === body.replaceText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Search and replace text cannot be the same",
        }),
      };
    }

    // -----------------------------------------------------------------------
    // Search all tables
    // -----------------------------------------------------------------------
    const allMatches: Match[] = [];
    const affectedItemKeys = new Set<string>();

    for (const config of TABLE_CONFIGS) {
      const tableMatches = await searchTable(
        supabase,
        config,
        body.searchText,
        body.replaceText || "",
        body.caseSensitive,
        body.statusFilter,
      );

      for (const m of tableMatches) {
        allMatches.push(m);
        affectedItemKeys.add(`${m.tableName}:${m.rowId}`);
      }
    }

    // -----------------------------------------------------------------------
    // Dry run – return preview
    // -----------------------------------------------------------------------
    if (body.dryRun) {
      const confirmToken = Buffer.from(
        JSON.stringify({
          searchText: body.searchText,
          replaceText: body.replaceText,
          caseSensitive: body.caseSensitive,
          statusFilter: body.statusFilter,
          timestamp: Date.now(),
        }),
      ).toString("base64");

      const result: PreviewResult = {
        matches: allMatches,
        totalMatches: allMatches.length,
        affectedItems: affectedItemKeys.size,
        confirmToken,
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    // -----------------------------------------------------------------------
    // Execute – verify confirm token
    // -----------------------------------------------------------------------
    if (!body.confirmToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Confirm token required. Run preview first.",
        }),
      };
    }

    const operationId = crypto.randomUUID();

    // Group matches by tableName + rowId
    const matchesByKey = new Map<string, Match[]>();
    for (const match of allMatches) {
      const key = `${match.tableName}:${match.rowId}`;
      const existing = matchesByKey.get(key) || [];
      existing.push(match);
      matchesByKey.set(key, existing);
    }

    // Process each affected row
    for (const [key, rowMatches] of matchesByKey) {
      const [tableName, rowId] = key.split(":");
      if (!ALLOWED_TABLES.has(tableName)) continue;

      const config = TABLE_CONFIGS.find((c) => c.tableName === tableName);
      if (!config) continue;

      // Get current row data
      const { data: row, error: rowError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", rowId)
        .single();

      if (rowError || !row) continue;

      // Record audit entries
      for (const match of rowMatches) {
        await supabase.from("search_replace_audit").insert({
          operation_id: operationId,
          table_name: tableName,
          row_id: rowId,
          field_path: match.fieldPath,
          old_value: match.oldValue,
          new_value: match.newValue,
          user_id: user.id,
        });
      }

      // Build update object
      const updates: Record<string, unknown> = {};

      // Update text fields
      for (const field of config.textFields) {
        const value = row[field];
        if (
          typeof value === "string" &&
          containsSearch(value, body.searchText, body.caseSensitive)
        ) {
          updates[field] = replaceString(
            value,
            body.searchText,
            body.replaceText,
            body.caseSensitive,
          );
        }
      }

      // Update JSONB fields
      for (const jsonbField of config.jsonbFields) {
        if (row[jsonbField]) {
          const jsonMatches: {
            path: string;
            oldValue: string;
            newValue: string;
          }[] = [];
          const newJsonb = traverseAndReplace(
            row[jsonbField],
            body.searchText,
            body.replaceText,
            body.caseSensitive,
            jsonbField,
            jsonMatches,
          );
          if (jsonMatches.length > 0) {
            updates[jsonbField] = newJsonb;
          }
        }
      }

      // Apply updates
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase.from(tableName).update(updates).eq("id", rowId);
      }
    }

    const result: ExecuteResult = {
      operationId,
      totalChanges: allMatches.length,
      affectedItems: affectedItemKeys.size,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Search/replace error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Search/replace operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

// ---------------------------------------------------------------------------
// Rollback handler
// ---------------------------------------------------------------------------

async function handleRollback(
  supabase: ReturnType<typeof createClient>,
  operationId: string,
  _userId: string,
  headers: Record<string, string>,
) {
  try {
    const { data: auditRecords, error: auditError } = await supabase
      .from("search_replace_audit")
      .select("*")
      .eq("operation_id", operationId)
      .eq("rolled_back", false)
      .order("created_at", { ascending: false });

    if (auditError) throw auditError;

    if (!auditRecords || auditRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: "No records found for this operation or already rolled back",
        }),
      };
    }

    // Group by table_name + row_id
    const recordsByKey = new Map<
      string,
      typeof auditRecords
    >();
    for (const record of auditRecords) {
      const key = `${record.table_name}:${record.row_id}`;
      const existing = recordsByKey.get(key) || [];
      existing.push(record);
      recordsByKey.set(key, existing);
    }

    // Restore each affected row
    for (const [key, records] of recordsByKey) {
      const [tableName, rowId] = key.split(":");

      // Safety check: only allow whitelisted tables
      if (!ALLOWED_TABLES.has(tableName)) continue;

      const { data: row, error: rowError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", rowId)
        .single();

      if (rowError || !row) continue;

      const updates: Record<string, unknown> = {};

      // Find the JSONB fields for this table config
      const config = TABLE_CONFIGS.find((c) => c.tableName === tableName);
      const jsonbFieldNames = new Set(config?.jsonbFields || ["content"]);

      // Determine which JSONB fields were affected
      const affectedJsonbFields = new Set<string>();

      for (const record of records) {
        // Check if the field_path starts with a known JSONB field
        const rootField = record.field_path.split(/[.\[]/)[0];
        if (jsonbFieldNames.has(rootField)) {
          affectedJsonbFields.add(rootField);

          // Navigate into the JSONB and restore the old value
          const pathParts = record.field_path
            .split(/\.|\[|\]/)
            .filter(Boolean);
          pathParts.shift(); // Remove the root JSONB field name

          let target = row[rootField];
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const numPart = parseInt(part);
            target = isNaN(numPart) ? target[part] : target[numPart];
          }

          if (pathParts.length > 0) {
            const lastPart = pathParts[pathParts.length - 1];
            const numLastPart = parseInt(lastPart);
            if (isNaN(numLastPart)) {
              target[lastPart] = record.old_value;
            } else {
              target[numLastPart] = record.old_value;
            }
          }
        } else {
          // Simple text field
          updates[record.field_path] = record.old_value;
        }
      }

      // Include modified JSONB fields in the update
      for (const jsonbField of affectedJsonbFields) {
        updates[jsonbField] = row[jsonbField];
      }

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase.from(tableName).update(updates).eq("id", rowId);
      }
    }

    // Mark audit records as rolled back
    await supabase
      .from("search_replace_audit")
      .update({
        rolled_back: true,
        rolled_back_at: new Date().toISOString(),
      })
      .eq("operation_id", operationId);

    const result: RollbackResult = {
      operationId,
      restoredChanges: auditRecords.length,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error("Rollback error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Rollback failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

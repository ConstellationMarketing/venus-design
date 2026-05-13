// ============================================================================
// Session Persistence — Save & Resume Migration Sessions
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import type { MigrationSession, MigrationSessionRow } from "./recipeTypes";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSupabase(accessToken?: string) {
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
  return client;
}

// ---------------------------------------------------------------------------
// Row → Session conversion
// ---------------------------------------------------------------------------

function rowToSession(row: MigrationSessionRow): MigrationSession {
  return {
    id: row.id,
    name: row.name ?? undefined,
    templateType: row.template_type as MigrationSession["templateType"],
    sourceType: row.source_type as MigrationSession["sourceType"],
    recipeId: row.recipe_id ?? undefined,
    currentStep: row.current_step,
    recordsCount: row.records_count,
    approvedCount: row.approved_count,
    exceptionCount: row.exception_count,
    skippedCount: row.skipped_count,
    errorCount: row.error_count,
    sourceSummary: row.source_summary_json as MigrationSession["sourceSummary"],
    sourceData: row.source_data_json as MigrationSession["sourceData"],
    sourceSnapshot: row.source_snapshot_json as MigrationSession["sourceSnapshot"],
    mapping: row.mapping_json as unknown as MigrationSession["mapping"],
    recipe: row.recipe_json as unknown as MigrationSession["recipe"],
    transformedRecords: row.transformed_records_json as MigrationSession["transformedRecords"],
    exceptionIndices: row.exception_indices as MigrationSession["exceptionIndices"],
    reviewState: row.review_state_json as MigrationSession["reviewState"],
    validationResult: row.validation_result_json as MigrationSession["validationResult"],
    status: row.status as MigrationSession["status"],
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function sessionToRow(
  session: Partial<MigrationSession> & Pick<MigrationSession, "templateType" | "sourceType">,
): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  if (session.name !== undefined) row.name = session.name;
  row.template_type = session.templateType;
  row.source_type = session.sourceType;
  if (session.recipeId !== undefined) row.recipe_id = session.recipeId || null;
  if (session.currentStep !== undefined) row.current_step = session.currentStep;
  if (session.recordsCount !== undefined) row.records_count = session.recordsCount;
  if (session.approvedCount !== undefined) row.approved_count = session.approvedCount;
  if (session.exceptionCount !== undefined) row.exception_count = session.exceptionCount;
  if (session.skippedCount !== undefined) row.skipped_count = session.skippedCount;
  if (session.errorCount !== undefined) row.error_count = session.errorCount;
  if (session.sourceSummary !== undefined) row.source_summary_json = session.sourceSummary;
  if (session.sourceData !== undefined) row.source_data_json = session.sourceData;
  if (session.sourceSnapshot !== undefined) row.source_snapshot_json = session.sourceSnapshot;
  if (session.mapping !== undefined) row.mapping_json = session.mapping;
  if (session.recipe !== undefined) row.recipe_json = session.recipe;
  if (session.transformedRecords !== undefined) row.transformed_records_json = session.transformedRecords;
  if (session.exceptionIndices !== undefined) row.exception_indices = session.exceptionIndices;
  if (session.reviewState !== undefined) row.review_state_json = session.reviewState;
  if (session.validationResult !== undefined) row.validation_result_json = session.validationResult;
  if (session.status !== undefined) row.status = session.status;

  return row;
}

// ---------------------------------------------------------------------------
// Debounced auto-save
// ---------------------------------------------------------------------------

const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Debounced save — waits 1 second after the last call before persisting.
 * Prevents excessive DB writes during rapid user edits.
 */
export function debouncedSaveSession(
  session: MigrationSession,
  accessToken?: string,
): void {
  const existing = saveTimers.get(session.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    saveTimers.delete(session.id);
    saveSession(session, accessToken).catch((err) => {
      console.warn("Auto-save failed:", err);
    });
  }, 1000);

  saveTimers.set(session.id, timer);
}

/**
 * Flush any pending debounced save immediately (e.g. before step transition).
 */
export async function flushSave(
  session: MigrationSession,
  accessToken?: string,
): Promise<void> {
  const existing = saveTimers.get(session.id);
  if (existing) {
    clearTimeout(existing);
    saveTimers.delete(session.id);
  }
  await saveSession(session, accessToken);
}

// ---------------------------------------------------------------------------
// CRUD Operations
// ---------------------------------------------------------------------------

/**
 * Create a new migration session. Returns the session with generated ID.
 */
export async function createSession(
  session: Omit<MigrationSession, "id" | "createdAt" | "updatedAt">,
  accessToken?: string,
): Promise<MigrationSession> {
  const supabase = getSupabase(accessToken);
  const row = sessionToRow(session as MigrationSession);

  const { data, error } = await supabase
    .from("import_migration_sessions")
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return rowToSession(data as MigrationSessionRow);
}

/**
 * Save (update) an existing migration session.
 */
export async function saveSession(
  session: MigrationSession,
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);
  const row = sessionToRow(session);

  const { error } = await supabase
    .from("import_migration_sessions")
    .update(row)
    .eq("id", session.id);

  if (error) throw new Error(`Failed to save session: ${error.message}`);
}

/**
 * Load a session by ID.
 */
export async function loadSession(
  sessionId: string,
  accessToken?: string,
): Promise<MigrationSession | null> {
  const supabase = getSupabase(accessToken);

  const { data, error } = await supabase
    .from("import_migration_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;
  return rowToSession(data as MigrationSessionRow);
}

/**
 * List all active (in_progress) sessions, ordered by most recent first.
 */
export async function listActiveSessions(
  accessToken?: string,
): Promise<MigrationSession[]> {
  const supabase = getSupabase(accessToken);

  const { data, error } = await supabase
    .from("import_migration_sessions")
    .select(
      "id, name, template_type, source_type, current_step, records_count, approved_count, exception_count, skipped_count, error_count, status, created_at, updated_at",
    )
    .eq("status", "in_progress")
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return (data as MigrationSessionRow[]).map(rowToSession);
}

/**
 * Mark a session as abandoned.
 */
export async function abandonSession(
  sessionId: string,
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);

  const { error } = await supabase
    .from("import_migration_sessions")
    .update({ status: "abandoned" })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to abandon session: ${error.message}`);
}

/**
 * Mark a session as completed.
 */
export async function completeSession(
  sessionId: string,
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);

  const { error } = await supabase
    .from("import_migration_sessions")
    .update({ status: "completed" })
    .eq("id", sessionId);

  if (error) throw new Error(`Failed to complete session: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Recipe CRUD
// ---------------------------------------------------------------------------

/**
 * Save a new recipe. Returns the recipe with generated ID.
 */
export async function createRecipe(
  recipe: {
    name: string;
    templateType: string;
    sourceType?: string;
    mappingPresetId?: string;
    recipeJson: Record<string, unknown>;
    aiSettingsJson?: Record<string, unknown>;
    confidenceThreshold?: number;
  },
  accessToken?: string,
): Promise<{ id: string }> {
  const supabase = getSupabase(accessToken);

  const { data, error } = await supabase
    .from("import_recipes")
    .insert({
      name: recipe.name,
      template_type: recipe.templateType,
      source_type: recipe.sourceType ?? null,
      mapping_preset_id: recipe.mappingPresetId ?? null,
      recipe_json: recipe.recipeJson,
      ai_settings_json: recipe.aiSettingsJson ?? null,
      confidence_threshold: recipe.confidenceThreshold ?? 0.8,
      version: 1,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to create recipe: ${error.message}`);
  return { id: data.id };
}

/**
 * Update an existing recipe. Increments version (Refinement #3).
 */
export async function updateRecipe(
  recipeId: string,
  updates: {
    name?: string;
    recipeJson?: Record<string, unknown>;
    aiSettingsJson?: Record<string, unknown>;
    confidenceThreshold?: number;
    isActive?: boolean;
  },
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);

  // First get current version
  const { data: current, error: fetchError } = await supabase
    .from("import_recipes")
    .select("version")
    .eq("id", recipeId)
    .single();

  if (fetchError || !current) {
    throw new Error(`Recipe not found: ${recipeId}`);
  }

  const updateRow: Record<string, unknown> = {
    version: (current.version ?? 1) + 1,
  };

  if (updates.name !== undefined) updateRow.name = updates.name;
  if (updates.recipeJson !== undefined) updateRow.recipe_json = updates.recipeJson;
  if (updates.aiSettingsJson !== undefined) updateRow.ai_settings_json = updates.aiSettingsJson;
  if (updates.confidenceThreshold !== undefined) updateRow.confidence_threshold = updates.confidenceThreshold;
  if (updates.isActive !== undefined) updateRow.is_active = updates.isActive;

  const { error } = await supabase
    .from("import_recipes")
    .update(updateRow)
    .eq("id", recipeId);

  if (error) throw new Error(`Failed to update recipe: ${error.message}`);
}

/**
 * List all recipes, optionally filtered by template type.
 */
export async function listRecipes(
  templateType?: string,
  accessToken?: string,
): Promise<Array<{
  id: string;
  name: string;
  templateType: string;
  version: number;
  isActive: boolean;
  confidenceThreshold: number;
  updatedAt: string;
  lastUsedAt: string | null;
}>> {
  const supabase = getSupabase(accessToken);

  let query = supabase
    .from("import_recipes")
    .select("id, name, template_type, version, is_active, confidence_threshold, updated_at, last_used_at")
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (templateType) {
    query = query.eq("template_type", templateType);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    templateType: row.template_type as string,
    version: row.version as number,
    isActive: row.is_active as boolean,
    confidenceThreshold: row.confidence_threshold as number,
    updatedAt: row.updated_at as string,
    lastUsedAt: row.last_used_at as string | null,
  }));
}

/**
 * Load a full recipe by ID.
 */
export async function loadRecipe(
  recipeId: string,
  accessToken?: string,
): Promise<Record<string, unknown> | null> {
  const supabase = getSupabase(accessToken);

  const { data, error } = await supabase
    .from("import_recipes")
    .select("*")
    .eq("id", recipeId)
    .single();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

/**
 * Update recipe last_used_at timestamp.
 */
export async function touchRecipe(
  recipeId: string,
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);

  await supabase
    .from("import_recipes")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", recipeId);
}

/**
 * Delete a recipe (soft-delete by setting is_active = false).
 */
export async function deleteRecipe(
  recipeId: string,
  accessToken?: string,
): Promise<void> {
  const supabase = getSupabase(accessToken);

  const { error } = await supabase
    .from("import_recipes")
    .update({ is_active: false })
    .eq("id", recipeId);

  if (error) throw new Error(`Failed to delete recipe: ${error.message}`);
}

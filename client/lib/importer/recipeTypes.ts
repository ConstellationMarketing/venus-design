// ============================================================================
// Recipe-Based Migration — Type Definitions
// ============================================================================

import type {
  TemplateType,
  SourceType,
  SourceRecord,
  MappingConfig,
  TransformedRecord,
  ValidationIssue,
} from "./types";

// ---------------------------------------------------------------------------
// Pipeline Stage Types
// ---------------------------------------------------------------------------

/** Stage 1: Raw source data (untouched) */
export type RawRecord = SourceRecord;

/** Stage 2: Cleaned source data (shortcodes stripped, encoding fixed) */
export interface CleanedRecord {
  data: Record<string, unknown>;
  cleaningLog: CleaningLogEntry[];
}

export interface CleaningLogEntry {
  field: string;
  action: string;
  detail?: string;
}

/** Stage 3: Mapped fields (source columns → template field keys) */
export type MappedRecord = Record<string, unknown>;

/** Stage 5: Final CMS record with confidence scores */
export interface TransformedRecordWithConfidence {
  /** Index into the original source records array */
  sourceIndex: number;
  /** The transformed CMS-ready record */
  record: TransformedRecord;
  /** Multi-dimensional confidence scoring */
  confidence: RecordConfidence;
  /** Current review status */
  status: RecordReviewStatus;
  /** Log of transformations applied to produce this record */
  transformationLog: TransformationLogEntry[];
}

export type RecordReviewStatus =
  | "auto_approved"
  | "needs_review"
  | "approved"
  | "edited"
  | "skipped";

// ---------------------------------------------------------------------------
// Transformation Logging (Refinement #6)
// ---------------------------------------------------------------------------

export interface TransformationLogEntry {
  /** Which recipe rule produced this */
  ruleId: string;
  /** Target field affected */
  targetField: string;
  /** Rule type applied */
  ruleType: RecipeRuleType;
  /** Whether AI was involved */
  aiUsed: boolean;
  /** Confidence for this specific transformation */
  confidence: number;
  /** Human-readable description of what happened */
  description: string;
  /** Timestamp */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// Recipe Data Model
// ---------------------------------------------------------------------------

export interface ImportRecipe {
  id?: string;
  name: string;
  templateType: TemplateType;
  sourceType?: SourceType;
  mappingPresetId?: string;
  rules: RecipeRule[];
  aiSettings?: RecipeAISettings;
  confidenceThreshold: number;
  /** Refinement #3: version tracking — incremented on each save */
  version: number;
  isActive: boolean;
  sampleSourceRecords?: Record<string, unknown>[];
  sampleOutputRecords?: TransformedRecord[];
  createdAt?: string;
  updatedAt?: string;
  lastUsedAt?: string;
}

export interface RecipeAISettings {
  enabled: boolean;
  actions: AIAction[];
  maxTokensPerCall: number;
  temperature: number;
}

export interface RecipeRule {
  id: string;
  targetField: string;
  ruleType: RecipeRuleType;
  config: Record<string, unknown>;
  enabled: boolean;
  inferredFrom?: RuleInferenceSource;
  /** Optional description for UI display */
  description?: string;
}

export type RuleInferenceSource = "diff" | "pattern" | "ai" | "manual";

export type RecipeRuleType =
  | "direct_map"
  | "static_value"
  | "html_clean"
  | "html_extract"
  | "h2_split"
  | "faq_extract"
  | "hero_extract"
  | "slugify"
  | "ai_transform"
  | "concat"
  | "regex_replace"
  | "ignore";

// ---------------------------------------------------------------------------
// Confidence Scoring (Multi-Dimensional)
// ---------------------------------------------------------------------------

export type ConfidenceCategory =
  | "structural"
  | "extraction"
  | "content_quality"
  | "validation"
  | "ai_ambiguity";

export interface FieldConfidence {
  field: string;
  score: number; // 0.0 – 1.0
  category: ConfidenceCategory;
  reason?: string;
}

export interface DimensionScore {
  category: ConfidenceCategory;
  score: number;
  weight: number;
  details: string[];
}

export interface RecordConfidence {
  overall: number;
  dimensions: DimensionScore[];
  fieldScores: FieldConfidence[];
  flags: string[]; // e.g. ["shortcode_remnants", "empty_sections"]
}

// ---------------------------------------------------------------------------
// Slug Collision Strategy (Refinement #5)
// ---------------------------------------------------------------------------

export type SlugCollisionMode = "skip" | "overwrite" | "unique_suffix";

export interface SlugCollisionConfig {
  mode: SlugCollisionMode;
  /** Max suffix number to try before failing (default 99) */
  maxSuffix?: number;
}

// ---------------------------------------------------------------------------
// Batch Processing
// ---------------------------------------------------------------------------

export interface RecipeBatchConfig {
  batchSize: number;
  concurrentBatches: number;
  retryAttempts: number;
  retryDelayMs: number;
}

export const DEFAULT_BATCH_CONFIG: RecipeBatchConfig = {
  batchSize: 15,
  concurrentBatches: 1,
  retryAttempts: 2,
  retryDelayMs: 1000,
};

export interface BatchProgress {
  currentRecord: number;
  totalRecords: number;
  currentBatch: number;
  totalBatches: number;
  autoApproved: number;
  needsReview: number;
  failed: number;
  phase: "cleaning" | "mapping" | "transforming" | "scoring" | "complete";
}

// ---------------------------------------------------------------------------
// AI Integration
// ---------------------------------------------------------------------------

export type AIAction =
  | "ping"
  | "infer_recipe"
  | "extract_faq"
  | "derive_hero"
  | "generate_meta"
  | "clean_html"
  | "assess_confidence";

export interface AIAssistRequest {
  action: AIAction;
  payload: Record<string, unknown>;
  templateType: TemplateType;
  domainHints?: string[];
}

export interface AIAssistResponse {
  success: boolean;
  action: AIAction;
  result: Record<string, unknown>;
  error?: string;
  tokensUsed?: number;
}

export interface AIPingResponse {
  available: boolean;
  model?: string;
}

// ---------------------------------------------------------------------------
// Image Handling (Refinement #4)
// ---------------------------------------------------------------------------

export interface ImageProcessingResult {
  originalUrl: string;
  newUrl?: string;
  success: boolean;
  warning?: string;
}

export interface ImageProcessingLog {
  field: string;
  originalUrl: string;
  result: "uploaded" | "skipped_download_failed" | "skipped_upload_failed" | "skipped_invalid" | "skipped_already_local";
  newUrl?: string;
  warning?: string;
}

// ---------------------------------------------------------------------------
// Migration Session (Save & Resume)
// ---------------------------------------------------------------------------

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export interface MigrationSession {
  id: string;
  name?: string;
  templateType: TemplateType;
  sourceType: SourceType;
  recipeId?: string;
  currentStep: string;
  // Structured counts
  recordsCount: number;
  approvedCount: number;
  exceptionCount: number;
  skippedCount: number;
  errorCount: number;
  // Large state blobs
  sourceSummary?: { columns: string[]; recordCount: number };
  sourceData?: SourceRecord[];
  /** Refinement #1: snapshot of the source at session creation time */
  sourceSnapshot?: Record<string, unknown>;
  mapping?: MappingConfig;
  recipe?: ImportRecipe;
  transformedRecords?: TransformedRecordWithConfidence[];
  exceptionIndices?: number[];
  reviewState?: Record<number, RecordReviewStatus>;
  validationResult?: {
    valid: boolean;
    issues: ValidationIssue[];
    errorRowCount: number;
    warningRowCount: number;
  };
  status: SessionStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Recipe Inference
// ---------------------------------------------------------------------------

export interface RecipeInferenceInput {
  mappedSample: MappedRecord;
  correctedOutput: TransformedRecord;
  sourceColumns: string[];
  templateType: TemplateType;
  aiAvailable: boolean;
}

export interface RecipeInferenceResult {
  rules: RecipeRule[];
  confidence: number;
  ambiguousFields: string[];
}

// ---------------------------------------------------------------------------
// Recipe Rule Execution
// ---------------------------------------------------------------------------

export interface RuleExecutionResult {
  value: unknown;
  confidence: FieldConfidence;
  log: TransformationLogEntry;
}

// ---------------------------------------------------------------------------
// DB Row Shapes (for Supabase serialization)
// ---------------------------------------------------------------------------

export interface ImportRecipeRow {
  id: string;
  name: string;
  template_type: string;
  source_type: string | null;
  mapping_preset_id: string | null;
  recipe_json: Record<string, unknown>;
  ai_settings_json: Record<string, unknown> | null;
  confidence_threshold: number;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

export interface MigrationSessionRow {
  id: string;
  name: string | null;
  template_type: string;
  source_type: string;
  recipe_id: string | null;
  current_step: string;
  records_count: number;
  approved_count: number;
  exception_count: number;
  skipped_count: number;
  error_count: number;
  source_summary_json: Record<string, unknown> | null;
  source_data_json: unknown[] | null;
  /** Refinement #1 */
  source_snapshot_json: Record<string, unknown> | null;
  mapping_json: Record<string, unknown> | null;
  recipe_json: Record<string, unknown> | null;
  transformed_records_json: unknown[] | null;
  exception_indices: number[] | null;
  review_state_json: Record<string, unknown> | null;
  validation_result_json: Record<string, unknown> | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

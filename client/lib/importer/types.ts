// ============================================================================
// Bulk Content Importer — Type Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Template & Field Definitions
// ---------------------------------------------------------------------------

export type TemplateType = "practice" | "post";
export type ImportMode = "create" | "update" | "upsert" | "skip_duplicates";
export type SourceType = "csv" | "api" | "json";
export type SlugCollisionMode = "skip" | "overwrite" | "unique_suffix";

export interface TemplateFieldDefinition {
  /** Unique key used in mapping config, e.g. "hero.tagline" */
  key: string;
  /** Human-readable label shown in the mapping UI */
  label: string;
  /** Dot-path into the CMS record (may differ from key for nested content) */
  cmsPath: string;
  /** Whether this field is required for a valid record */
  required: boolean;
  /** Field data type */
  type: "text" | "richtext" | "image" | "url" | "select" | "boolean" | "json";
  /** Group label for visual grouping in the mapping UI */
  group: string;
  /** Help text shown under the field in the mapping UI */
  helpText?: string;
  /** For repeater parents — marks this as a repeater group */
  repeater?: boolean;
  /** For fields inside a repeater — the parent repeater key */
  repeaterParent?: string;
  /** Index suffix pattern for flat CSV columns (e.g. "_1", "_2") */
  repeaterIndexPattern?: string;
}

// ---------------------------------------------------------------------------
// Source Data
// ---------------------------------------------------------------------------

/** A single row/record parsed from CSV or JSON */
export type SourceRecord = Record<string, unknown>;

/** Result of parsing a CSV file or JSON feed */
export interface ParseResult {
  records: SourceRecord[];
  columns: string[];
  errors: ParseError[];
}

export interface ParseError {
  row?: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Field Mapping
// ---------------------------------------------------------------------------

export interface FieldMappingEntry {
  /** The template field key this mapping targets */
  targetField: string;
  /** The source column name (from CSV header or JSON key) */
  sourceColumn: string;
  /** Optional static/default value when source is empty */
  defaultValue?: string;
  /** Optional transform: "none" | "html" | "markdown" | "slugify" */
  transform?: "none" | "html" | "markdown" | "slugify";
}

export interface MappingConfig {
  mappings: FieldMappingEntry[];
  /** For repeater fields: how many repetitions to look for in flat CSV */
  repeaterCounts?: Record<string, number>;
}

/** A saved mapping preset from the DB */
export interface MappingPreset {
  id: string;
  name: string;
  template_type: TemplateType;
  mapping_json: MappingConfig;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  rowIndex: number;
  field: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  /** Count of rows that have at least one error */
  errorRowCount: number;
  /** Count of rows that have warnings but no errors */
  warningRowCount: number;
}

// ---------------------------------------------------------------------------
// Transformed Records (ready for server)
// ---------------------------------------------------------------------------

export type ImportPublishDateSource = "mapped" | "fallback";

export interface TransformedPracticePage {
  title: string;
  url_path: string;
  page_type: "practice";
  content: Record<string, unknown>;
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  schema_type?: string | null;
  schema_data?: Record<string, unknown> | null;
  published_at?: string | null;
  publish_date_source?: ImportPublishDateSource;
  status: "draft";
}

export interface TransformedBlogPost {
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  category?: string;
  category_id?: string | null;
  content?: unknown[];
  body?: string;
  meta_title?: string;
  meta_description?: string;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  noindex?: boolean;
  published_at?: string | null;
  publish_date_source?: ImportPublishDateSource;
  status: "draft";
}

export type TransformedRecord = TransformedPracticePage | TransformedBlogPost;

// ---------------------------------------------------------------------------
// Prepared Records (Content Preparation step)
// ---------------------------------------------------------------------------

export type PreparedRecordStatus = "needs-review" | "approved" | "skipped";

export interface PreparedRecord {
  /** Index into the original source records array */
  sourceIndex: number;
  /** Current approval status — defaults to "needs-review" */
  status: PreparedRecordStatus;
  /** Snapshot of auto-generated version (read-only reference) */
  autoPrepared: TransformedRecord;
  /** User-edited version (starts as deep copy of autoPrepared) */
  current: TransformedRecord;
  /** Blocking validation issues for this record */
  validationErrors: ValidationIssue[];
  /** Non-blocking validation issues for this record */
  validationWarnings: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Import Job (DB row shape)
// ---------------------------------------------------------------------------

export interface ImportJob {
  id: string;
  source_type: SourceType;
  template_type: TemplateType;
  mode: ImportMode;
  status: "pending" | "processing" | "completed" | "failed";
  total_records: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  config_json: Record<string, unknown>;
  created_by?: string;
  created_at: string;
  completed_at?: string;
}

export interface ImportJobItem {
  id: string;
  import_job_id: string;
  row_index: number;
  source_data: Record<string, unknown> | null;
  target_slug: string | null;
  status: "pending" | "created" | "updated" | "skipped" | "failed";
  error_message: string | null;
  created_entity_id: string | null;
  /** Refinement #6: transformation log for debugging */
  transformation_log: Record<string, unknown> | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Batch Processing (client ↔ server)
// ---------------------------------------------------------------------------

export interface BatchRequest {
  job_id: string;
  template_type: TemplateType;
  mode: ImportMode;
  records: TransformedRecord[];
  batch_index: number;
  total_batches: number;
}

export interface BatchItemResult {
  row_index: number;
  status: "created" | "updated" | "skipped" | "failed";
  error_message?: string;
  entity_id?: string;
  slug?: string;
}

export interface BatchResponse {
  success: boolean;
  results: BatchItemResult[];
  error?: string;
}

// ---------------------------------------------------------------------------
// API Feed Fetch (server-side)
// ---------------------------------------------------------------------------

export interface ApiFetchRequest {
  url: string;
  headers?: Record<string, string>;
  jsonPath?: string;
}

export interface ApiFetchResponse {
  success: boolean;
  records?: SourceRecord[];
  columns?: string[];
  error?: string;
  totalFetched?: number;
}

// ---------------------------------------------------------------------------
// Wizard State
// ---------------------------------------------------------------------------

export type WizardStep =
  | "template"
  | "source"
  | "field_detection"
  | "teach_recipe"
  | "auto_transform"
  | "exception_review"
  | "validation"
  | "preview"
  | "import";

export interface WizardState {
  currentStep: WizardStep;
  templateType: TemplateType | null;
  sourceType: SourceType | null;
  parseResult: ParseResult | null;
  mappingConfig: MappingConfig | null;
  preparedRecords: PreparedRecord[];
  validationResult: ValidationResult | null;
  transformedRecords: TransformedRecord[];
  importMode: ImportMode;
  slugCollisionMode: SlugCollisionMode;
  jobId: string | null;
  /** Aggregated results across all batches */
  batchResults: BatchItemResult[];
  isImporting: boolean;
  importProgress: { current: number; total: number } | null;
  // --- New recipe-based fields ---
  /** Current migration session ID (for save & resume) */
  sessionId: string | null;
  /** Active recipe for this import */
  recipe: import("./recipeTypes").ImportRecipe | null;
  /** Mapped records (Stage 3 output) */
  mappedRecords: Record<string, unknown>[];
  /** Confidence-scored transformed records */
  confidenceResults: import("./recipeTypes").TransformedRecordWithConfidence[];
  /** Indices of records that need manual review */
  exceptionIndices: number[];
  /** Whether AI features are available */
  aiAvailable: boolean;
}

export const INITIAL_WIZARD_STATE: WizardState = {
  currentStep: "template",
  templateType: null,
  sourceType: null,
  parseResult: null,
  mappingConfig: null,
  preparedRecords: [],
  validationResult: null,
  transformedRecords: [],
  importMode: "create",
  slugCollisionMode: "skip",
  jobId: null,
  batchResults: [],
  isImporting: false,
  importProgress: null,
  sessionId: null,
  recipe: null,
  mappedRecords: [],
  confidenceResults: [],
  exceptionIndices: [],
  aiAvailable: false,
};

export const BATCH_SIZE = 15;

export const WIZARD_STEPS: WizardStep[] = [
  "template",
  "source",
  "field_detection",
  "teach_recipe",
  "auto_transform",
  "exception_review",
  "validation",
  "preview",
  "import",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  template: "Template",
  source: "Source Data",
  field_detection: "Field Detection",
  teach_recipe: "Build Recipe",
  auto_transform: "Auto-Transform",
  exception_review: "Review",
  validation: "Validation",
  preview: "Preview",
  import: "Import",
};

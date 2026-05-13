import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateType = "practice" | "post";
type ImportMode = "create" | "update" | "upsert" | "skip_duplicates";

interface BatchRequest {
  job_id: string;
  template_type: TemplateType;
  mode: ImportMode;
  records: Record<string, unknown>[];
  batch_index: number;
  total_batches: number;
}

interface ItemResult {
  row_index: number;
  status: "created" | "updated" | "skipped" | "failed";
  error_message?: string;
  entity_id?: string;
  slug?: string;
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

function validatePayload(body: unknown): { valid: boolean; error?: string; data?: BatchRequest } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Invalid request body" };
  }

  const b = body as Record<string, unknown>;

  if (!b.template_type || !["practice", "post"].includes(b.template_type as string)) {
    return { valid: false, error: "template_type must be 'practice' or 'post'" };
  }

  if (!b.mode || !["create", "update", "upsert", "skip_duplicates"].includes(b.mode as string)) {
    return { valid: false, error: "mode must be one of: create, update, upsert, skip_duplicates" };
  }

  if (!Array.isArray(b.records) || b.records.length === 0) {
    return { valid: false, error: "records must be a non-empty array" };
  }

  if (!b.job_id || typeof b.job_id !== "string") {
    return { valid: false, error: "job_id is required" };
  }

  return { valid: true, data: b as unknown as BatchRequest };
}

function normalizePublishDate(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function validatePracticeRecord(record: Record<string, unknown>): string | null {
  if (!record.title || typeof record.title !== "string" || record.title.trim() === "") {
    return "title is required";
  }

  if (!record.url_path || typeof record.url_path !== "string") {
    return "url_path is required";
  }

  const pathPattern = /^\/practice-areas\/[a-z0-9][a-z0-9-]*[a-z0-9]?\/$/;
  if (!pathPattern.test(record.url_path as string)) {
    return `url_path "${record.url_path}" must match /practice-areas/<slug>/ pattern`;
  }

  if (record.page_type !== "practice") {
    return "page_type must be 'practice'";
  }

  if (!record.content || typeof record.content !== "object" || Array.isArray(record.content)) {
    return "content must be an object";
  }

  const content = record.content as Record<string, unknown>;
  if (!content.hero || typeof content.hero !== "object") {
    return "content.hero must be an object";
  }

  if (content.contentSections && !Array.isArray(content.contentSections)) {
    return "content.contentSections must be an array";
  }

  const faq = content.faq as Record<string, unknown> | undefined;
  if (faq?.items && !Array.isArray(faq.items)) {
    return "content.faq.items must be an array";
  }

  if (record.published_at != null && record.published_at !== "" && !normalizePublishDate(record.published_at)) {
    return `published_at "${record.published_at}" is not a valid date`;
  }

  return null;
}

function validatePostRecord(record: Record<string, unknown>): string | null {
  if (!record.title || typeof record.title !== "string" || record.title.trim() === "") {
    return "title is required";
  }

  if (!record.slug || typeof record.slug !== "string" || record.slug.trim() === "") {
    return "slug is required";
  }

  const slugPattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]?$/;
  if (!slugPattern.test(record.slug as string)) {
    return `slug "${record.slug}" must be lowercase, alphanumeric with hyphens`;
  }

  if (record.body !== undefined && typeof record.body !== "string") {
    return "body must be a string";
  }

  if (record.category_id && typeof record.category_id === "string") {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(record.category_id)) {
      return `category_id "${record.category_id}" is not a valid UUID`;
    }
  }

  if (record.published_at != null && record.published_at !== "" && !normalizePublishDate(record.published_at)) {
    return `published_at "${record.published_at}" is not a valid date`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Image Ingestion
// ---------------------------------------------------------------------------

async function downloadAndUploadImage(
  imageUrl: string,
  supabase: ReturnType<typeof createClient>,
): Promise<{ publicUrl: string; mediaId: string } | null> {
  // Skip if already a Supabase storage URL for this project
  if (supabaseUrl && imageUrl.includes(supabaseUrl.replace("https://", ""))) {
    return null;
  }

  try {
    const parsedUrl = new URL(imageUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return null;
    }
  } catch {
    return null;
  }

  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn(`Image download failed for ${imageUrl}: ${response.status}`);
      return null;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.warn(`Not an image: ${contentType} for ${imageUrl}`);
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_SIZE) {
      console.warn(`Image too large: ${buffer.byteLength} bytes for ${imageUrl}`);
      return null;
    }

    // Determine extension
    const extMap: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/gif": "gif",
      "image/webp": "webp",
      "image/svg+xml": "svg",
    };
    const ext = extMap[contentType] ?? "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const fileName = `imports/${timestamp}-${random}.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, buffer, {
        contentType,
        cacheControl: "2592000",
      });

    if (uploadError) {
      console.warn(`Upload failed for ${imageUrl}:`, uploadError.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Extract original filename for the media record
    const urlPath = new URL(imageUrl).pathname;
    const originalName = urlPath.split("/").pop() ?? fileName;

    // Insert media row
    const { data: mediaRow, error: mediaError } = await supabase
      .from("media")
      .insert({
        file_name: originalName,
        file_path: fileName,
        public_url: publicUrl,
        file_size: buffer.byteLength,
        mime_type: contentType,
      })
      .select("id")
      .single();

    if (mediaError) {
      console.warn("Media row insert failed:", mediaError.message);
    }

    return {
      publicUrl,
      mediaId: mediaRow?.id ?? "",
    };
  } catch (err) {
    console.warn(
      `Image ingestion failed for ${imageUrl}:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Process all image URLs in a practice page record.
 */
async function processImagesForPractice(
  record: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  const content = record.content as Record<string, unknown>;
  if (!content) return;

  // hero.backgroundImage
  const hero = content.hero as Record<string, unknown> | undefined;
  if (hero?.backgroundImage && typeof hero.backgroundImage === "string") {
    const result = await downloadAndUploadImage(hero.backgroundImage, supabase);
    if (result) {
      hero.backgroundImage = result.publicUrl;
    }
  }

  // contentSections[].image
  const sections = content.contentSections as Record<string, unknown>[] | undefined;
  if (Array.isArray(sections)) {
    for (const section of sections) {
      if (section.image && typeof section.image === "string") {
        const result = await downloadAndUploadImage(section.image, supabase);
        if (result) {
          section.image = result.publicUrl;
        }
      }
    }
  }

  // socialProof.testimonials[].ratingImage
  const socialProof = content.socialProof as Record<string, unknown> | undefined;
  if (socialProof?.testimonials && Array.isArray(socialProof.testimonials)) {
    for (const testimonial of socialProof.testimonials as Record<string, unknown>[]) {
      if (testimonial.ratingImage && typeof testimonial.ratingImage === "string") {
        const result = await downloadAndUploadImage(testimonial.ratingImage, supabase);
        if (result) {
          testimonial.ratingImage = result.publicUrl;
        }
      }
    }
  }

  // socialProof.awards.logos[].src
  if (socialProof?.awards && typeof socialProof.awards === "object") {
    const awards = socialProof.awards as Record<string, unknown>;
    if (Array.isArray(awards.logos)) {
      for (const logo of awards.logos as Record<string, unknown>[]) {
        if (logo.src && typeof logo.src === "string") {
          const result = await downloadAndUploadImage(logo.src, supabase);
          if (result) {
            logo.src = result.publicUrl;
          }
        }
      }
    }
  }
}

/**
 * Process all image URLs in a blog post record.
 */
async function processImagesForPost(
  record: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
): Promise<void> {
  if (record.featured_image && typeof record.featured_image === "string") {
    const result = await downloadAndUploadImage(record.featured_image, supabase);
    if (result) {
      record.featured_image = result.publicUrl;
    }
  }

  if (record.og_image && typeof record.og_image === "string") {
    const result = await downloadAndUploadImage(record.og_image, supabase);
    if (result) {
      record.og_image = result.publicUrl;
    }
  }
}

// ---------------------------------------------------------------------------
// Category matching for blog posts
// ---------------------------------------------------------------------------

interface CategoryLookupRow {
  id: string;
  name: string | null;
  slug: string | null;
}

export function normalizeImportedCategoryName(categoryName: string): string {
  return categoryName.trim().replace(/\s+/g, " ");
}

export function normalizeImportedCategorySlug(categoryName: string): string {
  const normalizedName = normalizeImportedCategoryName(categoryName);
  const slug = normalizedName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();

  return slug || "uncategorized";
}

function normalizeCategoryComparisonValue(categoryName: string): string {
  return normalizeImportedCategoryName(categoryName).toLowerCase();
}

function findEquivalentCategoryByName(
  categories: CategoryLookupRow[],
  categoryName: string,
): CategoryLookupRow | null {
  const normalizedTarget = normalizeCategoryComparisonValue(categoryName);

  return categories.find((category) => {
    if (typeof category.name !== "string" || category.name.trim() === "") {
      return false;
    }

    return normalizeCategoryComparisonValue(category.name) === normalizedTarget;
  }) ?? null;
}

function isUniqueSlugCollision(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) {
    return false;
  }

  return error.code === "23505" || error.message?.toLowerCase().includes("duplicate key") === true;
}

async function findCategoryBySlug(
  slug: string,
  supabase: ReturnType<typeof createClient>,
): Promise<CategoryLookupRow | null> {
  const { data, error } = await supabase
    .from("post_categories")
    .select("id, name, slug")
    .eq("slug", slug)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`Failed to query category by slug "${slug}":`, error.message);
    return null;
  }

  return data ?? null;
}

async function findCategoryByName(
  categoryName: string,
  supabase: ReturnType<typeof createClient>,
): Promise<CategoryLookupRow | null> {
  const { data: directMatch, error: directMatchError } = await supabase
    .from("post_categories")
    .select("id, name, slug")
    .ilike("name", categoryName)
    .limit(1)
    .maybeSingle();

  if (directMatchError) {
    console.warn(`Failed to query category by name "${categoryName}":`, directMatchError.message);
  } else if (directMatch) {
    return directMatch;
  }

  const { data: categories, error } = await supabase
    .from("post_categories")
    .select("id, name, slug");

  if (error) {
    console.warn(`Failed to load categories for name matching "${categoryName}":`, error.message);
    return null;
  }

  return findEquivalentCategoryByName(categories ?? [], categoryName);
}

export async function resolveCategory(
  categoryName: string,
  supabase: ReturnType<typeof createClient>,
): Promise<string | null> {
  if (!categoryName || categoryName.trim() === "") {
    return null;
  }

  const normalizedName = normalizeImportedCategoryName(categoryName);
  const normalizedSlug = normalizeImportedCategorySlug(normalizedName);

  const existingBySlug = await findCategoryBySlug(normalizedSlug, supabase);
  if (existingBySlug) {
    return existingBySlug.id;
  }

  const existingByName = await findCategoryByName(normalizedName, supabase);
  if (existingByName) {
    return existingByName.id;
  }

  const { data: newCategory, error } = await supabase
    .from("post_categories")
    .insert({ name: normalizedName, slug: normalizedSlug })
    .select("id, name, slug")
    .single();

  if (error) {
    if (isUniqueSlugCollision(error)) {
      const collidedCategory = await findCategoryBySlug(normalizedSlug, supabase);
      if (collidedCategory) {
        return collidedCategory.id;
      }
    }

    console.warn(`Failed to create category "${normalizedName}":`, error.message);
    return null;
  }

  return newCategory?.id ?? null;
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
    const parsed = JSON.parse(event.body || "{}");
    const validation = validatePayload(parsed);

    if (!validation.valid || !validation.data) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: validation.error }),
      };
    }

    const { job_id, template_type, mode, records, batch_index } = validation.data;
    const results: ItemResult[] = [];

    // Update job status to processing on first batch
    if (batch_index === 0) {
      await supabase
        .from("import_jobs")
        .update({ status: "processing" })
        .eq("id", job_id);
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = { ...records[i] } as Record<string, unknown>;
      const globalIndex = batch_index * 15 + i;

      try {
        if (template_type === "practice") {
          const result = await processPracticeRecord(record, mode, supabase, globalIndex, job_id);
          results.push(result);
        } else {
          const result = await processPostRecord(record, mode, supabase, globalIndex, job_id);
          results.push(result);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.push({
          row_index: globalIndex,
          status: "failed",
          error_message: errorMsg,
        });

        // Log to import_job_items
        await supabase.from("import_job_items").insert({
          import_job_id: job_id,
          row_index: globalIndex,
          source_data: record,
          status: "failed",
          error_message: errorMsg,
        });
      }
    }

    // Update job counts
    const created = results.filter((r) => r.status === "created").length;
    const updated = results.filter((r) => r.status === "updated").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    const failed = results.filter((r) => r.status === "failed").length;

    // Use raw SQL for atomic increment to avoid race conditions between batches
    await supabase.rpc("increment_import_counts", {
      p_job_id: job_id,
      p_created: created,
      p_updated: updated,
      p_skipped: skipped,
      p_failed: failed,
    }).then(() => {}).catch(async () => {
      // Fallback: direct update if RPC doesn't exist
      const { data: job } = await supabase
        .from("import_jobs")
        .select("created_count, updated_count, skipped_count, failed_count")
        .eq("id", job_id)
        .single();

      if (job) {
        await supabase
          .from("import_jobs")
          .update({
            created_count: (job.created_count ?? 0) + created,
            updated_count: (job.updated_count ?? 0) + updated,
            skipped_count: (job.skipped_count ?? 0) + skipped,
            failed_count: (job.failed_count ?? 0) + failed,
          })
          .eq("id", job_id);
      }
    });

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        results,
      }),
    };
  } catch (error) {
    console.error("Bulk import error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      }),
    };
  }
};

// ---------------------------------------------------------------------------
// Process a single practice page record
// ---------------------------------------------------------------------------

async function processPracticeRecord(
  record: Record<string, unknown>,
  mode: ImportMode,
  supabase: ReturnType<typeof createClient>,
  rowIndex: number,
  jobId: string,
): Promise<ItemResult> {
  // Validate
  const validationError = validatePracticeRecord(record);
  if (validationError) {
    await logJobItem(supabase, jobId, rowIndex, record, "failed", validationError);
    return { row_index: rowIndex, status: "failed", error_message: validationError };
  }

  const urlPath = record.url_path as string;

  // Check for existing page
  const { data: existing } = await supabase
    .from("pages")
    .select("id, published_at")
    .eq("url_path", urlPath)
    .limit(1)
    .single();

  // Apply mode logic
  if (mode === "create" && existing) {
    const msg = `Page already exists at ${urlPath}`;
    await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, urlPath);
    return { row_index: rowIndex, status: "failed", error_message: msg, slug: urlPath };
  }

  if (mode === "update" && !existing) {
    const msg = `No existing page found at ${urlPath}`;
    await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, urlPath);
    return { row_index: rowIndex, status: "failed", error_message: msg, slug: urlPath };
  }

  if (mode === "skip_duplicates" && existing) {
    await logJobItem(supabase, jobId, rowIndex, record, "skipped", undefined, urlPath);
    return { row_index: rowIndex, status: "skipped", slug: urlPath };
  }

  // Process images
  await processImagesForPractice(record, supabase);

  const normalizedPublishedAt = normalizePublishDate(record.published_at);
  const shouldPreserveExistingPublishDate =
    record.publish_date_source === "fallback" && !!existing?.published_at;

  // Build the row
  const pageRow = {
    title: record.title,
    url_path: urlPath,
    page_type: "practice",
    content: record.content,
    meta_title: record.meta_title ?? null,
    meta_description: record.meta_description ?? null,
    canonical_url: record.canonical_url ?? null,
    og_title: record.og_title ?? null,
    og_description: record.og_description ?? null,
    og_image: record.og_image ?? null,
    noindex: record.noindex ?? false,
    schema_type: record.schema_type ?? null,
    schema_data: record.schema_data ?? null,
    published_at: shouldPreserveExistingPublishDate
      ? existing?.published_at ?? null
      : normalizedPublishedAt,
    status: "draft",
  };

  if (existing && (mode === "update" || mode === "upsert")) {
    // Update existing
    const { error } = await supabase
      .from("pages")
      .update(pageRow)
      .eq("id", existing.id);

    if (error) {
      const msg = `Update failed: ${error.message}`;
      await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, urlPath);
      return { row_index: rowIndex, status: "failed", error_message: msg, slug: urlPath };
    }

    await logJobItem(supabase, jobId, rowIndex, record, "updated", undefined, urlPath, existing.id);
    return { row_index: rowIndex, status: "updated", entity_id: existing.id, slug: urlPath };
  } else {
    // Insert new
    const { data: newPage, error } = await supabase
      .from("pages")
      .insert(pageRow)
      .select("id")
      .single();

    if (error) {
      const msg = `Insert failed: ${error.message}`;
      await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, urlPath);
      return { row_index: rowIndex, status: "failed", error_message: msg, slug: urlPath };
    }

    const entityId = newPage?.id;
    await logJobItem(supabase, jobId, rowIndex, record, "created", undefined, urlPath, entityId);
    return { row_index: rowIndex, status: "created", entity_id: entityId, slug: urlPath };
  }
}

// ---------------------------------------------------------------------------
// Process a single blog post record
// ---------------------------------------------------------------------------

export async function processPostRecord(
  record: Record<string, unknown>,
  mode: ImportMode,
  supabase: ReturnType<typeof createClient>,
  rowIndex: number,
  jobId: string,
): Promise<ItemResult> {
  // Validate
  const validationError = validatePostRecord(record);
  if (validationError) {
    await logJobItem(supabase, jobId, rowIndex, record, "failed", validationError);
    return { row_index: rowIndex, status: "failed", error_message: validationError };
  }

  const slug = record.slug as string;

  // Resolve category if provided
  if (record.category && typeof record.category === "string") {
    const categoryId = await resolveCategory(record.category, supabase);
    record.category_id = categoryId;
  }

  // Check for existing post
  const { data: existing } = await supabase
    .from("posts")
    .select("id, published_at")
    .eq("slug", slug)
    .limit(1)
    .single();

  // Apply mode logic
  if (mode === "create" && existing) {
    const msg = `Post already exists with slug "${slug}"`;
    await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, slug);
    return { row_index: rowIndex, status: "failed", error_message: msg, slug };
  }

  if (mode === "update" && !existing) {
    const msg = `No existing post found with slug "${slug}"`;
    await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, slug);
    return { row_index: rowIndex, status: "failed", error_message: msg, slug };
  }

  if (mode === "skip_duplicates" && existing) {
    await logJobItem(supabase, jobId, rowIndex, record, "skipped", undefined, slug);
    return { row_index: rowIndex, status: "skipped", slug };
  }

  // Process images
  await processImagesForPost(record, supabase);

  const normalizedPublishedAt = normalizePublishDate(record.published_at);
  const shouldPreserveExistingPublishDate =
    record.publish_date_source === "fallback" && !!existing?.published_at;

  // Build the row — exclude the "category" field (not a DB column)
  const postRow = {
    title: record.title,
    slug,
    excerpt: record.excerpt ?? null,
    featured_image: record.featured_image ?? null,
    category_id: record.category_id ?? null,
    content: record.content ?? [],
    body: record.body ?? "",
    meta_title: record.meta_title ?? null,
    meta_description: record.meta_description ?? null,
    canonical_url: record.canonical_url ?? null,
    og_title: record.og_title ?? null,
    og_description: record.og_description ?? null,
    og_image: record.og_image ?? null,
    noindex: record.noindex ?? false,
    published_at: shouldPreserveExistingPublishDate
      ? existing?.published_at ?? null
      : normalizedPublishedAt,
    status: "draft",
  };

  if (existing && (mode === "update" || mode === "upsert")) {
    const { error } = await supabase
      .from("posts")
      .update(postRow)
      .eq("id", existing.id);

    if (error) {
      const msg = `Update failed: ${error.message}`;
      await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, slug);
      return { row_index: rowIndex, status: "failed", error_message: msg, slug };
    }

    await logJobItem(supabase, jobId, rowIndex, record, "updated", undefined, slug, existing.id);
    return { row_index: rowIndex, status: "updated", entity_id: existing.id, slug };
  } else {
    const { data: newPost, error } = await supabase
      .from("posts")
      .insert(postRow)
      .select("id")
      .single();

    if (error) {
      const msg = `Insert failed: ${error.message}`;
      await logJobItem(supabase, jobId, rowIndex, record, "failed", msg, slug);
      return { row_index: rowIndex, status: "failed", error_message: msg, slug };
    }

    const entityId = newPost?.id;
    await logJobItem(supabase, jobId, rowIndex, record, "created", undefined, slug, entityId);
    return { row_index: rowIndex, status: "created", entity_id: entityId, slug };
  }
}

// ---------------------------------------------------------------------------
// Logging helper
// ---------------------------------------------------------------------------

async function logJobItem(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  rowIndex: number,
  sourceData: Record<string, unknown>,
  status: string,
  errorMessage?: string,
  slug?: string,
  entityId?: string,
): Promise<void> {
  try {
    await supabase.from("import_job_items").insert({
      import_job_id: jobId,
      row_index: rowIndex,
      source_data: sourceData,
      target_slug: slug ?? null,
      status,
      error_message: errorMessage ?? null,
      created_entity_id: entityId ?? null,
    });
  } catch (err) {
    console.warn("Failed to log import job item:", err);
  }
}

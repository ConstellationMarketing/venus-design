import { useState, useCallback } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  SkipForward,
  RefreshCw,
  ArrowUpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import type {
  TemplateType,
  SourceType,
  TransformedRecord,
  PreparedRecord,
  ImportMode,
  BatchItemResult,
  BatchResponse,
} from "@site/lib/importer/types";
import { BATCH_SIZE } from "@site/lib/importer/types";
import type {
  ImportRecipe,
  TransformedRecordWithConfidence,
} from "@site/lib/importer/recipeTypes";
import {
  completeSession,
  touchRecipe,
} from "@site/lib/importer/sessionPersistence";
import { supabase } from "../../../../vendor/cms-core/client/lib/supabase";

interface StepImportRunProps {
  templateType: TemplateType;
  sourceType: SourceType;
  transformedRecords: TransformedRecord[];
  preparedRecords: PreparedRecord[];
  /** New recipe-flow fields */
  confidenceResults?: TransformedRecordWithConfidence[];
  recipe?: ImportRecipe | null;
  sessionId?: string | null;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  jobId: string | null;
  onJobIdChange: (id: string) => void;
  batchResults: BatchItemResult[];
  onBatchResults: (results: BatchItemResult[]) => void;
  isImporting: boolean;
  onImportingChange: (importing: boolean) => void;
  importProgress: { current: number; total: number } | null;
  onProgressChange: (
    progress: { current: number; total: number } | null,
  ) => void;
  onReset: () => void;
  onBack: () => void;
}

const MODE_OPTIONS: {
  value: ImportMode;
  label: string;
  description: string;
}[] = [
  {
    value: "create",
    label: "Create Only",
    description: "Insert new records. Fail if slug/path already exists.",
  },
  {
    value: "skip_duplicates",
    label: "Skip Duplicates",
    description: "Insert new records. Silently skip if slug/path exists.",
  },
  {
    value: "upsert",
    label: "Upsert",
    description: "Insert new or update existing records.",
  },
  {
    value: "update",
    label: "Update Only",
    description: "Update existing records only. Fail if not found.",
  },
];

export default function StepImportRun({
  templateType,
  sourceType,
  transformedRecords,
  preparedRecords,
  confidenceResults,
  recipe,
  sessionId,
  importMode,
  onImportModeChange,
  jobId,
  onJobIdChange,
  batchResults,
  onBatchResults,
  isImporting,
  onImportingChange,
  importProgress,
  onProgressChange,
  onReset,
  onBack,
}: StepImportRunProps) {
  const [error, setError] = useState<string | null>(null);

  const useRecipeFlow =
    confidenceResults !== undefined && confidenceResults.length > 0;

  // Count calculations
  const activeCount = useRecipeFlow
    ? confidenceResults.filter(
        (r) =>
          r.status === "auto_approved" ||
          r.status === "approved" ||
          r.status === "edited",
      ).length
    : preparedRecords.filter((r) => r.status === "approved").length;

  const skippedCountPrep = useRecipeFlow
    ? confidenceResults.filter((r) => r.status === "skipped").length
    : preparedRecords.filter((r) => r.status === "skipped").length;

  const needsReviewCount = useRecipeFlow
    ? confidenceResults.filter((r) => r.status === "needs_review").length
    : preparedRecords.filter((r) => r.status === "needs-review").length;

  const totalBatches = Math.ceil(transformedRecords.length / BATCH_SIZE);
  const isComplete = !isImporting && batchResults.length > 0;

  const createdCount = batchResults.filter(
    (r) => r.status === "created",
  ).length;
  const updatedCount = batchResults.filter(
    (r) => r.status === "updated",
  ).length;
  const skippedCount = batchResults.filter(
    (r) => r.status === "skipped",
  ).length;
  const failedCount = batchResults.filter(
    (r) => r.status === "failed",
  ).length;

  const startImport = useCallback(async () => {
    setError(null);
    onImportingChange(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setError("Authentication required. Please log in again.");
        onImportingChange(false);
        return;
      }

      // Create the import job with recipe and session references
      const jobInsert: Record<string, unknown> = {
        source_type: sourceType,
        template_type: templateType,
        mode: importMode,
        total_records: transformedRecords.length,
        status: "pending",
      };

      // Add recipe snapshot if available (Refinement #2)
      if (recipe?.id) {
        jobInsert.recipe_id = recipe.id;
        jobInsert.recipe_snapshot_json = {
          name: recipe.name,
          version: recipe.version,
          rules: recipe.rules,
          confidenceThreshold: recipe.confidenceThreshold,
        };
      }

      // Add session reference
      if (sessionId) {
        jobInsert.session_id = sessionId;
      }

      const { data: job, error: jobError } = await supabase
        .from("import_jobs")
        .insert(jobInsert)
        .select("id")
        .single();

      if (jobError || !job) {
        setError(
          `Failed to create import job: ${jobError?.message ?? "Unknown"}`,
        );
        onImportingChange(false);
        return;
      }

      onJobIdChange(job.id);

      // Process batches
      for (let i = 0; i < totalBatches; i++) {
        const batchRecords = transformedRecords.slice(
          i * BATCH_SIZE,
          (i + 1) * BATCH_SIZE,
        );

        onProgressChange({ current: i + 1, total: totalBatches });

        let retries = 0;
        let batchSuccess = false;

        while (retries < 2 && !batchSuccess) {
          try {
            const response = await fetch(
              "/.netlify/functions/bulk-import",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  job_id: job.id,
                  template_type: templateType,
                  mode: importMode,
                  records: batchRecords,
                  batch_index: i,
                  total_batches: totalBatches,
                }),
              },
            );

            const data: BatchResponse = await response.json();

            if (response.ok && data.success) {
              onBatchResults(data.results);
              batchSuccess = true;
            } else {
              if (retries === 0) {
                retries++;
                continue;
              }
              const failedResults: BatchItemResult[] = batchRecords.map(
                (_, idx) => ({
                  row_index: i * BATCH_SIZE + idx,
                  status: "failed" as const,
                  error_message: data.error || `Batch ${i + 1} failed`,
                }),
              );
              onBatchResults(failedResults);
              batchSuccess = true;
            }
          } catch (fetchError) {
            if (retries === 0) {
              retries++;
              continue;
            }
            const failedResults: BatchItemResult[] = batchRecords.map(
              (_, idx) => ({
                row_index: i * BATCH_SIZE + idx,
                status: "failed" as const,
                error_message:
                  fetchError instanceof Error
                    ? fetchError.message
                    : "Network error",
              }),
            );
            onBatchResults(failedResults);
            batchSuccess = true;
          }
        }
      }

      // Mark job as completed
      await supabase
        .from("import_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      // Mark session as completed if present
      if (sessionId) {
        try {
          await completeSession(sessionId, token);
        } catch {
          // Non-critical
        }
      }

      // Update recipe last_used_at
      if (recipe?.id) {
        try {
          await touchRecipe(recipe.id, token);
        } catch {
          // Non-critical
        }
      }
    } catch (err) {
      setError(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      onImportingChange(false);
      onProgressChange(null);
    }
  }, [
    templateType,
    sourceType,
    importMode,
    transformedRecords,
    totalBatches,
    recipe,
    sessionId,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {isComplete ? "Import Complete" : "Run Import"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isComplete
            ? "Review the import results below"
            : `Importing ${activeCount} approved record${activeCount !== 1 ? "s" : ""} as ${templateType === "practice" ? "practice pages" : "blog posts"}${skippedCountPrep > 0 ? ` (${skippedCountPrep} skipped` : ""}${needsReviewCount > 0 ? `, ${needsReviewCount} needs review` : ""}${skippedCountPrep > 0 || needsReviewCount > 0 ? ")" : ""}`}
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Import options (before start) */}
      {!isImporting && !isComplete && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Import Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Duplicate Handling Mode</Label>
              <Select
                value={importMode}
                onValueChange={(val) =>
                  onImportModeChange(val as ImportMode)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div>
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          — {opt.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-1 text-sm">
              <p>
                <span className="font-medium">Approved records:</span>{" "}
                {transformedRecords.length}
                {skippedCountPrep > 0 && (
                  <span className="text-muted-foreground ml-1">
                    ({skippedCountPrep} skipped, {needsReviewCount}{" "}
                    unreviewed)
                  </span>
                )}
              </p>
              <p>
                <span className="font-medium">Batches:</span> {totalBatches}{" "}
                ({BATCH_SIZE} per batch)
              </p>
              {recipe && (
                <p>
                  <span className="font-medium">Recipe:</span>{" "}
                  {recipe.name} (v{recipe.version})
                </p>
              )}
              <p>
                <span className="font-medium">Status:</span> All records
                will be imported as{" "}
                <Badge variant="secondary">draft</Badge>
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startImport}
                className="gap-2"
                disabled={transformedRecords.length === 0}
              >
                <ArrowUpCircle className="h-4 w-4" />
                Start Import
              </Button>
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            </div>

            {transformedRecords.length === 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  No approved records to import. Go back to review and
                  approve records.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {isImporting && importProgress && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="font-medium">
                Processing batch {importProgress.current} of{" "}
                {importProgress.total}
              </span>
            </div>
            <Progress
              value={
                (importProgress.current / importProgress.total) * 100
              }
            />
            <p className="text-sm text-muted-foreground">
              {batchResults.length} records processed so far...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results summary */}
      {isComplete && (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{createdCount}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{updatedCount}</p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <SkipForward className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{skippedCount}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <XCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold">{failedCount}</p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Failed rows detail */}
          {failedCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-red-600">
                  Failed Records ({failedCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Row</TableHead>
                        <TableHead className="w-40">Slug</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {batchResults
                        .filter((r) => r.status === "failed")
                        .map((r) => (
                          <TableRow key={r.row_index}>
                            <TableCell className="font-mono text-sm">
                              {r.row_index + 1}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {r.slug ?? "—"}
                            </TableCell>
                            <TableCell className="text-sm text-red-600">
                              {r.error_message}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button
              onClick={onReset}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Start New Import
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

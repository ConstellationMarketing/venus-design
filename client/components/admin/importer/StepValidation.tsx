import { useEffect, useMemo } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  TemplateType,
  ParseResult,
  MappingConfig,
  ValidationResult,
  TransformedRecord,
  PreparedRecord,
} from "@site/lib/importer/types";
import type { TransformedRecordWithConfidence } from "@site/lib/importer/recipeTypes";
import { validatePreparedRecords } from "@site/lib/importer/validator";
import {
  getConfidenceColor,
  getConfidenceTextColor,
} from "@site/lib/importer/confidenceScorer";

interface StepValidationProps {
  templateType: TemplateType;
  parseResult: ParseResult;
  mappingConfig: MappingConfig;
  preparedRecords: PreparedRecord[];
  /** New recipe-flow: confidence-scored records from auto-transform */
  confidenceResults?: TransformedRecordWithConfidence[];
  validationResult: ValidationResult | null;
  onValidationComplete: (result: ValidationResult) => void;
  onTransformed: (records: TransformedRecord[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepValidation({
  templateType,
  preparedRecords,
  confidenceResults,
  validationResult,
  onValidationComplete,
  onTransformed,
  onNext,
  onBack,
}: StepValidationProps) {
  // Determine if we're using the new recipe flow
  const useRecipeFlow =
    confidenceResults !== undefined && confidenceResults.length > 0;

  // Run validation on mount or when records change
  useEffect(() => {
    if (useRecipeFlow) {
      // New recipe flow: validate confidence results
      const activeRecords = confidenceResults.filter(
        (r) =>
          r.status === "auto_approved" ||
          r.status === "approved" ||
          r.status === "edited",
      );
      const result = validateConfidenceRecords(activeRecords, templateType);
      onValidationComplete(result);
      onTransformed(activeRecords.map((r) => r.record));
    } else {
      // Legacy flow: validate prepared records
      const result = validatePreparedRecords(preparedRecords, templateType);
      onValidationComplete(result);
      const approved = preparedRecords
        .filter((r) => r.status === "approved")
        .map((r) => r.current);
      onTransformed(approved);
    }
  }, [templateType, preparedRecords, confidenceResults]);

  // Group issues by severity
  const { errors, warnings } = useMemo(() => {
    if (!validationResult) return { errors: [], warnings: [] };
    return {
      errors: validationResult.issues.filter((i) => i.severity === "error"),
      warnings: validationResult.issues.filter((i) => i.severity === "warning"),
    };
  }, [validationResult]);

  // Status counts
  const counts = useMemo(() => {
    if (useRecipeFlow) {
      const autoApproved = confidenceResults.filter(
        (r) => r.status === "auto_approved",
      ).length;
      const approved = confidenceResults.filter(
        (r) => r.status === "approved",
      ).length;
      const edited = confidenceResults.filter(
        (r) => r.status === "edited",
      ).length;
      const needsReview = confidenceResults.filter(
        (r) => r.status === "needs_review",
      ).length;
      const skipped = confidenceResults.filter(
        (r) => r.status === "skipped",
      ).length;
      return {
        activeCount: autoApproved + approved + edited,
        needsReviewCount: needsReview,
        skippedCount: skipped,
        total: confidenceResults.length,
      };
    }
    const approvedCount = preparedRecords.filter(
      (r) => r.status === "approved",
    ).length;
    const needsReviewCount = preparedRecords.filter(
      (r) => r.status === "needs-review",
    ).length;
    const skippedCount = preparedRecords.filter(
      (r) => r.status === "skipped",
    ).length;
    return {
      activeCount: approvedCount,
      needsReviewCount,
      skippedCount,
      total: preparedRecords.length,
    };
  }, [preparedRecords, confidenceResults, useRecipeFlow]);

  // Confidence summary for recipe flow
  const confidenceSummary = useMemo(() => {
    if (!useRecipeFlow) return null;
    const active = confidenceResults.filter(
      (r) =>
        r.status === "auto_approved" ||
        r.status === "approved" ||
        r.status === "edited",
    );
    if (active.length === 0) return null;
    const avg =
      active.reduce((sum, r) => sum + r.confidence.overall, 0) /
      active.length;
    const min = Math.min(...active.map((r) => r.confidence.overall));
    const max = Math.max(...active.map((r) => r.confidence.overall));
    return { avg, min, max, count: active.length };
  }, [confidenceResults, useRecipeFlow]);

  if (!validationResult) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Validating records...</p>
      </div>
    );
  }

  const totalActive = counts.total - counts.skippedCount;
  const cleanRows =
    totalActive -
    validationResult.errorRowCount -
    validationResult.warningRowCount;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Validation Results</h2>
        <p className="text-sm text-muted-foreground">
          Reviewing {counts.activeCount} active records ({counts.skippedCount}{" "}
          skipped).{" "}
          {useRecipeFlow
            ? "Approved and auto-approved records will be imported."
            : "Only approved records will be imported."}
        </p>
      </div>

      {/* Status summary */}
      <div className="flex flex-wrap gap-2">
        <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-200">
          {counts.activeCount} approved
        </Badge>
        {counts.needsReviewCount > 0 && (
          <Badge variant="secondary" className="gap-1">
            {counts.needsReviewCount} needs review
          </Badge>
        )}
        {counts.skippedCount > 0 && (
          <Badge variant="secondary" className="gap-1 text-muted-foreground">
            {counts.skippedCount} skipped
          </Badge>
        )}
      </div>

      {/* Confidence summary (recipe flow only) */}
      {confidenceSummary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Confidence Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p
                  className={`text-xl font-bold ${getConfidenceTextColor(confidenceSummary.avg)}`}
                >
                  {(confidenceSummary.avg * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Average Confidence
                </p>
              </div>
              <div>
                <p
                  className={`text-xl font-bold ${getConfidenceTextColor(confidenceSummary.min)}`}
                >
                  {(confidenceSummary.min * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Lowest Confidence
                </p>
              </div>
              <div>
                <p
                  className={`text-xl font-bold ${getConfidenceTextColor(confidenceSummary.max)}`}
                >
                  {(confidenceSummary.max * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Highest Confidence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{cleanRows}</p>
                <p className="text-sm text-muted-foreground">Clean records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">
                  {validationResult.warningRowCount}
                </p>
                <p className="text-sm text-muted-foreground">With warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {validationResult.errorRowCount}
                </p>
                <p className="text-sm text-muted-foreground">With errors</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {validationResult.valid && counts.activeCount > 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertDescription>
            {counts.activeCount} record
            {counts.activeCount !== 1 ? "s" : ""} passed validation. You can
            proceed to preview.
          </AlertDescription>
        </Alert>
      )}

      {validationResult.valid && counts.activeCount === 0 && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            No records have been approved yet. Go back to review records before
            importing.
          </AlertDescription>
        </Alert>
      )}

      {!validationResult.valid && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {validationResult.errorRowCount} record(s) have blocking errors. Go
            back to fix issues or skip problematic records.
          </AlertDescription>
        </Alert>
      )}

      {counts.needsReviewCount > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            {counts.needsReviewCount} record(s) have not been reviewed. Only
            approved records will be imported.
          </AlertDescription>
        </Alert>
      )}

      {/* Errors table */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-red-600">
              Errors ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-32">Field</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.slice(0, 50).map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">
                        {issue.rowIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {issue.field}
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {errors.length > 50 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing first 50 of {errors.length} errors
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warnings table */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-yellow-700">
              Warnings ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-32">Field</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warnings.slice(0, 50).map((issue, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">
                        {issue.rowIndex + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {issue.field}
                      </TableCell>
                      <TableCell className="text-sm">
                        {issue.message}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {warnings.length > 50 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing first 50 of {warnings.length} warnings
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={counts.activeCount === 0}>
          Continue to Preview
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate confidence-scored records using the same validation patterns.
 * This creates PreparedRecord-compatible validation from confidence results.
 */
function validateConfidenceRecords(
  records: TransformedRecordWithConfidence[],
  templateType: TemplateType,
): import("@site/lib/importer/types").ValidationResult {
  const issues: import("@site/lib/importer/types").ValidationIssue[] = [];
  const errorRows = new Set<number>();
  const warningRows = new Set<number>();
  const slugMap = new Map<string, number[]>();

  for (let i = 0; i < records.length; i++) {
    const data = records[i].record;

    if (templateType === "practice") {
      const p = data as import("@site/lib/importer/types").TransformedPracticePage;
      if (!p.title || p.title.trim() === "" || p.title === "Untitled") {
        issues.push({ rowIndex: i, field: "title", message: "Title is required", severity: "error" });
        errorRows.add(i);
      }
      if (!p.url_path || p.url_path === "//") {
        issues.push({ rowIndex: i, field: "url_path", message: "URL path is required", severity: "error" });
        errorRows.add(i);
      }
      const slug = p.url_path;
      if (slug) {
        const existing = slugMap.get(slug) ?? [];
        existing.push(i);
        slugMap.set(slug, existing);
      }
    } else {
      const b = data as import("@site/lib/importer/types").TransformedBlogPost;
      if (!b.title || b.title.trim() === "" || b.title === "Untitled") {
        issues.push({ rowIndex: i, field: "title", message: "Title is required", severity: "error" });
        errorRows.add(i);
      }
      if (!b.slug || b.slug.trim() === "") {
        issues.push({ rowIndex: i, field: "slug", message: "Slug is required", severity: "error" });
        errorRows.add(i);
      }
      const slug = b.slug;
      if (slug) {
        const existing = slugMap.get(slug) ?? [];
        existing.push(i);
        slugMap.set(slug, existing);
      }
    }

    // Low confidence warnings
    if (records[i].confidence.overall < 0.5) {
      issues.push({
        rowIndex: i,
        field: "confidence",
        message: `Low confidence score (${(records[i].confidence.overall * 100).toFixed(0)}%)`,
        severity: "warning",
      });
      warningRows.add(i);
    }

    // Flag warnings
    for (const flag of records[i].confidence.flags) {
      issues.push({
        rowIndex: i,
        field: "quality",
        message: flag.replace(/_/g, " "),
        severity: "warning",
      });
      warningRows.add(i);
    }
  }

  // Duplicate slug check
  for (const [slug, indices] of slugMap) {
    if (indices.length > 1) {
      for (const idx of indices) {
        issues.push({
          rowIndex: idx,
          field: templateType === "practice" ? "url_path" : "slug",
          message: `Duplicate slug "${slug}" found in rows: ${indices.map((i) => i + 1).join(", ")}`,
          severity: "error",
        });
        errorRows.add(idx);
      }
    }
  }

  return {
    valid: errorRows.size === 0,
    issues,
    errorRowCount: errorRows.size,
    warningRowCount: Array.from(warningRows).filter((r) => !errorRows.has(r))
      .length,
  };
}

import { useState, useMemo } from "react";
import {
  Eye,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  TemplateType,
  TransformedRecord,
  TransformedPracticePage,
  TransformedBlogPost,
  ValidationResult,
  PreparedRecord,
} from "@site/lib/importer/types";
import type { TransformedRecordWithConfidence } from "@site/lib/importer/recipeTypes";
import {
  getConfidenceColor,
  getConfidenceTextColor,
} from "@site/lib/importer/confidenceScorer";
import PracticePagePreview from "./PracticePagePreview";
import BlogPostPreview from "./BlogPostPreview";

interface StepPreviewProps {
  templateType: TemplateType;
  transformedRecords: TransformedRecord[];
  preparedRecords: PreparedRecord[];
  /** New recipe-flow: confidence-scored records */
  confidenceResults?: TransformedRecordWithConfidence[];
  validationResult: ValidationResult | null;
  onNext: () => void;
  onBack: () => void;
}

const DEFAULT_VISIBLE = 3;

export default function StepPreview({
  templateType,
  transformedRecords,
  preparedRecords,
  confidenceResults,
  onNext,
  onBack,
}: StepPreviewProps) {
  const [showAll, setShowAll] = useState(false);
  const [showNeedsReview, setShowNeedsReview] = useState(false);

  const useRecipeFlow =
    confidenceResults !== undefined && confidenceResults.length > 0;

  // Build display items from either flow
  const displayItems = useMemo(() => {
    if (useRecipeFlow) {
      return confidenceResults
        .filter((r) => {
          if (
            r.status === "auto_approved" ||
            r.status === "approved" ||
            r.status === "edited"
          )
            return true;
          if (r.status === "needs_review" && showNeedsReview) return true;
          return false;
        })
        .map((r) => ({
          key: r.sourceIndex,
          record: r.record,
          status: r.status,
          confidence: r.confidence.overall,
          dimensions: r.confidence.dimensions,
          flags: r.confidence.flags,
        }));
    }
    return preparedRecords
      .filter((r) => {
        if (r.status === "approved") return true;
        if (r.status === "needs-review" && showNeedsReview) return true;
        return false;
      })
      .map((r) => ({
        key: r.sourceIndex,
        record: r.current,
        status: r.status as string,
        confidence: undefined as number | undefined,
        dimensions: undefined as unknown[] | undefined,
        flags: undefined as string[] | undefined,
      }));
  }, [
    preparedRecords,
    confidenceResults,
    showNeedsReview,
    useRecipeFlow,
  ]);

  // Counts
  const approvedCount = useRecipeFlow
    ? confidenceResults.filter(
        (r) =>
          r.status === "auto_approved" ||
          r.status === "approved" ||
          r.status === "edited",
      ).length
    : preparedRecords.filter((r) => r.status === "approved").length;

  const needsReviewCount = useRecipeFlow
    ? confidenceResults.filter((r) => r.status === "needs_review").length
    : preparedRecords.filter((r) => r.status === "needs-review").length;

  const skippedCount = useRecipeFlow
    ? confidenceResults.filter((r) => r.status === "skipped").length
    : preparedRecords.filter((r) => r.status === "skipped").length;

  const totalCount = useRecipeFlow
    ? confidenceResults.length
    : preparedRecords.length;

  const visibleItems = showAll
    ? displayItems
    : displayItems.slice(0, DEFAULT_VISIBLE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Preview Records</h2>
          <p className="text-sm text-muted-foreground">
            Showing {approvedCount} approved of {totalCount} total
            {skippedCount > 0 && ` (${skippedCount} skipped)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {needsReviewCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setShowNeedsReview(!showNeedsReview)}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {showNeedsReview ? "Hide" : "Show"} Needs Review (
              {needsReviewCount})
            </Button>
          )}
          <Badge variant="outline" className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            {visibleItems.length} of {displayItems.length}
          </Badge>
        </div>
      </div>

      <div className="space-y-4">
        {visibleItems.map((item) => {
          const record = item.record;
          const title =
            templateType === "practice"
              ? (record as TransformedPracticePage).title
              : (record as TransformedBlogPost).title;
          const slug =
            templateType === "practice"
              ? (record as TransformedPracticePage).url_path
              : `/blog/${(record as TransformedBlogPost).slug}`;
          const publishDate =
            templateType === "practice"
              ? (record as TransformedPracticePage).published_at
              : (record as TransformedBlogPost).published_at;
          const publishDateSource =
            templateType === "practice"
              ? (record as TransformedPracticePage).publish_date_source
              : (record as TransformedBlogPost).publish_date_source;

          return (
            <Card key={item.key}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <span className="text-muted-foreground">
                      #{item.key + 1}
                    </span>
                    {title}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <RecordStatusBadge status={item.status} />
                    {item.confidence !== undefined && (
                      <ConfidenceBadge confidence={item.confidence} />
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {slug}
                    </Badge>
                    {publishDate && (
                      <Badge variant="outline" className="text-xs">
                        {publishDateSource === "fallback" ? "Fallback date" : "Publish date"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Confidence dimension breakdown (expandable) */}
                {item.dimensions && item.dimensions.length > 0 && (
                  <ConfidenceDimensions
                    dimensions={
                      item.dimensions as {
                        category: string;
                        score: number;
                      }[]
                    }
                    flags={item.flags ?? []}
                  />
                )}

                {publishDate && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {publishDateSource === "fallback"
                      ? "Publish date will default to the import run time because no source date was mapped."
                      : "Publish date was carried through from the mapped source data."} {new Date(publishDate).toLocaleString()}
                  </p>
                )}

                {templateType === "practice" ? (
                  <PracticePagePreview
                    record={record as TransformedPracticePage}
                  />
                ) : (
                  <BlogPostPreview record={record as TransformedBlogPost} />
                )}
              </CardContent>
            </Card>
          );
        })}

        {visibleItems.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p>No approved records to preview.</p>
              <p className="text-sm mt-1">
                Go back to review and approve records.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {displayItems.length > DEFAULT_VISIBLE && (
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="gap-1"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Show All {displayItems.length} Records
              </>
            )}
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Validation
        </Button>
        <Button onClick={onNext} disabled={approvedCount === 0}>
          Continue to Import
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RecordStatusBadge({ status }: { status: string }) {
  const badges: Record<string, { label: string; className: string }> = {
    approved: {
      label: "Approved",
      className: "bg-green-100 text-green-800",
    },
    auto_approved: {
      label: "Auto-Approved",
      className: "bg-green-100 text-green-800",
    },
    edited: {
      label: "Edited",
      className: "bg-blue-100 text-blue-800",
    },
    needs_review: {
      label: "Needs Review",
      className: "bg-yellow-100 text-yellow-800",
    },
    "needs-review": {
      label: "Needs Review",
      className: "bg-yellow-100 text-yellow-800",
    },
  };

  const b = badges[status];
  if (!b) return null;

  return (
    <Badge className={cn("text-xs gap-1", b.className)}>
      {status === "approved" || status === "auto_approved" ? (
        <Check className="h-3 w-3" />
      ) : (
        <AlertTriangle className="h-3 w-3" />
      )}
      {b.label}
    </Badge>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-1.5 py-0.5 rounded",
        getConfidenceColor(confidence),
        getConfidenceTextColor(confidence),
      )}
    >
      {(confidence * 100).toFixed(0)}%
    </span>
  );
}

function ConfidenceDimensions({
  dimensions,
  flags,
}: {
  dimensions: { category: string; score: number }[];
  flags: string[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1"
      >
        <ChevronDown className="h-3 w-3" />
        Show confidence breakdown
      </button>
    );
  }

  return (
    <div className="mb-4 space-y-2">
      <button
        onClick={() => setExpanded(false)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ChevronUp className="h-3 w-3" />
        Hide confidence breakdown
      </button>
      <div className="grid grid-cols-5 gap-2">
        {dimensions.map((dim) => (
          <div
            key={dim.category}
            className="text-center border rounded-md px-2 py-1.5"
          >
            <div
              className={cn(
                "text-sm font-semibold",
                getConfidenceTextColor(dim.score),
              )}
            >
              {(dim.score * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              {dim.category.replace("_", " ")}
            </div>
          </div>
        ))}
      </div>
      {flags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {flags.map((flag) => (
            <Badge
              key={flag}
              variant="outline"
              className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
            >
              {flag.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

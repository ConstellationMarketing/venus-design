import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  SkipForward,
  RotateCcw,
  Search,
  AlertCircle,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TemplateType,
  TransformedPracticePage,
  TransformedBlogPost,
} from "@site/lib/importer/types";
import type {
  TransformedRecordWithConfidence,
  RecordReviewStatus,
} from "@site/lib/importer/recipeTypes";
import {
  getConfidenceColor,
  getConfidenceTextColor,
} from "@site/lib/importer/confidenceScorer";
import PracticePagePrepEditor from "./PracticePagePrepEditor";
import BlogPostPrepEditor from "./BlogPostPrepEditor";

interface StepExceptionReviewProps {
  templateType: TemplateType;
  records: TransformedRecordWithConfidence[];
  exceptionIndices: number[];
  onRecordsChange: (records: TransformedRecordWithConfidence[]) => void;
  onNext: () => void;
  onBack: () => void;
}

type FilterMode = "all_exceptions" | "errors" | "low_confidence" | "warnings";

export default function StepExceptionReview({
  templateType,
  records,
  exceptionIndices,
  onRecordsChange,
  onNext,
  onBack,
}: StepExceptionReviewProps) {
  const [selectedIdx, setSelectedIdx] = useState<number>(
    exceptionIndices[0] ?? 0,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all_exceptions");

  // Counts
  const totalRecords = records.length;
  const needsReviewCount = records.filter(
    (r) => r.status === "needs_review",
  ).length;
  const approvedCount = records.filter(
    (r) => r.status === "approved" || r.status === "auto_approved",
  ).length;
  const editedCount = records.filter((r) => r.status === "edited").length;
  const skippedCount = records.filter((r) => r.status === "skipped").length;
  const errorCount = records.filter(
    (r) => r.confidence.overall < 0.3,
  ).length;

  // Filtered indices
  const filteredIndices = useMemo(() => {
    let indices = exceptionIndices;

    switch (filterMode) {
      case "errors":
        indices = indices.filter((i) => records[i]?.confidence.overall < 0.3);
        break;
      case "low_confidence":
        indices = indices.filter(
          (i) =>
            records[i]?.confidence.overall < 0.8 &&
            records[i]?.confidence.overall >= 0.3,
        );
        break;
      case "warnings":
        indices = indices.filter(
          (i) => records[i]?.confidence.flags.length > 0,
        );
        break;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      indices = indices.filter((i) => {
        const title = getTitle(records[i], templateType);
        return title.toLowerCase().includes(q);
      });
    }

    return indices;
  }, [exceptionIndices, filterMode, searchQuery, records, templateType]);

  const currentRecord = records[selectedIdx];

  // Update a single record
  const updateRecord = useCallback(
    (idx: number, updates: Partial<TransformedRecordWithConfidence>) => {
      const updated = [...records];
      updated[idx] = { ...updated[idx], ...updates };
      onRecordsChange(updated);
    },
    [records, onRecordsChange],
  );

  const handleApprove = (idx: number) => {
    updateRecord(idx, { status: "approved" });
    // Move to next exception
    const nextIdx = filteredIndices.find(
      (i) => i > idx && records[i]?.status === "needs_review",
    );
    if (nextIdx !== undefined) setSelectedIdx(nextIdx);
  };

  const handleSkip = (idx: number) => {
    updateRecord(idx, { status: "skipped" });
    const nextIdx = filteredIndices.find(
      (i) => i > idx && records[i]?.status === "needs_review",
    );
    if (nextIdx !== undefined) setSelectedIdx(nextIdx);
  };

  const handleResetToAuto = (idx: number) => {
    // We don't have the original auto-prepared, so just reset status
    updateRecord(idx, { status: "needs_review" });
  };

  const handleRecordEdit = (idx: number, updated: TransformedPracticePage | TransformedBlogPost) => {
    const current = records[idx];
    updateRecord(idx, {
      record: updated,
      status: current.status === "auto_approved" ? "edited" : current.status === "needs_review" ? "edited" : current.status,
    });
  };

  // Bulk actions
  const handleApproveAll = () => {
    const updated = [...records];
    for (const idx of filteredIndices) {
      if (updated[idx].status === "needs_review" && updated[idx].confidence.overall >= 0.3) {
        updated[idx] = { ...updated[idx], status: "approved" };
      }
    }
    onRecordsChange(updated);
  };

  const handleSkipAll = () => {
    const updated = [...records];
    for (const idx of filteredIndices) {
      if (updated[idx].status === "needs_review") {
        updated[idx] = { ...updated[idx], status: "skipped" };
      }
    }
    onRecordsChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2.5">
        <div className="text-sm">
          <span className="font-semibold">{needsReviewCount}</span> of{" "}
          <span className="font-semibold">{totalRecords}</span> records need
          review
          {errorCount > 0 && (
            <>
              {" "}
              &middot;{" "}
              <span className="text-red-600 font-medium">
                {errorCount} error(s)
              </span>
            </>
          )}
          {skippedCount > 0 && (
            <>
              {" "}
              &middot;{" "}
              <span className="text-muted-foreground">
                {skippedCount} skipped
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleApproveAll}>
            <CheckCheck className="h-3.5 w-3.5 mr-1" />
            Approve All Valid
          </Button>
          <Button variant="outline" size="sm" onClick={handleSkipAll}>
            <SkipForward className="h-3.5 w-3.5 mr-1" />
            Skip All
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select
          value={filterMode}
          onValueChange={(v) => setFilterMode(v as FilterMode)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_exceptions">All Exceptions</SelectItem>
            <SelectItem value="errors">Errors Only</SelectItem>
            <SelectItem value="low_confidence">Low Confidence</SelectItem>
            <SelectItem value="warnings">With Warnings</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary">
          {filteredIndices.length} record(s)
        </Badge>
      </div>

      {/* Two-panel layout */}
      <div className="grid grid-cols-[280px_1fr] gap-4 min-h-[500px]">
        {/* Navigator */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="space-y-0.5 p-2">
              {filteredIndices.map((idx) => {
                const rec = records[idx];
                const title = getTitle(rec, templateType);
                const confidence = rec.confidence.overall;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedIdx(idx)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2",
                      selectedIdx === idx
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted",
                    )}
                  >
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full shrink-0",
                              getConfidenceColor(confidence),
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          Confidence: {(confidence * 100).toFixed(0)}%
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="truncate flex-1">
                      {title.length > 30 ? title.slice(0, 30) + "…" : title}
                    </span>
                    <StatusBadge status={rec.status} compact />
                  </button>
                );
              })}

              {filteredIndices.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No records match the filter.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Editor */}
        <div className="border rounded-lg overflow-hidden flex flex-col">
          {currentRecord ? (
            <>
              {/* Record header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Record #{selectedIdx + 1}
                  </span>
                  <StatusBadge status={currentRecord.status} />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      getConfidenceTextColor(currentRecord.confidence.overall),
                    )}
                  >
                    {(currentRecord.confidence.overall * 100).toFixed(0)}%
                    confidence
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResetToAuto(selectedIdx)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSkip(selectedIdx)}
                  >
                    <SkipForward className="h-3.5 w-3.5 mr-1" />
                    Skip
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(selectedIdx)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>

              {/* Confidence flags */}
              {currentRecord.confidence.flags.length > 0 && (
                <div className="px-4 py-2 border-b bg-amber-50/50 flex flex-wrap gap-1.5">
                  {currentRecord.confidence.flags.map((flag) => (
                    <Badge
                      key={flag}
                      variant="outline"
                      className="bg-amber-100 text-amber-700 border-amber-200 text-xs"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {flag.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Field confidence indicators + editor */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {/* Dimension scores */}
                  {currentRecord.confidence.dimensions.length > 0 && (
                    <div className="mb-4 grid grid-cols-5 gap-2">
                      {currentRecord.confidence.dimensions.map((dim) => (
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
                  )}

                  {/* Record editor */}
                  {templateType === "practice" && (
                    <PracticePagePrepEditor
                      record={currentRecord.record as TransformedPracticePage}
                      onChange={(updated) =>
                        handleRecordEdit(selectedIdx, updated)
                      }
                    />
                  )}
                  {templateType === "post" && (
                    <BlogPostPrepEditor
                      record={currentRecord.record as TransformedBlogPost}
                      onChange={(updated) =>
                        handleRecordEdit(selectedIdx, updated)
                      }
                    />
                  )}
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Select a record to review.
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext}>
          Continue to Validation
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTitle(
  rec: TransformedRecordWithConfidence,
  templateType: TemplateType,
): string {
  if (templateType === "practice") {
    return (rec.record as TransformedPracticePage).title ?? "Untitled";
  }
  return (rec.record as TransformedBlogPost).title ?? "Untitled";
}

function StatusBadge({
  status,
  compact,
}: {
  status: RecordReviewStatus;
  compact?: boolean;
}) {
  const config: Record<
    RecordReviewStatus,
    { label: string; className: string }
  > = {
    auto_approved: {
      label: "Auto",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    approved: {
      label: "OK",
      className: "bg-green-100 text-green-700 border-green-200",
    },
    needs_review: {
      label: "Review",
      className: "bg-yellow-100 text-yellow-700 border-yellow-200",
    },
    edited: {
      label: "Edited",
      className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    skipped: {
      label: "Skip",
      className: "bg-gray-100 text-gray-500 border-gray-200",
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <Badge
      variant="outline"
      className={cn("text-xs", c.className, compact && "px-1 py-0 text-[10px]")}
    >
      {c.label}
    </Badge>
  );
}

import { useState, useCallback, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  TemplateType,
  ParseResult,
  MappingConfig,
} from "@site/lib/importer/types";
import type {
  ImportRecipe,
  TransformedRecordWithConfidence,
  BatchProgress,
} from "@site/lib/importer/recipeTypes";
import { runRecipeEngine } from "@site/lib/importer/recipeEngine";

interface StepAutoTransformProps {
  templateType: TemplateType;
  parseResult: ParseResult;
  mappingConfig: MappingConfig;
  recipe: ImportRecipe;
  slugCollisionMode: import("@site/lib/importer/types").SlugCollisionMode;
  /** Site name for meta_title derivation */
  siteName?: string;
  onTransformComplete: (
    records: TransformedRecordWithConfidence[],
    exceptionIndices: number[],
  ) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepAutoTransform({
  templateType,
  parseResult,
  mappingConfig,
  recipe,
  slugCollisionMode,
  siteName,
  onTransformComplete,
  onNext,
  onBack,
}: StepAutoTransformProps) {
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [results, setResults] = useState<{
    autoApproved: number;
    needsReview: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const totalRecords = parseResult.records.length;

  const handleStartTransform = useCallback(async () => {
    setRunning(true);
    setError(null);
    setCompleted(false);
    abortRef.current = false;

    try {
      const output = await runRecipeEngine({
        sourceRecords: parseResult.records,
        mappingConfig,
        recipe,
        templateType,
        slugCollision: { mode: slugCollisionMode },
        siteName,
        onProgress: (p) => {
          if (!abortRef.current) setProgress(p);
        },
      });

      setResults({
        autoApproved: output.autoApprovedCount,
        needsReview: output.needsReviewCount,
        failed: output.failedCount,
      });

      setCompleted(true);
      onTransformComplete(output.records, output.exceptionIndices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transform failed");
    } finally {
      setRunning(false);
    }
  }, [parseResult, mappingConfig, recipe, templateType, slugCollisionMode, onTransformComplete]);

  const progressPercent =
    progress && progress.totalRecords > 0
      ? Math.round((progress.currentRecord / progress.totalRecords) * 100)
      : 0;

  const phaseLabels: Record<string, string> = {
    cleaning: "Cleaning source data...",
    mapping: "Mapping fields...",
    transforming: "Applying recipe rules...",
    scoring: "Scoring confidence...",
    complete: "Complete!",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auto-Transform</CardTitle>
          <p className="text-sm text-muted-foreground">
            Apply the recipe to all {totalRecords} records. Records above the
            confidence threshold ({(recipe.confidenceThreshold * 100).toFixed(0)}%)
            will be auto-approved.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Not started state */}
          {!running && !completed && (
            <div className="text-center py-8 space-y-4">
              <div className="text-4xl font-bold text-muted-foreground">
                {totalRecords}
              </div>
              <div className="text-sm text-muted-foreground">
                records ready for transformation
              </div>
              <Button size="lg" onClick={handleStartTransform}>
                <Play className="h-4 w-4 mr-2" />
                Start Auto-Transform
              </Button>
            </div>
          )}

          {/* Running state */}
          {running && progress && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>
                      {phaseLabels[progress.phase] ?? progress.phase}
                    </span>
                    <span className="text-muted-foreground">
                      {progress.currentRecord} of {progress.totalRecords}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
                <span className="text-sm font-medium w-12 text-right">
                  {progressPercent}%
                </span>
              </div>

              {/* Live counters */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                  label="Auto-approved"
                  value={progress.autoApproved}
                />
                <StatCard
                  icon={<AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  label="Needs Review"
                  value={progress.needsReview}
                />
                <StatCard
                  icon={<XCircle className="h-4 w-4 text-red-500" />}
                  label="Failed"
                  value={progress.failed}
                />
              </div>
            </div>
          )}

          {/* Completed state */}
          {completed && results && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Transform Complete</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All {totalRecords} records have been processed.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <ResultCard
                  color="green"
                  label="Auto-approved"
                  value={results.autoApproved}
                  total={totalRecords}
                />
                <ResultCard
                  color="yellow"
                  label="Need Review"
                  value={results.needsReview}
                  total={totalRecords}
                />
                <ResultCard
                  color="red"
                  label="Failed"
                  value={results.failed}
                  total={totalRecords}
                />
              </div>

              {results.needsReview > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {results.needsReview} record(s) scored below the{" "}
                  {(recipe.confidenceThreshold * 100).toFixed(0)}% confidence
                  threshold and need manual review.
                </p>
              )}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              <strong>Error:</strong> {error}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartTransform}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={running}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={!completed}
        >
          {results && results.needsReview > 0
            ? "Continue to Review"
            : "Continue to Validation"}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2">
      {icon}
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function ResultCard({
  color,
  label,
  value,
  total,
}: {
  color: "green" | "yellow" | "red";
  label: string;
  value: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  const colorClasses = {
    green: "bg-green-50 border-green-200 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
    red: "bg-red-50 border-red-200 text-red-700",
  };

  return (
    <div className={cn("rounded-md border p-4 text-center", colorClasses[color])}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs opacity-70">{percent}% of total</div>
    </div>
  );
}

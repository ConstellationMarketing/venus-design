import { useState, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  FlaskConical,
  Save,
  Loader2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import type {
  TemplateType,
  ParseResult,
  MappingConfig,
  TransformedRecord,
  TransformedPracticePage,
  TransformedBlogPost,
} from "@site/lib/importer/types";
import type { ImportRecipe, RecipeRule } from "@site/lib/importer/recipeTypes";
import { applyMapping } from "@site/lib/importer/fieldMapping";
import { cleanSingleRecord } from "@site/lib/importer/sourceCleaner";
import { prepareRecords } from "@site/lib/importer/preparer";
import { inferRecipe } from "@site/lib/importer/recipeInference";
import SourceRecordViewer from "./SourceRecordViewer";
import RecipeSummary from "./RecipeSummary";
import RecipeRuleEditor from "./RecipeRuleEditor";
import PracticePagePrepEditor from "./PracticePagePrepEditor";
import BlogPostPrepEditor from "./BlogPostPrepEditor";

interface StepTeachRecipeProps {
  templateType: TemplateType;
  parseResult: ParseResult;
  mappingConfig: MappingConfig;
  recipe: ImportRecipe | null;
  aiAvailable: boolean;
  /** Site name for meta_title derivation */
  siteName?: string;
  onRecipeChange: (recipe: ImportRecipe) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepTeachRecipe({
  templateType,
  parseResult,
  mappingConfig,
  recipe,
  aiAvailable,
  siteName,
  onRecipeChange,
  onNext,
  onBack,
}: StepTeachRecipeProps) {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [inferring, setInferring] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testIndex, setTestIndex] = useState<number | null>(null);
  const [editedOutput, setEditedOutput] = useState<TransformedRecord | null>(null);

  const sampleRecords = parseResult.records.slice(0, 5);
  const sourceColumns = parseResult.columns;

  // Clean and map the selected sample
  const { rawRecord, cleanedRecord, mappedRecord, autoPrepared } = useMemo(() => {
    const raw = sampleRecords[sampleIndex];
    if (!raw) return { rawRecord: {}, cleanedRecord: undefined, mappedRecord: {}, autoPrepared: null };

    const cleaned = cleanSingleRecord(raw, {
      filterOptions: {
        templateType,
        removeContactBlocks: templateType === "practice",
      },
    });
    const mapped = applyMapping(cleaned.data, mappingConfig);
    const prepared = prepareRecords([cleaned.data], mappingConfig, templateType, { siteName });
    const auto = prepared[0]?.autoPrepared ?? null;

    return { rawRecord: raw, cleanedRecord: cleaned, mappedRecord: mapped, autoPrepared: auto };
  }, [sampleIndex, sampleRecords, mappingConfig, templateType]);

  // Initialize edited output from auto-prepared
  const currentOutput = editedOutput ?? autoPrepared;

  const handleOutputChange = useCallback((updated: TransformedRecord) => {
    setEditedOutput(updated);
  }, []);

  // Generate recipe from example
  const handleGenerateRecipe = async () => {
    if (!currentOutput || !mappedRecord) return;

    setInferring(true);
    try {
      const result = await inferRecipe({
        mappedSample: mappedRecord,
        correctedOutput: currentOutput,
        sourceColumns,
        templateType,
        aiAvailable,
      });

      const newRecipe: ImportRecipe = {
        ...(recipe ?? {
          name: `Recipe for ${templateType}`,
          templateType,
          confidenceThreshold: 0.8,
          version: 1,
          isActive: true,
        }),
        rules: result.rules,
        sampleSourceRecords: [rawRecord],
        sampleOutputRecords: [currentOutput],
      };

      onRecipeChange(newRecipe);
    } catch (err) {
      console.error("Recipe inference failed:", err);
    } finally {
      setInferring(false);
    }
  };

  const handleRulesChange = (rules: RecipeRule[]) => {
    if (!recipe) return;
    onRecipeChange({ ...recipe, rules });
  };

  const handleSampleChange = (idx: string) => {
    const i = parseInt(idx);
    setSampleIndex(i);
    setEditedOutput(null); // Reset output for new sample
  };

  const hasRecipe = recipe && recipe.rules.length > 0;

  return (
    <div className="space-y-4">
      {/* Sample selector */}
      <div className="flex items-center gap-3">
        <Select value={String(sampleIndex)} onValueChange={handleSampleChange}>
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Select sample record" />
          </SelectTrigger>
          <SelectContent>
            {sampleRecords.map((rec, i) => {
              const title = String(
                rec["title"] ?? rec["post_title"] ?? rec["name"] ?? rec["Title"] ?? `Record ${i + 1}`,
              );
              return (
                <SelectItem key={i} value={String(i)}>
                  {title.length > 50 ? title.slice(0, 50) + "…" : title}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          onClick={handleGenerateRecipe}
          disabled={inferring || !currentOutput}
        >
          {inferring ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Generate Recipe from Example
        </Button>

        {hasRecipe && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const nextIdx = (sampleIndex + 1) % sampleRecords.length;
              setTestIndex(nextIdx);
              setSampleIndex(nextIdx);
              setEditedOutput(null);
            }}
          >
            <FlaskConical className="h-3.5 w-3.5 mr-1" />
            Test on Another
          </Button>
        )}
      </div>

      {/* Side-by-side panels */}
      <div className="grid grid-cols-2 gap-4 min-h-[500px]">
        {/* Left: Source viewer (read-only) */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm text-muted-foreground">
              Source Record (Read-only)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <SourceRecordViewer
              rawRecord={rawRecord}
              cleanedRecord={cleanedRecord}
              className="h-full"
            />
          </CardContent>
        </Card>

        {/* Right: Editable output */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-sm text-muted-foreground">
              Desired Output (Editable)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {currentOutput && templateType === "practice" && (
              <PracticePagePrepEditor
                record={currentOutput as TransformedPracticePage}
                onChange={(updated) => handleOutputChange(updated as TransformedRecord)}
                mappedRecord={mappedRecord}
              />
            )}
            {currentOutput && templateType === "post" && (
              <BlogPostPrepEditor
                record={currentOutput as TransformedBlogPost}
                onChange={(updated) => handleOutputChange(updated as TransformedRecord)}
              />
            )}
            {!currentOutput && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Loading sample record...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipe summary / editor */}
      {hasRecipe && !showAdvanced && (
        <RecipeSummary
          rules={recipe!.rules}
          onRulesChange={handleRulesChange}
          overallConfidence={
            recipe!.rules.filter((r) => r.inferredFrom === "diff").length /
            Math.max(recipe!.rules.length, 1)
          }
          ambiguousFields={[]}
          onAdvancedMode={() => setShowAdvanced(true)}
        />
      )}

      {hasRecipe && showAdvanced && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-1">
              <Settings2 className="h-4 w-4" />
              Advanced Rule Editor
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(false)}
            >
              Back to Summary
            </Button>
          </div>
          <RecipeRuleEditor
            rules={recipe!.rules}
            onRulesChange={handleRulesChange}
            sourceColumns={sourceColumns}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!hasRecipe}>
          Continue to Auto-Transform
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

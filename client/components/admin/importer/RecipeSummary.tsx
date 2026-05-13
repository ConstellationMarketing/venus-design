import { useState } from "react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Wand2, GitBranch, Brain, Pencil } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RecipeRule, RuleInferenceSource } from "@site/lib/importer/recipeTypes";

interface RecipeSummaryProps {
  rules: RecipeRule[];
  onRulesChange: (rules: RecipeRule[]) => void;
  overallConfidence: number;
  ambiguousFields: string[];
  onAdvancedMode?: () => void;
  className?: string;
}

const SOURCE_LABELS: Record<RuleInferenceSource, { label: string; color: string; icon: typeof Wand2 }> = {
  diff: { label: "Diff", color: "bg-green-100 text-green-700 border-green-200", icon: GitBranch },
  pattern: { label: "Pattern", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Wand2 },
  ai: { label: "AI", color: "bg-purple-100 text-purple-700 border-purple-200", icon: Brain },
  manual: { label: "Manual", color: "bg-gray-100 text-gray-700 border-gray-200", icon: Pencil },
};

const RULE_TYPE_LABELS: Record<string, string> = {
  direct_map: "Direct Copy",
  static_value: "Static Value",
  html_clean: "Clean HTML",
  html_extract: "Extract HTML",
  h2_split: "H2 Split → Sections",
  faq_extract: "Extract FAQ",
  hero_extract: "Extract Hero",
  slugify: "Generate Slug",
  ai_transform: "AI Transform",
  concat: "Concatenate",
  regex_replace: "Regex Replace",
  ignore: "Ignore",
};

export default function RecipeSummary({
  rules,
  onRulesChange,
  overallConfidence,
  ambiguousFields,
  onAdvancedMode,
  className,
}: RecipeSummaryProps) {
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const toggleRule = (ruleId: string, enabled: boolean) => {
    const updated = rules.map((r) =>
      r.id === ruleId ? { ...r, enabled } : r,
    );
    onRulesChange(updated);
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Recipe: {enabledCount} of {rules.length} rules active
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Inference confidence:{" "}
            <span
              className={cn(
                "font-medium",
                overallConfidence >= 0.8
                  ? "text-green-600"
                  : overallConfidence >= 0.5
                    ? "text-yellow-600"
                    : "text-red-600",
              )}
            >
              {(overallConfidence * 100).toFixed(0)}%
            </span>
          </p>
        </div>
        {onAdvancedMode && (
          <Button variant="outline" size="sm" onClick={onAdvancedMode}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Advanced
          </Button>
        )}
      </div>

      {/* Ambiguous fields warning */}
      {ambiguousFields.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
          <span className="font-medium">{ambiguousFields.length} field(s)</span>{" "}
          could not be auto-inferred:{" "}
          <span className="font-mono text-xs">
            {ambiguousFields.join(", ")}
          </span>
        </div>
      )}

      {/* Rules list */}
      <div className="space-y-1">
        {rules.map((rule) => {
          const source = rule.inferredFrom
            ? SOURCE_LABELS[rule.inferredFrom]
            : SOURCE_LABELS.manual;
          const SourceIcon = source.icon;
          const isExpanded = expandedRule === rule.id;

          return (
            <Collapsible
              key={rule.id}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedRule(open ? rule.id : null)
              }
            >
              <div
                className={cn(
                  "border rounded-md transition-colors",
                  rule.enabled ? "bg-card" : "bg-muted/50 opacity-60",
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2">
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={(checked) =>
                      toggleRule(rule.id, checked)
                    }
                    className="scale-75"
                  />

                  <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0 text-left">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium truncate">
                      {rule.targetField}
                    </span>
                  </CollapsibleTrigger>

                  <Badge
                    variant="outline"
                    className={cn("text-xs shrink-0", source.color)}
                  >
                    <SourceIcon className="h-3 w-3 mr-1" />
                    {source.label}
                  </Badge>

                  <Badge variant="secondary" className="text-xs shrink-0">
                    {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                  </Badge>
                </div>

                <CollapsibleContent>
                  <div className="px-3 pb-2 pt-0 border-t mx-3 mt-1 space-y-1.5">
                    {rule.description && (
                      <p className="text-xs text-muted-foreground pt-1.5">
                        {rule.description}
                      </p>
                    )}
                    <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1 overflow-auto max-h-[100px]">
                      {JSON.stringify(rule.config, null, 2)}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No rules inferred yet. Correct the sample output and click
          &quot;Generate Recipe from Example&quot;.
        </div>
      )}
    </div>
  );
}

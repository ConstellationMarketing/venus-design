import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { RecipeRule, RecipeRuleType } from "@site/lib/importer/recipeTypes";

interface RecipeRuleEditorProps {
  rules: RecipeRule[];
  onRulesChange: (rules: RecipeRule[]) => void;
  sourceColumns: string[];
  className?: string;
}

const RULE_TYPES: Array<{ value: RecipeRuleType; label: string; description: string }> = [
  { value: "direct_map", label: "Direct Copy", description: "Copy a field value as-is" },
  { value: "static_value", label: "Static Value", description: "Set a hardcoded value" },
  { value: "html_clean", label: "Clean HTML", description: "Strip styles, classes, empty tags" },
  { value: "html_extract", label: "Extract HTML", description: "Extract content via regex pattern" },
  { value: "h2_split", label: "H2 Split", description: "Split body on H2 headings into sections" },
  { value: "faq_extract", label: "Extract FAQ", description: "Extract FAQ Q&A from content" },
  { value: "hero_extract", label: "Extract Hero", description: "Extract hero image & description" },
  { value: "slugify", label: "Slugify", description: "Generate URL slug from text" },
  { value: "concat", label: "Concatenate", description: "Combine multiple fields" },
  { value: "regex_replace", label: "Regex Replace", description: "Find/replace with regex" },
  { value: "ai_transform", label: "AI Transform", description: "AI-powered transformation" },
  { value: "ignore", label: "Ignore", description: "Skip this field entirely" },
];

export default function RecipeRuleEditor({
  rules,
  onRulesChange,
  sourceColumns,
  className,
}: RecipeRuleEditorProps) {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(
    rules[0]?.id ?? null,
  );

  const selectedRule = rules.find((r) => r.id === selectedRuleId);

  const updateRule = (ruleId: string, updates: Partial<RecipeRule>) => {
    const updated = rules.map((r) =>
      r.id === ruleId ? { ...r, ...updates } : r,
    );
    onRulesChange(updated);
  };

  const updateConfig = (ruleId: string, key: string, value: unknown) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    updateRule(ruleId, {
      config: { ...rule.config, [key]: value },
    });
  };

  const addRule = () => {
    const newRule: RecipeRule = {
      id: `rule_${Date.now()}`,
      targetField: "",
      ruleType: "direct_map",
      config: {},
      enabled: true,
      inferredFrom: "manual",
      description: "New rule",
    };
    onRulesChange([...rules, newRule]);
    setSelectedRuleId(newRule.id);
  };

  const removeRule = (ruleId: string) => {
    const updated = rules.filter((r) => r.id !== ruleId);
    onRulesChange(updated);
    if (selectedRuleId === ruleId) {
      setSelectedRuleId(updated[0]?.id ?? null);
    }
  };

  return (
    <div className={cn("grid grid-cols-[280px_1fr] gap-4 h-[500px]", className)}>
      {/* Rule list */}
      <Card className="flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Rules ({rules.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-0.5 p-3 pt-0">
              {rules.map((rule) => (
                <button
                  key={rule.id}
                  onClick={() => setSelectedRuleId(rule.id)}
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1",
                    selectedRuleId === rule.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                    !rule.enabled && "opacity-50",
                  )}
                >
                  <GripVertical className="h-3 w-3 shrink-0 opacity-40" />
                  <span className="truncate flex-1">
                    {rule.targetField || "Untitled"}
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Rule config panel */}
      <Card>
        {selectedRule ? (
          <>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">
                  Edit Rule: {selectedRule.targetField || "Untitled"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(selectedRule.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px]">
                <div className="space-y-4 pr-3">
                  {/* Target field */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Target Field</Label>
                    <Input
                      value={selectedRule.targetField}
                      onChange={(e) =>
                        updateRule(selectedRule.id, {
                          targetField: e.target.value,
                        })
                      }
                      placeholder="e.g. hero.tagline"
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Rule type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Rule Type</Label>
                    <Select
                      value={selectedRule.ruleType}
                      onValueChange={(val) =>
                        updateRule(selectedRule.id, {
                          ruleType: val as RecipeRuleType,
                          config: {},
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RULE_TYPES.map((rt) => (
                          <SelectItem key={rt.value} value={rt.value}>
                            <div>
                              <div>{rt.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {rt.description}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rule-type-specific config */}
                  <RuleConfigFields
                    rule={selectedRule}
                    sourceColumns={sourceColumns}
                    onConfigChange={(key, value) =>
                      updateConfig(selectedRule.id, key, value)
                    }
                  />

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={selectedRule.description ?? ""}
                      onChange={(e) =>
                        updateRule(selectedRule.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Human-readable description"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </>
        ) : (
          <CardContent className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a rule to edit, or add a new one.
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rule-type-specific config fields
// ---------------------------------------------------------------------------

function RuleConfigFields({
  rule,
  sourceColumns,
  onConfigChange,
}: {
  rule: RecipeRule;
  sourceColumns: string[];
  onConfigChange: (key: string, value: unknown) => void;
}) {
  switch (rule.ruleType) {
    case "direct_map":
    case "html_clean":
    case "slugify":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Source Field</Label>
          <Select
            value={(rule.config.sourceField as string) ?? ""}
            onValueChange={(val) => onConfigChange("sourceField", val)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select source field" />
            </SelectTrigger>
            <SelectContent>
              {sourceColumns.map((col) => (
                <SelectItem key={col} value={col}>
                  {col}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case "static_value":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Value</Label>
          <Input
            value={String(rule.config.value ?? "")}
            onChange={(e) => onConfigChange("value", e.target.value)}
            placeholder="Static value"
            className="h-8 text-sm"
          />
        </div>
      );

    case "regex_replace":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Source Field</Label>
            <Input
              value={String(rule.config.sourceField ?? "")}
              onChange={(e) => onConfigChange("sourceField", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pattern (regex)</Label>
            <Input
              value={String(rule.config.pattern ?? "")}
              onChange={(e) => onConfigChange("pattern", e.target.value)}
              placeholder="e.g. \\[shortcode\\]"
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Replacement</Label>
            <Input
              value={String(rule.config.replacement ?? "")}
              onChange={(e) => onConfigChange("replacement", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      );

    case "concat":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Fields (comma-separated)</Label>
            <Input
              value={
                Array.isArray(rule.config.fields)
                  ? (rule.config.fields as string[]).join(", ")
                  : ""
              }
              onChange={(e) =>
                onConfigChange(
                  "fields",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              placeholder="e.g. title, slug"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Template (optional)</Label>
            <Input
              value={String(rule.config.template ?? "")}
              onChange={(e) => onConfigChange("template", e.target.value)}
              placeholder='e.g. {{title}} | My Site'
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Separator</Label>
            <Input
              value={String(rule.config.separator ?? " ")}
              onChange={(e) => onConfigChange("separator", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
      );

    case "h2_split":
    case "faq_extract":
    case "hero_extract":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Source Field (body content)</Label>
          <Input
            value={String(rule.config.sourceField ?? "body")}
            onChange={(e) => onConfigChange("sourceField", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      );

    case "html_extract":
      return (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Source Field</Label>
            <Input
              value={String(rule.config.sourceField ?? "body")}
              onChange={(e) => onConfigChange("sourceField", e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pattern (regex)</Label>
            <Input
              value={String(rule.config.pattern ?? "")}
              onChange={(e) => onConfigChange("pattern", e.target.value)}
              placeholder="e.g. <h2>.*?</h2>"
              className="h-8 text-sm font-mono"
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs">Config (JSON)</Label>
          <Textarea
            value={JSON.stringify(rule.config, null, 2)}
            onChange={(e) => {
              try {
                onConfigChange("__replace__", JSON.parse(e.target.value));
              } catch {
                // Invalid JSON — ignore
              }
            }}
            className="text-xs font-mono h-24"
          />
        </div>
      );
  }
}

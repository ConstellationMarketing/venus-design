import { useState, useEffect, useMemo } from "react";
import { Wand2, ArrowRight, ArrowLeft, RefreshCw } from "lucide-react";
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
import type {
  TemplateType,
  ParseResult,
  MappingConfig,
  FieldMappingEntry,
} from "@site/lib/importer/types";
import { getMappableFields } from "@site/lib/importer/templateFields";
import { autoMapFields } from "@site/lib/importer/autoMapper";

interface StepFieldDetectionProps {
  templateType: TemplateType;
  parseResult: ParseResult;
  mappingConfig: MappingConfig | null;
  onMappingChange: (config: MappingConfig) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepFieldDetection({
  templateType,
  parseResult,
  mappingConfig,
  onMappingChange,
  onNext,
  onBack,
}: StepFieldDetectionProps) {
  const sourceColumns = parseResult.columns;
  const sampleRecords = parseResult.records.slice(0, 3);

  const mappableFields = useMemo(
    () => getMappableFields(templateType),
    [templateType],
  );

  // Auto-detect on mount
  useEffect(() => {
    if (!mappingConfig) {
      const auto = autoMapFields(sourceColumns, templateType);
      onMappingChange(auto);
    }
  }, []);

  const mappings = mappingConfig?.mappings ?? [];
  const mappedCount = mappings.length;
  const unmappedColumns = sourceColumns.filter(
    (col) => !mappings.some((m) => m.sourceColumn === col),
  );

  const handleMappingChange = (
    sourceColumn: string,
    targetField: string | null,
  ) => {
    const currentMappings = [...mappings];
    // Remove existing mapping for this source column
    const filtered = currentMappings.filter(
      (m) => m.sourceColumn !== sourceColumn,
    );
    // Remove existing mapping for target field (if remapping)
    const cleaned = filtered.filter(
      (m) => m.targetField !== targetField,
    );
    if (targetField) {
      cleaned.push({
        targetField,
        sourceColumn,
        transform: "none",
      });
    }
    onMappingChange({ ...mappingConfig, mappings: cleaned });
  };

  const handleReAutoDetect = () => {
    const auto = autoMapFields(sourceColumns, templateType);
    onMappingChange(auto);
  };

  const getSampleValue = (column: string, recordIdx: number): string => {
    const val = sampleRecords[recordIdx]?.[column];
    if (val === null || val === undefined) return "";
    const str = String(val);
    return str.length > 80 ? str.slice(0, 80) + "…" : str;
  };

  const getTargetForColumn = (sourceColumn: string): string | null => {
    const mapping = mappings.find((m) => m.sourceColumn === sourceColumn);
    return mapping?.targetField ?? null;
  };

  // Group fields by target usage
  const usedTargets = new Set(mappings.map((m) => m.targetField));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Field Detection</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {mappedCount} of {sourceColumns.length} columns mapped to template
              fields. Review and adjust as needed.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleReAutoDetect}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Re-detect
          </Button>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium w-[200px]">
                    Source Column
                  </th>
                  <th className="text-left px-3 py-2 font-medium w-[200px]">
                    Detected As
                  </th>
                  {sampleRecords.map((_, i) => (
                    <th
                      key={i}
                      className="text-left px-3 py-2 font-medium text-muted-foreground"
                    >
                      Sample {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourceColumns.map((col) => {
                  const target = getTargetForColumn(col);
                  const fieldDef = target
                    ? mappableFields.find((f) => f.key === target)
                    : null;

                  return (
                    <tr key={col} className="border-b last:border-b-0">
                      <td className="px-3 py-2 font-mono text-xs">
                        {col}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={target ?? "__unmapped__"}
                          onValueChange={(val) =>
                            handleMappingChange(
                              col,
                              val === "__unmapped__" ? null : val,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__unmapped__">
                              <span className="text-muted-foreground">
                                — Unmapped —
                              </span>
                            </SelectItem>
                            {mappableFields.map((field) => (
                              <SelectItem
                                key={field.key}
                                value={field.key}
                                disabled={
                                  usedTargets.has(field.key) &&
                                  target !== field.key
                                }
                              >
                                <span className="flex items-center gap-1">
                                  {field.label}
                                  {field.required && (
                                    <span className="text-red-500">*</span>
                                  )}
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({field.group})
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      {sampleRecords.map((_, i) => (
                        <td
                          key={i}
                          className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate"
                        >
                          {getSampleValue(col, i)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Unmapped columns info */}
      {unmappedColumns.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">{unmappedColumns.length} unmapped column(s):</span>{" "}
          {unmappedColumns.join(", ")}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onNext} disabled={mappedCount === 0}>
          Continue to Build Recipe
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}

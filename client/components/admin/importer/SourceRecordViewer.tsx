import { useState, useMemo } from "react";
import { Eye, Code, Image, List, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { SourceRecord } from "@site/lib/importer/types";
import type { CleanedRecord } from "@site/lib/importer/recipeTypes";

interface SourceRecordViewerProps {
  rawRecord: SourceRecord;
  cleanedRecord?: CleanedRecord;
  className?: string;
}

export default function SourceRecordViewer({
  rawRecord,
  cleanedRecord,
  className,
}: SourceRecordViewerProps) {
  const [viewMode, setViewMode] = useState<"clean" | "raw">("clean");
  const [allFieldsOpen, setAllFieldsOpen] = useState(false);

  const activeRecord = viewMode === "clean" && cleanedRecord
    ? cleanedRecord.data
    : rawRecord;

  const title = String(
    activeRecord["title"] ??
    activeRecord["post_title"] ??
    activeRecord["name"] ??
    activeRecord["Title"] ??
    "Untitled",
  );

  const bodyField = useMemo(() => {
    const bodyKeys = ["body", "content", "post_content", "html", "markdown", "Body", "Content"];
    for (const key of bodyKeys) {
      if (activeRecord[key] && typeof activeRecord[key] === "string") {
        return { key, value: String(activeRecord[key]) };
      }
    }
    return null;
  }, [activeRecord]);

  const headings = useMemo(() => {
    if (!bodyField) return [];
    const regex = /<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi;
    const results: Array<{ level: number; text: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(bodyField.value)) !== null) {
      results.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }
    return results;
  }, [bodyField]);

  const images = useMemo(() => {
    if (!bodyField) return [];
    const regex = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*?)["'])?/gi;
    const results: Array<{ src: string; alt: string }> = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(bodyField.value)) !== null) {
      results.push({ src: match[1], alt: match[2] ?? "" });
    }
    return results;
  }, [bodyField]);

  const metaFields = useMemo(() => {
    const exclude = new Set([
      bodyField?.key,
      "title", "post_title", "name", "Title",
    ].filter(Boolean) as string[]);

    return Object.entries(activeRecord)
      .filter(([key]) => !exclude.has(key))
      .filter(([, val]) => val !== null && val !== undefined && String(val).trim() !== "")
      .slice(0, 20);
  }, [activeRecord, bodyField]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* View mode toggle */}
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={viewMode === "clean" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("clean")}
          disabled={!cleanedRecord}
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Clean
        </Button>
        <Button
          variant={viewMode === "raw" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("raw")}
        >
          <Code className="h-3.5 w-3.5 mr-1" />
          Raw
        </Button>
        {cleanedRecord && (
          <Badge variant="secondary" className="text-xs">
            {cleanedRecord.cleaningLog.length > 0
              ? `${cleanedRecord.cleaningLog.length} cleaning actions`
              : "No cleaning needed"}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-3">
          {/* Title */}
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
          </div>

          {/* Metadata summary */}
          {metaFields.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Metadata
              </h4>
              <div className="grid grid-cols-1 gap-1">
                {metaFields.slice(0, 5).map(([key, val]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground font-mono text-xs shrink-0 w-32 truncate">
                      {key}
                    </span>
                    <span className="truncate">{String(val).slice(0, 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Headings outline */}
          {headings.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <List className="h-3 w-3" />
                Headings ({headings.length})
              </h4>
              <div className="space-y-0.5 border-l-2 border-border pl-3">
                {headings.map((h, i) => (
                  <div
                    key={i}
                    className="text-sm"
                    style={{ paddingLeft: `${(h.level - 1) * 12}px` }}
                  >
                    <span className="text-muted-foreground text-xs mr-1">
                      H{h.level}
                    </span>
                    {h.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Body preview */}
          {bodyField && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Body ({bodyField.key})
              </h4>
              <div className="border rounded-md p-3 bg-muted/30 max-h-[300px] overflow-auto">
                <div
                  className="prose prose-sm max-w-none text-sm"
                  dangerouslySetInnerHTML={{
                    __html: bodyField.value.slice(0, 5000),
                  }}
                />
              </div>
            </div>
          )}

          {/* Images */}
          {images.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Image className="h-3 w-3" />
                Images ({images.length})
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {images.slice(0, 6).map((img, i) => (
                  <div
                    key={i}
                    className="border rounded-md overflow-hidden bg-muted/30"
                  >
                    <img
                      src={img.src}
                      alt={img.alt}
                      className="w-full h-16 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="p-1 text-xs text-muted-foreground truncate">
                      {img.alt || img.src.split("/").pop()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning log */}
          {cleanedRecord && cleanedRecord.cleaningLog.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Cleaning Log
              </h4>
              <div className="border rounded-md p-2 bg-amber-50 dark:bg-amber-950/20 space-y-1">
                {cleanedRecord.cleaningLog.map((entry, i) => (
                  <div key={i} className="text-xs text-muted-foreground">
                    <span className="font-mono">{typeof entry === "string" ? entry : JSON.stringify(entry)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cleanedRecord && cleanedRecord.cleaningLog.length === 0 && (
            <div className="text-xs text-muted-foreground italic">
              No cleaning needed — source is already clean
            </div>
          )}

          {/* All source fields (collapsible) */}
          <Collapsible open={allFieldsOpen} onOpenChange={setAllFieldsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-full">
              {allFieldsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              All Source Fields ({Object.keys(activeRecord).length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-2 py-1 font-medium">Field</th>
                      <th className="text-left px-2 py-1 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(activeRecord).map(([key, val]) => (
                      <tr key={key} className="border-b last:border-b-0">
                        <td className="px-2 py-1 font-mono text-muted-foreground align-top whitespace-nowrap">
                          {key}
                        </td>
                        <td className="px-2 py-1 break-all max-w-[300px]">
                          {typeof val === "object"
                            ? JSON.stringify(val).slice(0, 200)
                            : String(val ?? "").slice(0, 200)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}

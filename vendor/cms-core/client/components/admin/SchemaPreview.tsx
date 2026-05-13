import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Code } from "lucide-react";
import {
  buildAllSchemas,
  parseSchemaTypes,
  extractFaqItems,
  type SchemaInput,
} from "@site/lib/schemaHelpers";
import type { Page } from "@/lib/database.types";

interface SchemaPreviewProps {
  schemaType: string | null;
  schemaData: Record<string, unknown> | null;
  page: Page;
}

export default function SchemaPreview({
  schemaType,
  schemaData,
  page,
}: SchemaPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  const schemas = useMemo(() => {
    const siteUrl = import.meta.env.VITE_SITE_URL || "";
    const pageUrl = siteUrl
      ? `${siteUrl}${page.url_path}`
      : `https://example.com${page.url_path}`;

    const input: SchemaInput = {
      title: page.meta_title || page.title,
      description: page.meta_description || "",
      url: pageUrl,
      image: page.og_image || undefined,
      schemaType,
      schemaData,
      pageContent: page.content,
    };

    return buildAllSchemas(input);
  }, [schemaType, schemaData, page]);

  if (!schemas.length) return null;

  const types = parseSchemaTypes(schemaType);
  // Auto-FAQ: FAQPage was injected automatically (not in explicit schema_type list)
  const autoFaq =
    !types.includes("FAQPage") &&
    extractFaqItems(page.content).length > 0;
  const previewJson = JSON.stringify(schemas, null, 2);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Auto-generated Preview
          </span>
          {types.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
          {autoFaq && (
            <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100 border-0">
              FAQPage (auto)
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Show
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <pre className="bg-gray-50 border rounded-lg p-4 text-xs font-mono overflow-x-auto max-h-96 overflow-y-auto whitespace-pre-wrap">
          {previewJson}
        </pre>
      )}

      <p className="text-xs text-gray-400">
        This JSON-LD will be injected into the page{" "}
        <code>&lt;head&gt;</code> when the page is viewed. Custom overrides
        above are merged on top.
      </p>
    </div>
  );
}

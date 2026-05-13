import { useState } from "react";
import { Eye, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface HtmlFieldEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Minimum rows for the textarea */
  rows?: number;
  /** Optional help text below the field */
  helpText?: string;
  /** Optional className for the wrapper */
  className?: string;
}

export default function HtmlFieldEditor({
  label,
  value,
  onChange,
  rows = 6,
  helpText,
  className,
}: HtmlFieldEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setPreviewMode(!previewMode)}
        >
          {previewMode ? (
            <>
              <Code className="h-3.5 w-3.5" />
              Edit HTML
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </>
          )}
        </Button>
      </div>

      {previewMode ? (
        <div
          className="rounded-md border bg-background p-3 prose prose-sm max-w-none min-h-[80px] overflow-auto"
          style={{ minHeight: `${rows * 1.5}rem` }}
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-muted-foreground italic'>No content</p>" }}
        />
      ) : (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="font-mono text-xs"
          placeholder="<p>Enter HTML content...</p>"
        />
      )}

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}

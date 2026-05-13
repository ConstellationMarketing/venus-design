import { useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import type { TransformedBlogPost } from "@site/lib/importer/types";
import {
  formatDateTimeLocalValue,
  parseDateTimeLocalValue,
} from "@site/components/admin/editors/EditorShared";
import HtmlFieldEditor from "./HtmlFieldEditor";

interface BlogPostPrepEditorProps {
  record: TransformedBlogPost;
  onChange: (updated: TransformedBlogPost) => void;
}

export default function BlogPostPrepEditor({
  record,
  onChange,
}: BlogPostPrepEditorProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({
    seo: true,
  });

  const toggleSection = useCallback((key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateField = useCallback(
    (field: keyof TransformedBlogPost, value: unknown) => {
      onChange({
        ...record,
        [field]: value,
        ...(field === "published_at"
          ? {
              publish_date_source: value ? "mapped" : record.publish_date_source,
            }
          : {}),
      });
    },
    [record, onChange],
  );

  return (
    <div className="space-y-3">
      {/* Basic Info */}
      <CollapsibleSection
        title="Basic Info"
        isCollapsed={collapsed["basic"]}
        onToggle={() => toggleSection("basic")}
      >
        <div className="space-y-3">
          <FieldRow label="Title" required>
            <Input
              value={record.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Post title"
            />
          </FieldRow>
          <FieldRow label="Slug" required>
            <Input
              value={record.slug}
              onChange={(e) => updateField("slug", e.target.value)}
              placeholder="my-blog-post"
              className="font-mono text-sm"
            />
          </FieldRow>
          <FieldRow label="Excerpt">
            <Textarea
              value={record.excerpt ?? ""}
              onChange={(e) => updateField("excerpt", e.target.value)}
              placeholder="Short summary of the post"
              rows={2}
            />
          </FieldRow>
          <FieldRow label="Category">
            <Input
              value={record.category ?? ""}
              onChange={(e) => updateField("category", e.target.value)}
              placeholder="Category name (reuses existing matches)"
            />
            <p className="text-xs text-muted-foreground">
              Existing categories are reused when possible. A new one is only created when no safe match exists.
            </p>
          </FieldRow>
          <FieldRow label="Featured Image">
            <div className="flex gap-2">
              <Input
                value={record.featured_image ?? ""}
                onChange={(e) => updateField("featured_image", e.target.value)}
                placeholder="https://..."
                className="flex-1"
              />
              {record.featured_image && (
                <ImageThumbnail src={record.featured_image} />
              )}
            </div>
          </FieldRow>
          <FieldRow label="Publish Date">
            <Input
              type="datetime-local"
              value={formatDateTimeLocalValue(record.published_at ?? null)}
              onChange={(e) => updateField("published_at", parseDateTimeLocalValue(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              {record.publish_date_source === "fallback"
                ? "Using the import-time fallback because no source publish date was mapped."
                : "Uses the mapped source publish date when available."}
            </p>
          </FieldRow>
        </div>
      </CollapsibleSection>

      {/* Body */}
      <CollapsibleSection
        title="Body"
        isCollapsed={collapsed["body"]}
        onToggle={() => toggleSection("body")}
      >
        <HtmlFieldEditor
          label="Body Content"
          value={record.body ?? ""}
          onChange={(val) => updateField("body", val)}
          rows={10}
        />
      </CollapsibleSection>

      {/* SEO */}
      <CollapsibleSection
        title="SEO"
        isCollapsed={collapsed["seo"]}
        onToggle={() => toggleSection("seo")}
      >
        <div className="space-y-3">
          <FieldRow label="Meta Title">
            <Input
              value={record.meta_title ?? ""}
              onChange={(e) => updateField("meta_title", e.target.value)}
              placeholder="SEO title"
            />
          </FieldRow>
          <FieldRow label="Meta Description">
            <Textarea
              value={record.meta_description ?? ""}
              onChange={(e) => updateField("meta_description", e.target.value)}
              placeholder="SEO description"
              rows={2}
            />
          </FieldRow>
          <FieldRow label="Canonical URL">
            <Input
              value={record.canonical_url ?? ""}
              onChange={(e) => updateField("canonical_url", e.target.value || null)}
              placeholder="https://..."
            />
          </FieldRow>
          <FieldRow label="OG Title">
            <Input
              value={record.og_title ?? ""}
              onChange={(e) => updateField("og_title", e.target.value || null)}
              placeholder="Social sharing title"
            />
          </FieldRow>
          <FieldRow label="OG Description">
            <Textarea
              value={record.og_description ?? ""}
              onChange={(e) => updateField("og_description", e.target.value || null)}
              placeholder="Social sharing description"
              rows={2}
            />
          </FieldRow>
          <FieldRow label="OG Image">
            <div className="flex gap-2">
              <Input
                value={record.og_image ?? ""}
                onChange={(e) => updateField("og_image", e.target.value || null)}
                placeholder="https://..."
                className="flex-1"
              />
              {record.og_image && <ImageThumbnail src={record.og_image} />}
            </div>
          </FieldRow>
          <div className="flex items-center gap-3">
            <Label className="text-sm">Noindex</Label>
            <Switch
              checked={record.noindex === true}
              onCheckedChange={(val) => updateField("noindex", val)}
            />
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Sub-Components
// ---------------------------------------------------------------------------

function CollapsibleSection({
  title,
  isCollapsed,
  onToggle,
  children,
}: {
  title: string;
  isCollapsed?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-medium">{title}</span>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {!isCollapsed && <CardContent className="pt-0 pb-4">{children}</CardContent>}
    </Card>
  );
}

function FieldRow({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function ImageThumbnail({ src }: { src: string }) {
  return (
    <div className="w-10 h-10 rounded border overflow-hidden shrink-0 bg-muted">
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

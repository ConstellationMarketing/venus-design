import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Plus, Trash2, GripVertical } from "lucide-react";
import ImageUploader from "@/components/admin/ImageUploader";
import type { SelectedImageAsset } from "@/components/admin/imageMetadata";
import RichTextEditor from "@site/components/admin/RichTextEditor";

/* ------------------------------------------------------------------ */
/*  Section                                                            */
/* ------------------------------------------------------------------ */
export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50">
            <CardTitle className="flex items-center justify-between text-lg">
              {title}
              <ChevronDown
                className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/* ------------------------------------------------------------------ */
/*  ArrayEditor                                                        */
/* ------------------------------------------------------------------ */
export function ArrayEditor<T extends object>({
  items,
  onChange,
  renderItem,
  newItem,
  itemLabel = "Item",
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, index: number, update: (item: T) => void) => React.ReactNode;
  newItem: () => T;
  itemLabel?: string;
}) {
  const addItem = () => onChange([...items, newItem()]);
  const removeItem = (index: number) => onChange(items.filter((_, i) => i !== index));
  const updateItem = (index: number, item: T) => {
    const next = [...items];
    next[index] = item;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="relative border rounded-lg p-4 bg-gray-50">
          <div className="absolute top-2 right-2 flex gap-2">
            <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="text-sm font-medium text-gray-500 mb-3">{itemLabel} {index + 1}</div>
          {renderItem(item, index, (updated) => updateItem(index, updated))}
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add {itemLabel}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ImageField – wraps ImageUploader with a label                      */
/* ------------------------------------------------------------------ */
export function ImageField({
  label,
  value,
  onChange,
  altValue,
  onAltChange,
  onSelectAsset,
  folder = "uploads",
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  altValue?: string;
  onAltChange?: (altText: string) => void;
  onSelectAsset?: (asset: SelectedImageAsset) => void;
  folder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <ImageUploader
        value={value}
        onChange={onChange}
        onSelectAsset={(asset) => {
          if (onSelectAsset) {
            onSelectAsset(asset);
            return;
          }

          if (!onAltChange) {
            return;
          }

          if (asset.suggestedAltText && asset.suggestedAltText !== altValue) {
            onAltChange(asset.suggestedAltText);
          }
        }}
        folder={folder}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  GlobalSectionInfo – non-editable note for shared sections          */
/* ------------------------------------------------------------------ */
export function GlobalSectionInfo({
  sectionTitle,
  managedIn = "About Us",
}: {
  sectionTitle: string;
  managedIn?: string;
}) {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="text-lg">{sectionTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-blue-700">
          This section is shared across multiple pages and is managed globally on
          the <span className="font-semibold">{managedIn}</span> page editor.
          Any changes made there will automatically apply everywhere this section
          appears.
        </p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  RichTextField – wraps RichTextEditor with a label                  */
/* ------------------------------------------------------------------ */
export function RichTextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  HeadingField – text input with heading-level dropdown              */
/* ------------------------------------------------------------------ */
const HEADING_OPTIONS = [
  { value: "h1", label: "H1" },
  { value: "h2", label: "H2" },
  { value: "h3", label: "H3" },
  { value: "h4", label: "H4" },
  { value: "h5", label: "H5" },
  { value: "h6", label: "H6" },
];

export function HeadingField({
  label,
  value,
  onChange,
  tag = "h2",
  onTagChange,
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  /** Current HTML heading tag (e.g. "h2"). Defaults to "h2". */
  tag?: string;
  /** Called when the admin picks a different heading level. */
  onTagChange: (tag: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <select
          value={tag}
          onChange={(e) => onTagChange(e.target.value)}
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          title="Heading level (SEO)"
        >
          {HEADING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-gray-400">Tag level affects SEO only — visual style stays the same.</p>
    </div>
  );
}

export function formatDateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const timezoneOffsetMs = parsed.getTimezoneOffset() * 60_000;
  return new Date(parsed.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}

export function parseDateTimeLocalValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function PublishDateTimeField({
  id,
  value,
  onChange,
  helperText,
}: {
  id: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  helperText: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Publish date</Label>
      <Input
        id={id}
        type="datetime-local"
        value={formatDateTimeLocalValue(value)}
        onChange={(event) => onChange(parseDateTimeLocalValue(event.target.value))}
      />
      <p className="text-sm text-gray-500">{helperText}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Re-export commonly used primitives so editors only need one import */
/* ------------------------------------------------------------------ */
export { Input, Label, Textarea, RichTextEditor };

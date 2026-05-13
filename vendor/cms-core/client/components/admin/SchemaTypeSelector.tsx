import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const SCHEMA_OPTIONS = [
  { value: "LocalBusiness", label: "Local Business" },
  { value: "Attorney", label: "Attorney" },
  { value: "LegalService", label: "Legal Service" },
  { value: "WebPage", label: "Web Page" },
  { value: "AboutPage", label: "About Page" },
  { value: "ContactPage", label: "Contact Page" },
  { value: "FAQPage", label: "FAQ Page" },
] as const;

interface SchemaTypeSelectorProps {
  /** Comma-separated string of selected types (stored in DB) */
  value: string;
  onChange: (value: string) => void;
}

/**
 * Parse the stored comma-separated string into an array of selected types.
 */
function parseSelected(raw: string): string[] {
  if (!raw) return [];

  // Handle JSON array strings
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // fall through
    }
  }

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function SchemaTypeSelector({
  value,
  onChange,
}: SchemaTypeSelectorProps) {
  const selected = parseSelected(value);

  const toggle = (type: string) => {
    const next = selected.includes(type)
      ? selected.filter((t) => t !== type)
      : [...selected, type];

    onChange(next.length > 0 ? next.join(",") : "");
  };

  return (
    <div className="space-y-2">
      <Label>Schema Types</Label>
      <div className="grid grid-cols-2 gap-2">
        {SCHEMA_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer text-sm"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={() => toggle(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
      {selected.length > 1 && (
        <p className="text-xs text-blue-600">
          {selected.length} types selected — each will generate a separate
          JSON-LD block.
        </p>
      )}
    </div>
  );
}

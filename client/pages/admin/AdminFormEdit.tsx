import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { clearFormCache } from "@site/hooks/useCmsForm";
import {
  AUTO_TRACKED_FORM_FIELD_LABELS,
  isValidRedirectUrl,
  normalizeRedirectUrl,
} from "@site/lib/cms/formTracking";
import type {
  CmsForm,
  FormFieldDef,
  FormFieldType,
} from "@site/lib/cms/formTypes";

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Dropdown / Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "radio", label: "Radio" },
  { value: "file", label: "File Upload" },
  { value: "html", label: "HTML Notice" },
];

function generateFieldId() {
  return "f" + crypto.randomUUID().slice(0, 8);
}

function emptyField(): FormFieldDef {
  return {
    id: generateFieldId(),
    type: "text",
    name: "",
    label: "",
    required: false,
  };
}

export default function AdminFormEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [formName, setFormName] = useState("");
  const [submitButtonText, setSubmitButtonText] = useState("SUBMIT");
  const [successMessage, setSuccessMessage] = useState(
    "Thank you! We will contact you soon.",
  );
  const [redirectUrl, setRedirectUrl] = useState("");
  const [fields, setFields] = useState<FormFieldDef[]>([emptyField()]);

  useEffect(() => {
    if (!isNew) fetchForm();
  }, [id]);

  const fetchForm = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cms_forms")
      .select("*")
      .eq("id", id!)
      .single();

    if (error || !data) {
      toast.error("Form not found");
      navigate("/admin/forms");
      return;
    }

    const form = data as CmsForm;
    setDisplayName(form.display_name);
    setFormName(form.name);
    setSubmitButtonText(form.submit_button_text);
    setSuccessMessage(form.success_message);
    setRedirectUrl(form.redirect_url ?? "");
    setFields(form.fields.length > 0 ? form.fields : [emptyField()]);
    setLoading(false);
  };

  const handleSave = async () => {
    // Validation
    if (!displayName.trim()) {
      toast.error("Display name is required");
      return;
    }
    if (!formName.trim()) {
      toast.error("Form name is required");
      return;
    }

    if (!isValidRedirectUrl(redirectUrl)) {
      toast.error(
        "Redirect URL must be a site path like /thank-you/ or a full http(s) URL",
      );
      return;
    }

    // Validate fields — remove empty ones, validate non-empty
    const validFields = fields.filter(
      (f) => f.type === "html" ? !!f.htmlContent?.trim() : !!f.name.trim(),
    );

    for (const f of validFields) {
      if (f.type !== "html" && !f.label.trim()) {
        toast.error(`Field "${f.name}" needs a label`);
        return;
      }
      if ((f.type === "select" || f.type === "radio") && (!f.options || f.options.length === 0)) {
        toast.error(`Field "${f.name}" needs at least one option`);
        return;
      }
    }

    setSaving(true);

    const payload = {
      name: formName.trim(),
      display_name: displayName.trim(),
      fields: validFields,
      submit_button_text: submitButtonText.trim() || "SUBMIT",
      success_message:
        successMessage.trim() || "Thank you! We will contact you soon.",
      redirect_url: normalizeRedirectUrl(redirectUrl),
    };

    let error;

    if (isNew) {
      const res = await supabase.from("cms_forms").insert(payload).select().single();
      error = res.error;
      if (!error && res.data) {
        clearFormCache();
        toast.success("Form created");
        navigate(`/admin/forms/${res.data.id}`);
        setSaving(false);
        return;
      }
    } else {
      const res = await supabase
        .from("cms_forms")
        .update(payload)
        .eq("id", id!);
      error = res.error;
    }

    if (error) {
      console.error("Error saving form:", error);
      if (error.message?.includes("duplicate key")) {
        toast.error(`A form with name "${formName}" already exists`);
      } else {
        toast.error("Failed to save form");
      }
    } else {
      clearFormCache();
      toast.success("Form saved");
    }

    setSaving(false);
  };

  const updateField = useCallback(
    (fieldId: string, updates: Partial<FormFieldDef>) => {
      setFields((prev) =>
        prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      );
    },
    [],
  );

  const removeField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

  const moveField = useCallback((index: number, direction: -1 | 1) => {
    setFields((prev) => {
      const next = [...prev];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
  }, []);

  const addField = () => {
    setFields((prev) => [...prev, emptyField()]);
  };

  const copyShortcode = () => {
    if (!id) return;
    navigator.clipboard.writeText(`{{form:${id}}}`);
    toast.success("Shortcode copied");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/forms")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isNew ? "New Form" : "Edit Form"}
          </h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Shortcode (edit mode only) */}
      {!isNew && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="text-sm">
            <span className="text-blue-700 font-medium">Embed shortcode: </span>
            <code className="bg-white px-2 py-0.5 rounded border text-xs">
              {`{{form:${id}}}`}
            </code>
          </div>
          <Button variant="ghost" size="sm" onClick={copyShortcode}>
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        </div>
      )}

      {/* Form settings */}
      <div className="space-y-6">
        <FormSettingsSection
          displayName={displayName}
          setDisplayName={setDisplayName}
          formName={formName}
          setFormName={setFormName}
          submitButtonText={submitButtonText}
          setSubmitButtonText={setSubmitButtonText}
          successMessage={successMessage}
          setSuccessMessage={setSuccessMessage}
          redirectUrl={redirectUrl}
          setRedirectUrl={setRedirectUrl}
        />

        {/* Fields */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Fields</h2>
          <div className="space-y-3">
            {fields.map((field, idx) => (
              <FieldEditor
                key={field.id}
                field={field}
                index={idx}
                total={fields.length}
                onChange={updateField}
                onRemove={removeField}
                onMove={moveField}
              />
            ))}
          </div>
          <Button variant="outline" onClick={addField} className="mt-3">
            <Plus className="h-4 w-4 mr-2" />
            Add Field
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Form Settings ─── */

function FormSettingsSection({
  displayName,
  setDisplayName,
  formName,
  setFormName,
  submitButtonText,
  setSubmitButtonText,
  successMessage,
  setSuccessMessage,
  redirectUrl,
  setRedirectUrl,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  formName: string;
  setFormName: (v: string) => void;
  submitButtonText: string;
  setSubmitButtonText: (v: string) => void;
  successMessage: string;
  setSuccessMessage: (v: string) => void;
  redirectUrl: string;
  setRedirectUrl: (v: string) => void;
}) {
  const trackedFields = Object.entries(AUTO_TRACKED_FORM_FIELD_LABELS);

  return (
    <div className="border rounded-lg p-4 space-y-4 bg-white">
      <h2 className="text-lg font-semibold">Form Settings</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Contact Form"
          />
          <p className="text-xs text-gray-400">
            Label shown in the admin panel
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="formName">
            Form Name{" "}
            <span className="text-xs text-gray-400">(Netlify name attr)</span>
          </Label>
          <Input
            id="formName"
            value={formName}
            onChange={(e) =>
              setFormName(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="e.g. contact"
          />
          <p className="text-xs text-gray-400">
            Must be unique. Used as Netlify form name.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="submitText">Submit Button Text</Label>
          <Input
            id="submitText"
            value={submitButtonText}
            onChange={(e) => setSubmitButtonText(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="successMsg">Success Message</Label>
          <Input
            id="successMsg"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
          />
          <p className="text-xs text-gray-400">
            Used when no redirect URL is set.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="redirectUrl">Redirect URL</Label>
        <Input
          id="redirectUrl"
          value={redirectUrl}
          onChange={(e) => setRedirectUrl(e.target.value)}
          placeholder="/thank-you/ or https://example.com/thank-you"
        />
        <p className="text-xs text-gray-400">
          Leave blank to keep the inline success message. Set a site path or full http(s) URL to redirect after a successful submission.
        </p>
      </div>

      <div className="rounded-md border bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-900">
          Hidden attribution fields captured automatically
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Every CMS form submits these hidden fields without extra setup.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {trackedFields.map(([fieldName, label]) => (
            <span
              key={fieldName}
              className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs text-slate-700 border"
            >
              <strong className="mr-1 font-medium">{fieldName}</strong>
              <span className="text-slate-500">{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Single Field Editor ─── */

function FieldEditor({
  field,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  field: FormFieldDef;
  index: number;
  total: number;
  onChange: (id: string, updates: Partial<FormFieldDef>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const isHtml = field.type === "html";
  const hasOptions =
    field.type === "select" ||
    field.type === "radio" ||
    field.type === "checkbox";

  return (
    <div className="border rounded-lg p-4 bg-gray-50 space-y-3">
      {/* Top bar: drag handle + type + actions */}
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />

        <div className="w-44">
          <Select
            value={field.type}
            onValueChange={(val) =>
              onChange(field.id, { type: val as FormFieldType })
            }
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        {/* Reorder + delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onRemove(field.id)}
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>

      {/* HTML notice special case */}
      {isHtml ? (
        <div className="space-y-1.5">
          <Label className="text-xs">HTML Content</Label>
          <Textarea
            value={field.htmlContent ?? ""}
            onChange={(e) =>
              onChange(field.id, { htmlContent: e.target.value })
            }
            placeholder="<p>Your notice text here...</p>"
            className="min-h-[80px] text-sm font-mono"
          />
        </div>
      ) : (
        <>
          {/* Name + Label */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Field Name (HTML name attr)</Label>
              <Input
                value={field.name}
                onChange={(e) =>
                  onChange(field.id, {
                    name: e.target.value.replace(/\s+/g, ""),
                  })
                }
                placeholder="e.g. firstName"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label / Placeholder</Label>
              <Input
                value={field.label}
                onChange={(e) =>
                  onChange(field.id, { label: e.target.value })
                }
                placeholder="e.g. First Name *"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Required toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={field.required}
              onCheckedChange={(checked) =>
                onChange(field.id, { required: checked })
              }
              id={`required-${field.id}`}
            />
            <Label htmlFor={`required-${field.id}`} className="text-xs">
              Required
            </Label>
          </div>

          {/* Options editor for select/radio/checkbox */}
          {hasOptions && (
            <OptionsEditor
              options={field.options ?? []}
              onChange={(opts) => onChange(field.id, { options: opts })}
            />
          )}

          {/* Accept for file */}
          {field.type === "file" && (
            <div className="space-y-1">
              <Label className="text-xs">
                Accepted file types (comma-separated MIME)
              </Label>
              <Input
                value={field.accept ?? ""}
                onChange={(e) =>
                  onChange(field.id, { accept: e.target.value })
                }
                placeholder="e.g. image/*,.pdf"
                className="h-8 text-sm"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── Options Editor (for select / radio / checkbox) ─── */

function OptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (opts: string[]) => void;
}) {
  const addOption = () => onChange([...options, ""]);

  const updateOption = (idx: number, value: string) => {
    const next = [...options];
    next[idx] = value;
    onChange(next);
  };

  const removeOption = (idx: number) => {
    onChange(options.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Options</Label>
      {options.map((opt, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <Input
            value={opt}
            onChange={(e) => updateOption(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => removeOption(idx)}
          >
            <Trash2 className="h-3 w-3 text-red-400" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={addOption}
        className="text-xs"
      >
        <Plus className="h-3 w-3 mr-1" />
        Add Option
      </Button>
    </div>
  );
}

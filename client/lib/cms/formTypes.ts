export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "file"
  | "html";

export interface FormFieldDef {
  id: string;
  type: FormFieldType;
  name: string;
  label: string;
  required: boolean;
  /** Options for select, radio, checkbox fields */
  options?: string[];
  /** HTML content for "html" notice fields */
  htmlContent?: string;
  /** Accepted mime types for "file" fields */
  accept?: string;
}

export interface CmsForm {
  id: string;
  name: string;
  display_name: string;
  fields: FormFieldDef[];
  submit_button_text: string;
  success_message: string;
  redirect_url: string | null;
  created_at: string;
  updated_at: string;
}

const CMS_FORM_LOOKUP_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isCmsFormLookupId(value: string) {
  return CMS_FORM_LOOKUP_ID_RE.test(value.trim());
}

export function normalizeCmsForm(form: CmsForm): CmsForm {
  return {
    ...form,
    redirect_url: form.redirect_url?.trim() || null,
  };
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCmsForm } from "@site/hooks/useCmsForm";
import {
  AUTO_TRACKED_FORM_FIELD_NAMES,
  EMPTY_FORM_TRACKING_PAYLOAD,
  getBrowserFormTrackingPayload,
  normalizeRedirectUrl,
} from "@site/lib/cms/formTracking";
import type { CmsForm, FormFieldDef } from "@site/lib/cms/formTypes";

interface CmsFormRendererProps {
  /** Pass a pre-loaded form object directly */
  form?: CmsForm;
  /** Or pass an ID/name to fetch it */
  formId?: string;
  /** Optional extra className on the wrapper */
  className?: string;
}

export default function CmsFormRenderer({
  form: formProp,
  formId,
  className,
}: CmsFormRendererProps) {
  const { form: fetchedForm, isLoading } = useCmsForm(
    formProp ? undefined : formId,
  );
  const form = formProp ?? fetchedForm;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!form) {
    return null;
  }

  return <FormInner form={form} className={className} />;
}

function FormInner({
  form,
  className,
}: {
  form: CmsForm;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trackingPayload, setTrackingPayload] = useState(
    EMPTY_FORM_TRACKING_PAYLOAD,
  );
  const redirectUrl = useMemo(
    () => normalizeRedirectUrl(form.redirect_url),
    [form.redirect_url],
  );

  useEffect(() => {
    setTrackingPayload(getBrowserFormTrackingPayload());
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formElement = e.currentTarget;

    try {
      const formData = new FormData(formElement);
      const body = new URLSearchParams();

      formData.forEach((value, key) => {
        if (value instanceof File) {
          if (value.name) {
            body.append(key, value.name);
          }
          return;
        }

        body.append(key, value.toString());
      });

      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });

      if (!response.ok) {
        throw new Error(`Form submission failed with ${response.status}`);
      }

      if (redirectUrl && typeof window !== "undefined") {
        window.location.assign(redirectUrl);
        return;
      }

      toast.success(form.success_message);
      formElement.reset();
      setTrackingPayload(getBrowserFormTrackingPayload());
    } catch (err) {
      console.error("[CmsFormRenderer] Submit error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      name={form.name}
      method="POST"
      action={redirectUrl ?? undefined}
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      className={className ?? "space-y-[25px]"}
    >
      <input type="hidden" name="form-name" value={form.name} />
      {AUTO_TRACKED_FORM_FIELD_NAMES.map((fieldName) => (
        <input
          key={fieldName}
          type="hidden"
          name={fieldName}
          value={trackingPayload[fieldName]}
          readOnly
        />
      ))}

      {form.fields.map((field) => (
        <FormField key={field.id} field={field} />
      ))}

      <div>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-accent-dark text-brand-accent border-brand-accent font-outfit text-[22px] h-[50px] hover:bg-brand-accent hover:text-black transition-all duration-300 rounded-none"
        >
          {isSubmitting ? "SUBMITTING..." : form.submit_button_text}
        </Button>
      </div>

      <div className="absolute invisible" aria-hidden="true">
        <label>
          If you are a human, leave this empty.
          <Input
            type="text"
            name="bot-field"
            tabIndex={-1}
            autoComplete="off"
            className="invisible"
          />
        </label>
      </div>
    </form>
  );
}

const fieldInputClass =
  "w-full h-[50px] bg-[#f7f7f7] border-[0.8px] border-[#c4c4c4] text-[#6b6b6b] text-[16px] px-[12px] py-[12px] rounded-none focus-visible:ring-0 focus-visible:ring-offset-0";

function FormField({ field }: { field: FormFieldDef }) {
  switch (field.type) {
    case "text":
    case "email":
    case "phone":
      return (
        <div>
          <Input
            type={field.type === "phone" ? "tel" : field.type}
            name={field.name}
            placeholder={field.label}
            required={field.required}
            className={fieldInputClass}
          />
        </div>
      );

    case "textarea":
      return (
        <div>
          <Textarea
            name={field.name}
            placeholder={field.label}
            required={field.required}
            className="w-full h-[200px] bg-[#f7f7f7] border-[0.8px] border-[#c4c4c4] text-[#6b6b6b] text-[16px] px-[12px] py-[12px] rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      );

    case "select":
      return (
        <div>
          <select
            name={field.name}
            required={field.required}
            defaultValue=""
            className={fieldInputClass + " appearance-none"}
          >
            <option value="" disabled>
              {field.label}
            </option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );

    case "checkbox":
      return (
        <fieldset>
          <legend className="font-outfit text-[16px] text-[#6b6b6b] mb-2">
            {field.label}
          </legend>
          {(field.options ?? []).map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 font-outfit text-[15px] text-[#6b6b6b] mb-1 cursor-pointer"
            >
              <input
                type="checkbox"
                name={field.name}
                value={opt}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </fieldset>
      );

    case "radio":
      return (
        <fieldset>
          <legend className="font-outfit text-[16px] text-[#6b6b6b] mb-2">
            {field.label}
          </legend>
          {(field.options ?? []).map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 font-outfit text-[15px] text-[#6b6b6b] mb-1 cursor-pointer"
            >
              <input
                type="radio"
                name={field.name}
                value={opt}
                required={field.required}
                className="h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </fieldset>
      );

    case "file":
      return (
        <div>
          <label className="block font-outfit text-[16px] text-[#6b6b6b] mb-1">
            {field.label}
          </label>
          <input
            type="file"
            name={field.name}
            required={field.required}
            accept={field.accept}
            className="w-full text-[#6b6b6b] text-[16px] file:mr-4 file:py-2 file:px-4 file:border file:border-[#c4c4c4] file:bg-[#f7f7f7] file:text-[#6b6b6b] file:text-sm file:font-outfit file:rounded-none"
          />
        </div>
      );

    case "html":
      return (
        <div
          className="font-outfit text-[15px] text-[#6b6b6b] [&_a]:text-blue-600 [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: field.htmlContent ?? "" }}
        />
      );

    default:
      return null;
  }
}

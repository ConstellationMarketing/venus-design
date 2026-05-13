import CmsFormRenderer from "@site/components/shared/CmsFormRenderer";

export default function ContactForm() {
  return (
    <div className="bg-brand-card border border-brand-border p-[30px]">
      <CmsFormRenderer formId="contact" className="space-y-[25px]" />
    </div>
  );
}

import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import CmsFormRenderer from "./CmsFormRenderer";
import type { CmsForm } from "@site/lib/cms/formTypes";

const TEST_FORM: CmsForm = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "contact",
  display_name: "Contact Form",
  fields: [
    {
      id: "f1",
      type: "text",
      name: "fullName",
      label: "Full Name",
      required: true,
    },
  ],
  submit_button_text: "Send",
  success_message: "Thanks",
  redirect_url: "/thank-you/",
  created_at: "",
  updated_at: "",
};

describe("CmsFormRenderer", () => {
  it("renders netlify form markup with hidden tracking inputs during SSR", () => {
    const html = renderToString(<CmsFormRenderer form={TEST_FORM} />);

    expect(html).toContain('data-netlify="true"');
    expect(html).toContain('data-netlify-honeypot="bot-field"');
    expect(html).toContain('name="form-name"');
    expect(html).toContain('name="utm_source"');
    expect(html).toContain('name="landing_page"');
    expect(html).toContain('action="/thank-you/"');
    expect(html).toContain('name="fullName"');
  });
});

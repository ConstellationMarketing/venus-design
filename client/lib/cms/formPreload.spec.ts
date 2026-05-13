import { describe, expect, it } from "vitest";
import { createEmptyPreloadedState } from "../preloadState";
import {
  attachPreloadedForms,
  discoverCmsFormLookups,
  discoverRouteFormLookups,
  routeUsesCmsForm,
} from "./formPreload";
import type { CmsForm } from "./formTypes";

const EMPTY_META = {
  meta_title: null,
  meta_description: null,
  canonical_url: null,
  og_title: null,
  og_description: null,
  og_image: null,
  noindex: false,
  schema_type: null,
  schema_data: null,
};

const CONTACT_FORM: CmsForm = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "contact",
  display_name: "Contact",
  fields: [],
  submit_button_text: "Submit",
  success_message: "Done",
  redirect_url: null,
  created_at: "",
  updated_at: "",
};

describe("discoverCmsFormLookups", () => {
  it("finds shortcode IDs, named forms, and contact blocks", () => {
    const lookups = discoverCmsFormLookups([
      {
        type: "contact-section",
        heading: "Talk to us",
      },
      {
        type: "custom-form",
        formName: "consultation",
      },
      {
        type: "content-section",
        body: "<p>{{form:123e4567-e89b-12d3-a456-426614174000}}</p>",
      },
    ]);

    expect(lookups.ids).toEqual(["123e4567-e89b-12d3-a456-426614174000"]);
    expect(lookups.names).toEqual(
      expect.arrayContaining(["contact-block", "consultation"]),
    );
  });
});

describe("discoverRouteFormLookups", () => {
  it("includes hardcoded contact form usage for the home route", () => {
    const state = createEmptyPreloadedState({ urlPath: "/" });
    state.page = {
      document: {
        urlPath: "/",
        title: "Home",
        content: [],
        meta: EMPTY_META,
        publishedAt: null,
        updatedAt: null,
      },
    };

    const lookups = discoverRouteFormLookups("/", state);

    expect(lookups.names).toContain("contact");
  });
});

describe("attachPreloadedForms", () => {
  it("stores forms by both id and name", () => {
    const state = createEmptyPreloadedState({ urlPath: "/contact/" });
    attachPreloadedForms(state, [CONTACT_FORM]);

    expect(state.forms.byId[CONTACT_FORM.id]).toEqual(CONTACT_FORM);
    expect(state.forms.byName[CONTACT_FORM.name]).toEqual(CONTACT_FORM);
    expect(routeUsesCmsForm(CONTACT_FORM, {
      ids: [CONTACT_FORM.id],
      names: [],
    })).toBe(true);
  });
});

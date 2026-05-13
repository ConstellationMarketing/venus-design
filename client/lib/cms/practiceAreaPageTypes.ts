// Each section maps directly to a static component's data needs

export interface PracticeAreaHeroContent {
  sectionLabel: string;
  tagline: string;
  description: string;
  backgroundImage?: string;
  backgroundImageAlt?: string;
}

export interface PracticeAreaTestimonialItem extends Record<string, unknown> {
  text: string;
  author: string;
  ratingImage: string;
  ratingImageAlt?: string;
}

export interface PracticeAreaAwardsContent {
  logos: Array<{ src: string; alt: string }>;
}

export interface PracticeAreaSocialProofContent {
  mode: "testimonials" | "awards" | "none";
  testimonials: PracticeAreaTestimonialItem[];
  awards: PracticeAreaAwardsContent;
}

export interface PracticeAreaContentSectionItem extends Record<string, unknown> {
  body: string;
  image: string;
  imageAlt: string;
  imagePosition: "left" | "right";
  /** Defaults to enabled on odd-numbered sections and disabled on even-numbered sections. */
  showCTAs?: boolean;
}

export interface PracticeAreaFaqContent {
  enabled: boolean;
  heading: string;
  description: string;
  items: Array<{ question: string; answer: string }>;
}

export interface PracticeAreaPageContent {
  hero: PracticeAreaHeroContent;
  socialProof: PracticeAreaSocialProofContent;
  contentSections: PracticeAreaContentSectionItem[];
  faq: PracticeAreaFaqContent;
  headingTags?: Record<string, string>;
}

export function getPracticeAreaSectionImagePosition(
  index: number,
): "left" | "right" {
  return index % 2 === 0 ? "right" : "left";
}

export function getPracticeAreaSectionShowCtasDefault(index: number): boolean {
  return index % 2 === 0;
}

export function createPracticeAreaContentSection(
  index: number,
  overrides: Partial<PracticeAreaContentSectionItem> = {},
): PracticeAreaContentSectionItem {
  return {
    body: overrides.body ?? "",
    image: overrides.image ?? "",
    imageAlt: overrides.imageAlt ?? "",
    imagePosition:
      overrides.imagePosition ?? getPracticeAreaSectionImagePosition(index),
    showCTAs:
      overrides.showCTAs ?? getPracticeAreaSectionShowCtasDefault(index),
  };
}

export function normalizePracticeAreaContentSections(
  sections: Array<Partial<PracticeAreaContentSectionItem>> | null | undefined,
): PracticeAreaContentSectionItem[] {
  if (!sections?.length) {
    return [];
  }

  return sections.map((section, index) =>
    createPracticeAreaContentSection(index, section),
  );
}

// Default content - empty defaults, content comes exclusively from the CMS
export const defaultPracticeAreaPageContent: PracticeAreaPageContent = {
  hero: {
    sectionLabel: "",
    tagline: "",
    description: "",
    backgroundImage: "",
    backgroundImageAlt: "",
  },
  socialProof: {
    mode: "none",
    testimonials: [],
    awards: {
      logos: [],
    },
  },
  contentSections: [],
  faq: {
    enabled: false,
    heading: "",
    description: "",
    items: [],
  },
};

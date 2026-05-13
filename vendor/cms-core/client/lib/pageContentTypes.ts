// TypeScript interfaces for CMS-driven page content
// Each page type has a specific structure that maps to the static page design

// ============================================
// HOME PAGE CONTENT
// ============================================
export interface HomePageContent {
  hero: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    ctaText: string;
    ctaUrl: string;
    attorneyImage: string;
    badgeImage: string;
  };
  features: Array<{
    icon: string; // SVG path or icon name
    title: string;
    description: string;
  }>;
  mission: {
    heading: string;
    paragraphs: string[];
    image: string;
    ctaPrimaryText: string;
    ctaPrimaryUrl: string;
    ctaSecondaryText: string;
    ctaSecondaryUrl: string;
  };
  attorney: {
    name: string;
    title: string;
    photo: string;
    bio: string;
    bullets: string[];
    phone: string;
  };
  speakWithUs: {
    heading: string;
    description: string;
    image: string;
    ctaText: string;
    ctaUrl: string;
  };
  clientStories: {
    heading: string;
    subtitle: string;
    videos: Array<{
      embedUrl: string;
      thumbnail: string;
    }>;
  };
  contactForm: {
    heading: string;
    image: string;
    badgeImage: string;
  };
  services: {
    heading: string;
    description: string;
    items: Array<{
      title: string;
      icon: string; // Lucide icon name
    }>;
    closingText: string;
  };
}

// ============================================
// ABOUT PAGE CONTENT
// ============================================
export interface AboutPageContent {
  hero: {
    title: string;
    backgroundImage: string;
  };
  story: {
    paragraphs: string[];
    ctaPrimaryText: string;
    ctaPrimaryUrl: string;
    ctaSecondaryText: string;
    ctaSecondaryUrl: string;
    image: string;
  };
  attorney: {
    name: string;
    title: string;
    photo: string;
    bio: string[];
    phone: string;
  };
  approach: Array<{
    icon: string; // Lucide icon name
    title: string;
    description: string;
  }>;
  testimonials: Array<{
    quote: string;
    name: string;
    initials: string;
    caseType: string;
    rating: number;
  }>;
  cta: {
    heading: string;
    description: string;
    phone: string;
  };
}

// ============================================
// CONTACT PAGE CONTENT
// ============================================
export interface ContactPageContent {
  hero: {
    title: string;
    subtitle: string;
    backgroundImage: string;
  };
  info: {
    phone: string;
    phoneNote: string;
    address: string[];
    addressLabel: string;
  };
  form: {
    heading: string;
    image: string;
    badgeImage: string;
  };
  officeHours: Array<{
    label: string;
    hours: string;
  }>;
  hoursNote: string;
  mapEmbedUrl: string;
  cta: {
    heading: string;
    description: string;
    phone: string;
  };
}

// ============================================
// PRACTICE AREAS PAGE CONTENT
// ============================================
export interface PracticeAreasPageContent {
  hero: {
    title: string;
    backgroundImage: string;
  };
  intro: string;
  areas: Array<{
    name: string;
    icon: string; // Lucide icon name
    description: string;
  }>;
  options: {
    heading: string;
    text: string;
    image: string;
    ctaPrimaryText: string;
    ctaPrimaryUrl: string;
    ctaSecondaryText: string;
    ctaSecondaryUrl: string;
  };
  cta: {
    heading: string;
    description: string;
    phone: string;
  };
}

// ============================================
// UNION TYPE FOR ALL PAGE CONTENT
// ============================================
export type PageContent =
  | HomePageContent
  | AboutPageContent
  | ContactPageContent
  | PracticeAreasPageContent;

// Page key to content type mapping
export type PageKeyToContent = {
  home: HomePageContent;
  about: AboutPageContent;
  contact: ContactPageContent;
  "practice-areas": PracticeAreasPageContent;
};

export type PageKey = keyof PageKeyToContent;

// Database row structure from Supabase pages table
export interface PageRow {
  id: string;
  title: string;
  url_path: string;
  content: PageContent;
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  status: "draft" | "published" | "archived";
  template_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  page_type: "standard" | "practice" | "landing";
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  noindex: boolean;
  schema_type: string | null;
  schema_data: Record<string, unknown> | null;
}

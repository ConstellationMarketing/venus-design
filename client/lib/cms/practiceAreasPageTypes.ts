// Type definitions for structured Practice Areas page content
// Each section maps directly to a static component's data needs

export interface PracticeAreasHeroContent {
  sectionLabel: string; // "– Practice Areas" (H1)
  tagline: string; // "Comprehensive Legal Expertise" (styled text)
  description: string; // Description paragraph
  phone: string;
  phoneLabel: string;
}

export interface PracticeAreaGridItem {
  icon: string; // Lucide icon name
  title: string; // "Personal Injury"
  description: string; // Description text
  image: string; // Background image URL
  imageAlt: string; // Image alt text
  link: string; // Link to detail page
}

export interface PracticeAreasGridContent {
  heading: string; // "Our Areas of Practice"
  description: string; // Intro paragraph
  areas: PracticeAreaGridItem[];
}

export interface WhyChooseItem {
  number: string;
  title: string;
  description: string;
}

export interface WhyChooseContent {
  sectionLabel: string; // "– Why Choose Us"
  heading: string; // "Experience Across All Practice Areas"
  subtitle: string; // Subtitle text
  description: string; // Description paragraph
  image: string; // Section image (shared from About page)
  imageAlt: string; // Image alt text
  items: WhyChooseItem[];
}

export interface CTAContent {
  heading: string; // "Ready to Discuss Your Case?"
  description: string; // Subtitle text
  primaryButton: {
    label: string; // "Call Us 24/7"
    phone: string; // Phone number
  };
  secondaryButton: {
    label: string; // "Schedule Now"
    sublabel: string; // "Free Consultation"
    link: string; // Link URL
  };
}

// Complete Practice Areas page content structure
export interface PracticeAreasPageContent {
  hero: PracticeAreasHeroContent;
  grid: PracticeAreasGridContent;
  whyChoose: WhyChooseContent;
  cta: CTAContent;
  /** Maps heading keys (e.g. "grid.heading") to HTML tag names (e.g. "h2") */
  headingTags?: Record<string, string>;
}

// Default content - empty defaults, content comes exclusively from the CMS
export const defaultPracticeAreasContent: PracticeAreasPageContent = {
  hero: {
    sectionLabel: "",
    tagline: "",
    description: "",
    phone: "",
    phoneLabel: "",
  },
  grid: {
    heading: "",
    description: "",
    areas: [],
  },
  whyChoose: {
    sectionLabel: "",
    heading: "",
    subtitle: "",
    image: "",
    imageAlt: "",
    description: "",
    items: [],
  },
  cta: {
    heading: "",
    description: "",
    primaryButton: {
      label: "",
      phone: "",
    },
    secondaryButton: {
      label: "",
      sublabel: "",
      link: "",
    },
  },
};

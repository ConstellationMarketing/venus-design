// Type definitions for structured homepage content
// Each section maps directly to a static component's data needs

export interface HeroContent {
  h1Title: string;
  headline: string;
  highlightedText: string;
  description: string;
  primaryImage: string;
  primaryImageAlt: string;
  secondaryImage: string;
  secondaryImageAlt: string;
  primaryCtaLabel: string;
  primaryCtaUrl: string;
  secondaryCtaLabel: string;
  phone: string;
  phoneLabel: string;
}

export interface AboutFeature {
  number: string;
  title: string;
  description: string;
}

export interface AboutStat {
  value: string;
  label: string;
}

export interface AboutContent {
  sectionLabel: string;
  heading: string;
  description: string;
  phone: string;
  phoneLabel: string;
  contactLabel: string;
  contactText: string;
  attorneyImage: string;
  attorneyImageAlt: string;
  ctaTitle: string;
  ctaButtonLabel: string;
  ctaButtonLink: string;
}

export interface PracticeAreaItem {
  title: string;
  image: string;
  imageAlt: string;
  link: string;
}

export interface PracticeAreasIntroContent {
  sectionLabel: string;
  heading: string;
}

export interface AwardsContent {
  sectionLabel: string;
  heading: string;
  description: string;
  logos: Array<{ src: string; alt: string }>;
}

export interface TestimonialItem {
  text: string;
  author: string;
  ratingImage: string;
  ratingImageAlt?: string;
}

export interface TestimonialsContent {
  sectionLabel: string;
  heading: string;
  backgroundImage: string;
  backgroundImageAlt?: string;
  items: TestimonialItem[];
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export interface ProcessContent {
  sectionLabel: string;
  headingLine1: string;
  headingLine2: string;
  steps: ProcessStep[];
}

export interface GoogleReviewItem {
  text: string;
  author: string;
  ratingImage: string;
  ratingImageAlt?: string;
}

export interface GoogleReviewsContent {
  sectionLabel: string;
  heading: string;
  description: string;
  reviews: GoogleReviewItem[];
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  heading: string;
  description: string;
  videoThumbnail: string;
  videoThumbnailAlt?: string;
  videoUrl: string;
  items: FaqItem[];
}

export interface ContactContent {
  sectionLabel: string;
  heading: string;
  description: string;
  phone: string;
  phoneLabel: string;
  address: string;
  formHeading: string;
  availabilityText: string;
  image: string;
  imageAlt: string;
  backgroundImage?: string;
  backgroundImageAlt?: string;
}

// Complete homepage content structure
export interface HomePageContent {
  hero: HeroContent;
  about: AboutContent;
  practiceAreasIntro: PracticeAreasIntroContent;
  practiceAreas: PracticeAreaItem[];
  awards: AwardsContent;
  testimonials: TestimonialsContent;
  process: ProcessContent;
  googleReviews: GoogleReviewsContent;
  faq: FaqContent;
  contact: ContactContent;
  /** Maps heading keys (e.g. "about.heading") to HTML tag names (e.g. "h2") */
  headingTags?: Record<string, string>;
}

// Default content - empty defaults, content comes exclusively from the CMS
export const defaultHomeContent: HomePageContent = {
  hero: {
    h1Title: "",
    headline: "",
    highlightedText: "",
    description: "",
    primaryImage: "",
    primaryImageAlt: "",
    secondaryImage: "",
    secondaryImageAlt: "",
    primaryCtaLabel: "Contact Us",
    primaryCtaUrl: "/contact/",
    secondaryCtaLabel: "Call Us Now",
    phone: "",
    phoneLabel: "",
  },
  about: {
    sectionLabel: "",
    heading: "",
    description: "",
    phone: "",
    phoneLabel: "",
    contactLabel: "",
    contactText: "",
    attorneyImage: "",
    attorneyImageAlt: "",
    ctaTitle: "",
    ctaButtonLabel: "",
    ctaButtonLink: "",
  },
  practiceAreasIntro: {
    sectionLabel: "",
    heading: "",
  },
  practiceAreas: [],
  awards: {
    sectionLabel: "",
    heading: "",
    description: "",
    logos: [],
  },
  testimonials: {
    sectionLabel: "",
    heading: "",
    backgroundImage: "",
    backgroundImageAlt: "",
    items: [],
  },
  process: {
    sectionLabel: "",
    headingLine1: "",
    headingLine2: "",
    steps: [],
  },
  googleReviews: {
    sectionLabel: "",
    heading: "",
    description: "",
    reviews: [],
  },
  faq: {
    heading: "",
    description: "",
    videoThumbnail: "",
    videoThumbnailAlt: "",
    videoUrl: "",
    items: [],
  },
  contact: {
    sectionLabel: "",
    heading: "",
    description: "",
    phone: "",
    phoneLabel: "",
    address: "",
    formHeading: "",
    availabilityText: "",
    image: "",
    imageAlt: "",
    backgroundImage: "",
    backgroundImageAlt: "",
  },
};

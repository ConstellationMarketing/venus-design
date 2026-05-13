// Type definitions for structured Contact page content
// Each section maps directly to a static component's data needs

export interface ContactHeroContent {
  sectionLabel: string; // "– Contact Us" (H1)
  tagline: string; // "Let's Talk About Your Case" (styled paragraph)
  description: string; // Description paragraph
}

export interface ContactMethodItem {
  icon: string; // Lucide icon name
  title: string; // "Phone", "Email", "Office"
  detail: string; // Primary detail (phone number, email, address line 1)
  subDetail: string; // Secondary detail (availability, response time, address line 2)
}

export interface ContactMethodsContent {
  methods: ContactMethodItem[];
}

export interface ContactFormContent {
  heading: string; // "Send Us a Message"
  subtext: string; // Description below heading
}

export interface OfficeHoursItem {
  day: string;
  hours: string;
}

export interface OfficeHoursContent {
  heading: string; // "Office Hours"
  items: OfficeHoursItem[];
  note: string; // Additional note
}

export interface ProcessStepItem {
  number: string;
  title: string;
  description: string;
}

export interface ProcessContent {
  sectionLabel: string; // "– The Process"
  heading: string; // "What to Expect When You Contact Us"
  subtitle: string; // Subtitle text
  steps: ProcessStepItem[];
}

export interface VisitOfficeContent {
  heading: string; // "Visit Our Office"
  subtext: string; // Description text
  mapEmbedUrl: string; // Google Maps embed URL
}

export interface CTAContent {
  heading: string; // "Ready to Discuss Your Case?"
  description: string; // Subtitle text
  primaryButton: {
    label: string; // "Call Us Now"
    phone: string; // Phone number
  };
  secondaryButton: {
    label: string; // "Schedule Consultation"
    sublabel: string; // "Free Case Review"
    link: string; // Link URL
  };
}

// Complete Contact page content structure
export interface ContactPageContent {
  hero: ContactHeroContent;
  contactMethods: ContactMethodsContent;
  form: ContactFormContent;
  officeHours: OfficeHoursContent;
  process: ProcessContent;
  visitOffice: VisitOfficeContent;
  cta: CTAContent;
  /** Maps heading keys (e.g. "form.heading") to HTML tag names (e.g. "h2") */
  headingTags?: Record<string, string>;
}

// Default content - empty defaults, content comes exclusively from the CMS
export const defaultContactContent: ContactPageContent = {
  hero: {
    sectionLabel: "",
    tagline: "",
    description: "",
  },
  contactMethods: {
    methods: [],
  },
  form: {
    heading: "",
    subtext: "",
  },
  officeHours: {
    heading: "",
    items: [],
    note: "",
  },
  process: {
    sectionLabel: "",
    heading: "",
    subtitle: "",
    steps: [],
  },
  visitOffice: {
    heading: "",
    subtext: "",
    mapEmbedUrl: "",
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

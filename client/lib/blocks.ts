// client/lib/blocks.ts

export type ContentBlock =
  | {
      type: "hero";
      sectionLabel: string;
      tagline: string;
      description: string;
      backgroundImage?: string;
      backgroundImageAlt?: string;
    }
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | {
      type: "content-section";
      body: string;
      image?: string;
      imageAlt?: string;
      imagePosition: "left" | "right";
      showCTAs?: boolean;
    }
  | {
      type: "cta";
      heading: string;
      description: string;
      secondaryButton?: { label: string; sublabel: string; link: string };
    }
  | {
      type: "team-members";
      sectionLabel: string;
      heading: string;
      members: Array<{
        name: string;
        title: string;
        bio: string;
        image: string;
        imageAlt?: string;
        specialties?: string[];
      }>;
    }
  | {
      type: "testimonials";
      sectionLabel: string;
      heading: string;
      backgroundImage?: string;
      backgroundImageAlt?: string;
      items: Array<{
        text: string;
        author: string;
        ratingImage?: string;
        ratingImageAlt?: string;
      }>;
    }
  | {
      type: "contact-section";
      sectionLabel: string;
      heading: string;
      description: string;
      formHeading: string;
    }
  | {
      type: "map";
      heading?: string;
      subtext?: string;
      mapEmbedUrl: string;
    }
  | {
      type: "practice-areas-grid";
      heading: string;
      description?: string;
      areas: Array<{
        icon: string;
        title: string;
        description: string;
        image: string;
        imageAlt?: string;
        link: string;
      }>;
    }
  | {
      type: "recent-posts";
      sectionLabel: string;
      heading: string;
      postCount?: number;
    };

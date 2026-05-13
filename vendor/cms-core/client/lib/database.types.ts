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

export type PageStatus = "draft" | "published";
export type PageType = "standard" | "practice" | "landing" | "post";

export interface Page {
  id: string;
  page_id: number;
  title: string;
  url_path: string;
  page_type: PageType;
  content: unknown; // template-specific blocks live in the site repo
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  noindex: boolean;
  schema_type: string | null;
  schema_data: Record<string, unknown> | null;
  status: PageStatus;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  page_type: PageType;
  default_content: unknown;
  default_meta_title: string | null;
  default_meta_description: string | null;
  created_at: string;
}

export interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: 301 | 302;
  enabled: boolean;
  created_at: string;
}

export interface Media {
  id: string;
  file_name: string;
  file_path: string;
  public_url: string;
  file_size: number | null;
  mime_type: string | null;
  alt_text: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface PostCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  category_id: string | null;
  content: unknown;
  body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  noindex: boolean;
  status: PageStatus;
  published_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface CMSUser {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "editor";
  created_at: string;
  created_by: string | null;
}

export interface PageRevision {
  id: string;
  page_id: string;
  page_id_snapshot: number | null;
  title: string;
  url_path: string;
  page_type: PageType;
  content: unknown;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  noindex: boolean;
  status: PageStatus;
  created_at: string;
  created_by: string | null;
}

export interface Database {
  public: {
    Tables: {
      pages: {
        Row: Page;
        Insert: Omit<Page, "id" | "page_id" | "created_at" | "updated_at"> & {
          id?: string;
          page_id?: number;
        };
        Update: Partial<Omit<Page, "id" | "created_at">>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Template, "id" | "created_at">>;
      };
      redirects: {
        Row: Redirect;
        Insert: Omit<Redirect, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Redirect, "id" | "created_at">>;
      };
      media: {
        Row: Media;
        Insert: Omit<Media, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Media, "id" | "created_at">>;
      };
      cms_users: {
        Row: CMSUser;
        Insert: Omit<CMSUser, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<CMSUser, "id" | "created_at">>;
      };
      page_revisions: {
        Row: PageRevision;
        Insert: Omit<PageRevision, "id" | "created_at"> & { id?: string; page_id_snapshot?: number };
        Update: Partial<Omit<PageRevision, "id" | "created_at">>;
      };
      post_categories: {
        Row: PostCategory;
        Insert: Omit<PostCategory, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<PostCategory, "id" | "created_at">>;
      };
      posts: {
        Row: Post;
        Insert: Omit<Post, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<Omit<Post, "id" | "created_at">>;
      };
    };
  };
}

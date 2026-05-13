import type { AboutPageContent } from "./aboutPageTypes";
import { defaultAboutContent } from "./aboutPageTypes";
import type { ContactPageContent } from "./contactPageTypes";
import { defaultContactContent } from "./contactPageTypes";
import type { HomePageContent } from "./homePageTypes";
import { defaultHomeContent } from "./homePageTypes";
import type { PageMeta, PageMetaImageInput } from "./pageMeta";
import { emptyPageMeta } from "./pageMeta";
import type { PracticeAreaPageContent } from "./practiceAreaPageTypes";
import {
  defaultPracticeAreaPageContent,
  normalizePracticeAreaContentSections,
} from "./practiceAreaPageTypes";
import type { PracticeAreasPageContent } from "./practiceAreasPageTypes";
import { defaultPracticeAreasContent } from "./practiceAreasPageTypes";
import type { ContentBlock } from "../blocks";
import { normalizeFaviconAssets, type FaviconAssets } from "../seo/favicon";
import { fetchRestRows, fetchRestSingle } from "./publicFetch";

export interface SiteSettings {
  siteName: string;
  logoUrl: string;
  logoAlt: string;
  faviconSourceUrl: string;
  faviconAssets: FaviconAssets | null;
  phoneNumber: string;
  phoneDisplay: string;
  phoneAvailability: string;
  applyPhoneGlobally: boolean;
  headerCtaText: string;
  headerCtaUrl: string;
  navigationItems: {
    label: string;
    href: string;
    order?: number;
    openInNewTab?: boolean;
    children?: { label: string; href: string; openInNewTab?: boolean }[];
  }[];
  footerAboutLinks: { label: string; href?: string }[];
  footerPracticeLinks: { label: string; href?: string }[];
  footerResourcesHeading: string;
  footerPracticeAreasHeading: string;
  footerTaglineHtml: string;
  addressLine1: string;
  addressLine2: string;
  mapEmbedUrl: string;
  socialLinks: { platform: string; url: string; enabled: boolean }[];
  copyrightText: string;
  siteUrl: string;
  siteNoindex: boolean;
  ga4MeasurementId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  headScripts: string;
  footerScripts: string;
  globalSchema: string;
}

export interface CmsPageRow {
  title?: string | null;
  url_path?: string | null;
  page_type?: string | null;
  content?: unknown;
  meta_title?: string | null;
  meta_description?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: PageMetaImageInput;
  noindex?: boolean | null;
  schema_type?: string | null;
  schema_data?: Record<string, unknown> | null;
  published_at?: string | null;
  updated_at?: string | null;
}

export interface PostCategory {
  name: string;
  slug: string;
}

export interface PreloadedPostDocument {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  featured_image: string | null;
  category_id: string | null;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: PageMetaImageInput;
  noindex: boolean;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  post_categories: PostCategory | null;
}

export interface CmsPostRow extends PreloadedPostDocument {
  status?: string | null;
  schema_type?: string | null;
  schema_data?: Record<string, unknown> | null;
}

export interface PreloadedPageDocument<TContent = unknown> {
  urlPath: string;
  title: string;
  pageType?: string | null;
  content: TContent;
  meta: PageMeta;
  publishedAt: string | null;
  updatedAt: string | null;
}

export interface BlogHeroData {
  title: string;
  subtitle: string;
  backgroundImage?: string;
}

export interface RecentPostsConfig {
  sectionLabel: string;
  heading: string;
  postCount: number;
}

export interface BlogSidebarAwardImage {
  src: string;
  alt: string;
}

export interface BlogSidebarData {
  attorneyImage: string;
  awardImages: BlogSidebarAwardImage[];
}

export interface PracticeSharedSections {
  whyChooseUs: Partial<AboutPageContent["whyChooseUs"]> | null;
  cta: Partial<AboutPageContent["cta"]> | null;
}

interface SiteSettingsRow {
  site_name?: string | null;
  logo_url?: string | null;
  logo_alt?: string | null;
  favicon_source_url?: string | null;
  favicon_assets?: FaviconAssets | Record<string, unknown> | null;
  phone_number?: string | null;
  phone_display?: string | null;
  phone_availability?: string | null;
  apply_phone_globally?: boolean | null;
  header_cta_text?: string | null;
  header_cta_url?: string | null;
  navigation_items?: SiteSettings["navigationItems"] | null;
  footer_about_links?: SiteSettings["footerAboutLinks"] | null;
  footer_practice_links?: SiteSettings["footerPracticeLinks"] | null;
  footer_resources_heading?: string | null;
  footer_practice_areas_heading?: string | null;
  footer_tagline_html?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  map_embed_url?: string | null;
  social_links?: SiteSettings["socialLinks"] | null;
  copyright_text?: string | null;
  site_url?: string | null;
  site_noindex?: boolean | null;
  ga4_measurement_id?: string | null;
  google_ads_id?: string | null;
  google_ads_conversion_label?: string | null;
  head_scripts?: string | null;
  footer_scripts?: string | null;
  global_schema?: string | null;
}

interface BlogSidebarRow {
  attorney_image?: string | null;
  award_images?: BlogSidebarAwardImage[] | null;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "",
  logoUrl: "",
  logoAlt: "",
  faviconSourceUrl: "",
  faviconAssets: null,
  phoneNumber: "",
  phoneDisplay: "",
  phoneAvailability: "",
  applyPhoneGlobally: true,
  headerCtaText: "",
  headerCtaUrl: "",
  navigationItems: [],
  footerAboutLinks: [],
  footerPracticeLinks: [],
  footerResourcesHeading: "",
  footerPracticeAreasHeading: "",
  footerTaglineHtml: "",
  addressLine1: "",
  addressLine2: "",
  mapEmbedUrl: "",
  socialLinks: [],
  copyrightText: "",
  siteUrl: "",
  siteNoindex: false,
  ga4MeasurementId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  headScripts: "",
  footerScripts: "",
  globalSchema: "",
};

export const DEFAULT_BLOG_HERO: BlogHeroData = {
  title: "",
  subtitle: "",
};

export const DEFAULT_RECENT_POSTS_CONFIG: RecentPostsConfig = {
  sectionLabel: "",
  heading: "",
  postCount: 6,
};

export const DEFAULT_BLOG_SIDEBAR: BlogSidebarData = {
  attorneyImage: "",
  awardImages: [],
};

const HOME_CONTENT_KEYS: (keyof HomePageContent)[] = [
  "hero",
  "partnerLogos",
  "about",
  "practiceAreasIntro",
  "practiceAreas",
  "awards",
  "testimonials",
  "process",
  "googleReviews",
  "faq",
  "contact",
];

const ABOUT_CONTENT_KEYS: (keyof AboutPageContent)[] = [
  "hero",
  "story",
  "missionVision",
  "team",
  "values",
  "stats",
  "whyChooseUs",
  "cta",
];

const CONTACT_CONTENT_KEYS: (keyof ContactPageContent)[] = [
  "hero",
  "contactMethods",
  "form",
  "officeHours",
  "process",
  "visitOffice",
  "cta",
];

const PRACTICE_AREAS_CONTENT_KEYS: (keyof PracticeAreasPageContent)[] = [
  "hero",
  "grid",
  "whyChoose",
  "cta",
];

const PRACTICE_AREA_CONTENT_KEYS: (keyof PracticeAreaPageContent)[] = [
  "hero",
  "socialProof",
  "contentSections",
  "faq",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasAnyKnownKeys(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return isRecord(value) && keys.some((key) => key in value);
}

function normalizePageMetaImageInput(value: unknown): PageMetaImageInput {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return null;
  }

  return {
    url: typeof value.url === "string" ? value.url : null,
    secureUrl: typeof value.secureUrl === "string" ? value.secureUrl : null,
    width: typeof value.width === "number" ? value.width : null,
    height: typeof value.height === "number" ? value.height : null,
    alt: typeof value.alt === "string" ? value.alt : null,
    type: typeof value.type === "string" ? value.type : null,
  };
}

export function isHomePageContentShape(content: unknown): content is Partial<HomePageContent> {
  return hasAnyKnownKeys(content, HOME_CONTENT_KEYS);
}

export function isAboutPageContentShape(content: unknown): content is Partial<AboutPageContent> {
  return hasAnyKnownKeys(content, ABOUT_CONTENT_KEYS);
}

export function isContactPageContentShape(content: unknown): content is Partial<ContactPageContent> {
  return hasAnyKnownKeys(content, CONTACT_CONTENT_KEYS);
}

export function isPracticeAreasPageContentShape(content: unknown): content is Partial<PracticeAreasPageContent> {
  return hasAnyKnownKeys(content, PRACTICE_AREAS_CONTENT_KEYS);
}

export function isPracticeAreaPageContentShape(content: unknown): content is Partial<PracticeAreaPageContent> {
  return hasAnyKnownKeys(content, PRACTICE_AREA_CONTENT_KEYS);
}

export function isContentBlockArray(content: unknown): content is ContentBlock[] {
  return Array.isArray(content) && content.every((item) => isRecord(item) && typeof item.type === "string");
}

export function isRenderablePageContent(content: unknown): content is ContentBlock[] | Record<string, unknown> | null {
  return content == null || isContentBlockArray(content) || isRecord(content);
}

export function isPreloadedPostDocumentShape(value: unknown): value is PreloadedPostDocument {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.title === "string"
    && typeof value.slug === "string";
}

export function normalizeHomePageContent(content: unknown): HomePageContent {
  return isHomePageContentShape(content) ? mergeHomeContentWithDefaults(content) : defaultHomeContent;
}

export function normalizeAboutPageContent(content: unknown): AboutPageContent {
  return isAboutPageContentShape(content) ? mergeAboutContentWithDefaults(content) : defaultAboutContent;
}

export function normalizeContactPageContent(content: unknown): ContactPageContent {
  return isContactPageContentShape(content) ? mergeContactContentWithDefaults(content) : defaultContactContent;
}

export function normalizePracticeAreasPageContent(content: unknown): PracticeAreasPageContent {
  return isPracticeAreasPageContentShape(content) ? mergePracticeAreasContentWithDefaults(content) : defaultPracticeAreasContent;
}

export function normalizePracticeAreaPageContent(content: unknown): PracticeAreaPageContent {
  return isPracticeAreaPageContentShape(content) ? mergePracticeAreaPageContentWithDefaults(content) : defaultPracticeAreaPageContent;
}

export function normalizeCmsUrlPath(pathname: string): string {
  if (!pathname) {
    return "/";
  }

  const pathOnly = pathname.startsWith("http://") || pathname.startsWith("https://")
    ? new URL(pathname).pathname
    : pathname;

  if (pathOnly === "/") {
    return "/";
  }

  return `${pathOnly.replace(/\/+$/, "")}/`;
}

export function normalizePostSlug(slug: string): string {
  return slug.replace(/^\/+|\/+$/g, "");
}

export function normalizeStoredPostSlug(slug: string): string {
  const normalized = normalizePostSlug(slug);
  return normalized ? `${normalized}/` : "";
}

export function isBlogPostPath(urlPath: string): boolean {
  return /^\/blog\/[^/]+\/$/.test(normalizeCmsUrlPath(urlPath));
}

export function isPracticeAreaDetailPath(urlPath: string): boolean {
  return /^\/practice-areas\/[^/]+\/$/.test(normalizeCmsUrlPath(urlPath)) && normalizeCmsUrlPath(urlPath) !== "/practice-areas/";
}

export function shapePageMeta(row?: CmsPageRow | CmsPostRow | null): PageMeta {
  if (!row) {
    return emptyPageMeta;
  }

  return {
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    canonical_url: row.canonical_url ?? null,
    og_title: row.og_title ?? null,
    og_description: row.og_description ?? null,
    og_image: normalizePageMetaImageInput(row.og_image),
    noindex: row.noindex ?? false,
    schema_type: row.schema_type ?? null,
    schema_data: row.schema_data ?? null,
  };
}

export function shapeSiteSettings(row?: SiteSettingsRow | null): SiteSettings {
  if (!row) {
    return DEFAULT_SITE_SETTINGS;
  }

  return {
    siteName: row.site_name || DEFAULT_SITE_SETTINGS.siteName,
    logoUrl: row.logo_url || DEFAULT_SITE_SETTINGS.logoUrl,
    logoAlt: row.logo_alt || DEFAULT_SITE_SETTINGS.logoAlt,
    faviconSourceUrl: row.favicon_source_url || DEFAULT_SITE_SETTINGS.faviconSourceUrl,
    faviconAssets: normalizeFaviconAssets(row.favicon_assets) || DEFAULT_SITE_SETTINGS.faviconAssets,
    phoneNumber: row.phone_number || DEFAULT_SITE_SETTINGS.phoneNumber,
    phoneDisplay: row.phone_display || DEFAULT_SITE_SETTINGS.phoneDisplay,
    phoneAvailability: row.phone_availability || DEFAULT_SITE_SETTINGS.phoneAvailability,
    applyPhoneGlobally: row.apply_phone_globally ?? DEFAULT_SITE_SETTINGS.applyPhoneGlobally,
    headerCtaText: row.header_cta_text || DEFAULT_SITE_SETTINGS.headerCtaText,
    headerCtaUrl: row.header_cta_url || DEFAULT_SITE_SETTINGS.headerCtaUrl,
    navigationItems: row.navigation_items?.length ? row.navigation_items : DEFAULT_SITE_SETTINGS.navigationItems,
    footerAboutLinks: row.footer_about_links?.length ? row.footer_about_links : DEFAULT_SITE_SETTINGS.footerAboutLinks,
    footerPracticeLinks: row.footer_practice_links?.length ? row.footer_practice_links : DEFAULT_SITE_SETTINGS.footerPracticeLinks,
    footerResourcesHeading: row.footer_resources_heading || DEFAULT_SITE_SETTINGS.footerResourcesHeading,
    footerPracticeAreasHeading: row.footer_practice_areas_heading || DEFAULT_SITE_SETTINGS.footerPracticeAreasHeading,
    footerTaglineHtml: row.footer_tagline_html || DEFAULT_SITE_SETTINGS.footerTaglineHtml,
    addressLine1: row.address_line1 || DEFAULT_SITE_SETTINGS.addressLine1,
    addressLine2: row.address_line2 || DEFAULT_SITE_SETTINGS.addressLine2,
    mapEmbedUrl: row.map_embed_url || DEFAULT_SITE_SETTINGS.mapEmbedUrl,
    socialLinks: row.social_links?.length ? row.social_links : DEFAULT_SITE_SETTINGS.socialLinks,
    copyrightText: row.copyright_text || DEFAULT_SITE_SETTINGS.copyrightText,
    siteUrl: row.site_url || DEFAULT_SITE_SETTINGS.siteUrl,
    siteNoindex: row.site_noindex ?? DEFAULT_SITE_SETTINGS.siteNoindex,
    ga4MeasurementId: row.ga4_measurement_id || DEFAULT_SITE_SETTINGS.ga4MeasurementId,
    googleAdsId: row.google_ads_id || DEFAULT_SITE_SETTINGS.googleAdsId,
    googleAdsConversionLabel: row.google_ads_conversion_label || DEFAULT_SITE_SETTINGS.googleAdsConversionLabel,
    headScripts: row.head_scripts || DEFAULT_SITE_SETTINGS.headScripts,
    footerScripts: row.footer_scripts || DEFAULT_SITE_SETTINGS.footerScripts,
    globalSchema: row.global_schema || DEFAULT_SITE_SETTINGS.globalSchema,
  };
}

export function shapeGenericPageDocument<TContent = unknown>(row: CmsPageRow | null, urlPath: string): PreloadedPageDocument<TContent> | null {
  if (!row) {
    return null;
  }

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || urlPath),
    title: row.title || "",
    pageType: row.page_type ?? null,
    content: (row.content ?? null) as TContent,
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function extractPracticeSharedSections(aboutContent?: Partial<AboutPageContent> | null): PracticeSharedSections | null {
  if (!aboutContent?.whyChooseUs && !aboutContent?.cta) {
    return null;
  }

  return {
    whyChooseUs: aboutContent.whyChooseUs ?? null,
    cta: aboutContent.cta ?? null,
  };
}

export function mergeHomeContentWithDefaults(cmsContent: Partial<HomePageContent> | null | undefined, defaults: HomePageContent = defaultHomeContent): HomePageContent {
  if (!cmsContent) {
    return defaults;
  }

  return {
    hero: { ...defaults.hero, ...cmsContent.hero },
    partnerLogos: cmsContent.partnerLogos?.length ? cmsContent.partnerLogos : defaults.partnerLogos,
    about: {
      ...defaults.about,
      ...cmsContent.about,
      features: cmsContent.about?.features?.length ? cmsContent.about.features : defaults.about.features,
      stats: cmsContent.about?.stats?.length ? cmsContent.about.stats : defaults.about.stats,
    },
    practiceAreasIntro: {
      ...defaults.practiceAreasIntro,
      ...cmsContent.practiceAreasIntro,
    },
    practiceAreas: cmsContent.practiceAreas?.length ? cmsContent.practiceAreas : defaults.practiceAreas,
    awards: {
      ...defaults.awards,
      ...cmsContent.awards,
      logos: cmsContent.awards?.logos?.length ? cmsContent.awards.logos : defaults.awards.logos,
    },
    testimonials: {
      ...defaults.testimonials,
      ...cmsContent.testimonials,
      items: cmsContent.testimonials?.items?.length ? cmsContent.testimonials.items : defaults.testimonials.items,
    },
    process: {
      ...defaults.process,
      ...cmsContent.process,
      steps: cmsContent.process?.steps?.length ? cmsContent.process.steps : defaults.process.steps,
    },
    googleReviews: {
      ...defaults.googleReviews,
      ...cmsContent.googleReviews,
      reviews: cmsContent.googleReviews?.reviews?.length ? cmsContent.googleReviews.reviews : defaults.googleReviews.reviews,
    },
    faq: {
      ...defaults.faq,
      ...cmsContent.faq,
      items: cmsContent.faq?.items?.length ? cmsContent.faq.items : defaults.faq.items,
    },
    contact: { ...defaults.contact, ...cmsContent.contact },
    headingTags: cmsContent.headingTags ?? defaults.headingTags,
  };
}

export function mergeAboutContentWithDefaults(cmsContent: Partial<AboutPageContent> | null | undefined, defaults: AboutPageContent = defaultAboutContent): AboutPageContent {
  if (!cmsContent) {
    return defaults;
  }

  return {
    hero: { ...defaults.hero, ...cmsContent.hero },
    story: {
      ...defaults.story,
      ...cmsContent.story,
      paragraphs: cmsContent.story?.paragraphs?.length ? cmsContent.story.paragraphs : defaults.story.paragraphs,
    },
    missionVision: {
      mission: {
        ...defaults.missionVision.mission,
        ...cmsContent.missionVision?.mission,
      },
      vision: {
        ...defaults.missionVision.vision,
        ...cmsContent.missionVision?.vision,
      },
    },
    team: {
      ...defaults.team,
      ...cmsContent.team,
      members: cmsContent.team?.members?.length ? cmsContent.team.members : defaults.team.members,
    },
    values: {
      ...defaults.values,
      ...cmsContent.values,
      items: cmsContent.values?.items?.length ? cmsContent.values.items : defaults.values.items,
    },
    stats: {
      ...defaults.stats,
      ...cmsContent.stats,
      stats: cmsContent.stats?.stats?.length ? cmsContent.stats.stats : defaults.stats.stats,
    },
    whyChooseUs: {
      ...defaults.whyChooseUs,
      ...cmsContent.whyChooseUs,
      items: cmsContent.whyChooseUs?.items?.length ? cmsContent.whyChooseUs.items : defaults.whyChooseUs.items,
    },
    cta: {
      ...defaults.cta,
      ...cmsContent.cta,
      primaryButton: {
        ...defaults.cta.primaryButton,
        ...cmsContent.cta?.primaryButton,
      },
      secondaryButton: {
        ...defaults.cta.secondaryButton,
        ...cmsContent.cta?.secondaryButton,
      },
    },
    headingTags: cmsContent.headingTags ?? defaults.headingTags,
  };
}

export function mergeContactContentWithDefaults(cmsContent: Partial<ContactPageContent> | null | undefined, defaults: ContactPageContent = defaultContactContent): ContactPageContent {
  if (!cmsContent) {
    return defaults;
  }

  return {
    hero: { ...defaults.hero, ...cmsContent.hero },
    contactMethods: {
      ...defaults.contactMethods,
      ...cmsContent.contactMethods,
      methods: cmsContent.contactMethods?.methods?.length ? cmsContent.contactMethods.methods : defaults.contactMethods.methods,
    },
    form: { ...defaults.form, ...cmsContent.form },
    officeHours: {
      ...defaults.officeHours,
      ...cmsContent.officeHours,
      items: cmsContent.officeHours?.items?.length ? cmsContent.officeHours.items : defaults.officeHours.items,
    },
    process: {
      ...defaults.process,
      ...cmsContent.process,
      steps: cmsContent.process?.steps?.length ? cmsContent.process.steps : defaults.process.steps,
    },
    visitOffice: { ...defaults.visitOffice, ...cmsContent.visitOffice },
    cta: {
      ...defaults.cta,
      ...cmsContent.cta,
      primaryButton: {
        ...defaults.cta.primaryButton,
        ...cmsContent.cta?.primaryButton,
      },
      secondaryButton: {
        ...defaults.cta.secondaryButton,
        ...cmsContent.cta?.secondaryButton,
      },
    },
    headingTags: cmsContent.headingTags ?? defaults.headingTags,
  };
}

export function applyPracticeSharedSectionsToContact(content: ContactPageContent, sharedSections: PracticeSharedSections | null): ContactPageContent {
  if (!sharedSections?.cta) {
    return content;
  }

  return {
    ...content,
    cta: {
      ...content.cta,
      heading: sharedSections.cta.heading || content.cta.heading,
      description: sharedSections.cta.description || content.cta.description,
      primaryButton: {
        ...content.cta.primaryButton,
        ...sharedSections.cta.primaryButton,
      },
      secondaryButton: {
        ...content.cta.secondaryButton,
        ...sharedSections.cta.secondaryButton,
      },
    },
  };
}

export function mergePracticeAreasContentWithDefaults(cmsContent: Partial<PracticeAreasPageContent> | null | undefined, defaults: PracticeAreasPageContent = defaultPracticeAreasContent): PracticeAreasPageContent {
  if (!cmsContent) {
    return defaults;
  }

  return {
    hero: { ...defaults.hero, ...cmsContent.hero },
    grid: {
      ...defaults.grid,
      ...cmsContent.grid,
      areas: cmsContent.grid?.areas?.length ? cmsContent.grid.areas : defaults.grid.areas,
    },
    whyChoose: {
      ...defaults.whyChoose,
      ...cmsContent.whyChoose,
      items: cmsContent.whyChoose?.items?.length ? cmsContent.whyChoose.items : defaults.whyChoose.items,
    },
    cta: {
      ...defaults.cta,
      ...cmsContent.cta,
      primaryButton: {
        ...defaults.cta.primaryButton,
        ...cmsContent.cta?.primaryButton,
      },
      secondaryButton: {
        ...defaults.cta.secondaryButton,
        ...cmsContent.cta?.secondaryButton,
      },
    },
    headingTags: cmsContent.headingTags ?? defaults.headingTags,
  };
}

export function applyPracticeSharedSectionsToPracticeAreas(content: PracticeAreasPageContent, sharedSections: PracticeSharedSections | null): PracticeAreasPageContent {
  let mergedContent = content;

  if (sharedSections?.whyChooseUs) {
    mergedContent = {
      ...mergedContent,
      whyChoose: {
        sectionLabel: sharedSections.whyChooseUs.sectionLabel || mergedContent.whyChoose.sectionLabel,
        heading: sharedSections.whyChooseUs.heading || mergedContent.whyChoose.heading,
        subtitle: mergedContent.whyChoose.subtitle,
        description: sharedSections.whyChooseUs.description || mergedContent.whyChoose.description,
        image: sharedSections.whyChooseUs.image || mergedContent.whyChoose.image,
        imageAlt: sharedSections.whyChooseUs.imageAlt || mergedContent.whyChoose.imageAlt,
        items: sharedSections.whyChooseUs.items?.length ? sharedSections.whyChooseUs.items : mergedContent.whyChoose.items,
      },
    };
  }

  if (sharedSections?.cta) {
    mergedContent = {
      ...mergedContent,
      cta: {
        ...mergedContent.cta,
        heading: sharedSections.cta.heading || mergedContent.cta.heading,
        description: sharedSections.cta.description || mergedContent.cta.description,
        primaryButton: {
          ...mergedContent.cta.primaryButton,
          ...sharedSections.cta.primaryButton,
        },
        secondaryButton: {
          ...mergedContent.cta.secondaryButton,
          ...sharedSections.cta.secondaryButton,
        },
      },
    };
  }

  return mergedContent;
}

export function mergePracticeAreaPageContentWithDefaults(cmsContent: Partial<PracticeAreaPageContent> | null | undefined, defaults: PracticeAreaPageContent = defaultPracticeAreaPageContent): PracticeAreaPageContent {
  if (!cmsContent) {
    return defaults;
  }

  return {
    hero: { ...defaults.hero, ...cmsContent.hero },
    socialProof: {
      ...defaults.socialProof,
      ...cmsContent.socialProof,
      testimonials: cmsContent.socialProof?.testimonials?.length ? cmsContent.socialProof.testimonials : defaults.socialProof.testimonials,
      awards: {
        ...defaults.socialProof.awards,
        ...cmsContent.socialProof?.awards,
        logos: cmsContent.socialProof?.awards?.logos?.length ? cmsContent.socialProof.awards.logos : defaults.socialProof.awards.logos,
      },
    },
    contentSections: normalizePracticeAreaContentSections(
      cmsContent.contentSections?.length
        ? cmsContent.contentSections
        : defaults.contentSections,
    ),
    faq: {
      ...defaults.faq,
      ...cmsContent.faq,
      items: cmsContent.faq?.items?.length ? cmsContent.faq.items : defaults.faq.items,
    },
    headingTags: cmsContent.headingTags ?? defaults.headingTags,
  };
}

export function shapeHomePageDocument(row: CmsPageRow | null): PreloadedPageDocument<HomePageContent> | null {
  if (!row) {
    return null;
  }

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || "/"),
    title: row.title || "",
    content: normalizeHomePageContent(row.content),
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function shapeAboutPageDocument(row: CmsPageRow | null): PreloadedPageDocument<AboutPageContent> | null {
  if (!row) {
    return null;
  }

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || "/about/"),
    title: row.title || "",
    content: normalizeAboutPageContent(row.content),
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function shapeContactPageDocument(row: CmsPageRow | null, sharedSections: PracticeSharedSections | null = null): PreloadedPageDocument<ContactPageContent> | null {
  if (!row) {
    return null;
  }

  const content = applyPracticeSharedSectionsToContact(
    normalizeContactPageContent(row.content),
    sharedSections,
  );

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || "/contact/"),
    title: row.title || "",
    content,
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function shapePracticeAreasPageDocument(row: CmsPageRow | null, sharedSections: PracticeSharedSections | null = null): PreloadedPageDocument<PracticeAreasPageContent> | null {
  if (!row) {
    return null;
  }

  const content = applyPracticeSharedSectionsToPracticeAreas(
    normalizePracticeAreasPageContent(row.content),
    sharedSections,
  );

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || "/practice-areas/"),
    title: row.title || "",
    content,
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function shapePracticeAreaPageDocument(row: CmsPageRow | null, fallbackUrlPath: string): PreloadedPageDocument<PracticeAreaPageContent> | null {
  if (!row) {
    return null;
  }

  return {
    urlPath: normalizeCmsUrlPath(row.url_path || fallbackUrlPath),
    title: row.title || "",
    pageType: row.page_type ?? null,
    content: normalizePracticeAreaPageContent(row.content),
    meta: shapePageMeta(row),
    publishedAt: row.published_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

export function shapeBlogIndexView(document: PreloadedPageDocument<ContentBlock[] | null> | null) {
  let hero = DEFAULT_BLOG_HERO;
  let recentPosts = DEFAULT_RECENT_POSTS_CONFIG;

  const blocks = document?.content;
  if (isContentBlockArray(blocks)) {
    const heroBlock = blocks.find((block) => block.type === "hero");
    const recentPostsBlock = blocks.find((block) => block.type === "recent-posts");

    if (heroBlock?.type === "hero") {
      hero = {
        title: heroBlock.sectionLabel || DEFAULT_BLOG_HERO.title,
        subtitle: heroBlock.tagline || DEFAULT_BLOG_HERO.subtitle,
        backgroundImage: heroBlock.backgroundImage,
      };
    }

    if (recentPostsBlock?.type === "recent-posts") {
      recentPosts = {
        sectionLabel: recentPostsBlock.sectionLabel || DEFAULT_RECENT_POSTS_CONFIG.sectionLabel,
        heading: recentPostsBlock.heading || DEFAULT_RECENT_POSTS_CONFIG.heading,
        postCount: recentPostsBlock.postCount || DEFAULT_RECENT_POSTS_CONFIG.postCount,
      };
    }
  }

  return {
    hero,
    recentPosts,
    meta: document?.meta ?? emptyPageMeta,
  };
}

export function shapeBlogSidebar(row?: BlogSidebarRow | null): BlogSidebarData {
  if (!row) {
    return DEFAULT_BLOG_SIDEBAR;
  }

  return {
    attorneyImage: row.attorney_image || "",
    awardImages: Array.isArray(row.award_images) ? row.award_images : [],
  };
}

export function shapePostDocument(row: CmsPostRow | null): PreloadedPostDocument | null {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body ?? null,
    excerpt: row.excerpt ?? null,
    featured_image: row.featured_image ?? null,
    category_id: row.category_id ?? null,
    meta_title: row.meta_title ?? null,
    meta_description: row.meta_description ?? null,
    canonical_url: row.canonical_url ?? null,
    og_title: row.og_title ?? null,
    og_description: row.og_description ?? null,
    og_image: normalizePageMetaImageInput(row.og_image),
    noindex: row.noindex ?? false,
    published_at: row.published_at ?? null,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    post_categories: row.post_categories ?? null,
  };
}

export function filterRecentPosts(posts: PreloadedPostDocument[], excludeId?: string, limit = 3) {
  const filtered = excludeId ? posts.filter((post) => post.id !== excludeId) : posts;
  return filtered.slice(0, limit);
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  const row = await fetchRestSingle<SiteSettingsRow>("site_settings_public?settings_key=eq.global&select=*");
  return shapeSiteSettings(row);
}

export async function loadAboutSharedSections(): Promise<PracticeSharedSections | null> {
  const aboutRow = await fetchPublishedPageRow("/about/", "content");
  const aboutContent = aboutRow ? normalizeAboutPageContent(aboutRow.content) : null;
  return extractPracticeSharedSections(aboutContent);
}

const PAGE_PUBLIC_SELECT = "title,url_path,content,meta_title,meta_description,canonical_url,og_title,og_description,og_image,noindex,schema_type,schema_data,published_at,updated_at";
const PAGE_PUBLIC_WITH_TYPE_SELECT = "title,url_path,page_type,content,meta_title,meta_description,canonical_url,og_title,og_description,og_image,noindex,schema_type,schema_data,published_at,updated_at";

export async function loadHomePageDocument() {
  const row = await fetchPublishedPageRow("/", PAGE_PUBLIC_SELECT);
  return shapeHomePageDocument(row);
}

export async function loadAboutPageDocument() {
  const row = await fetchPublishedPageRow("/about/", PAGE_PUBLIC_SELECT);
  return shapeAboutPageDocument(row);
}

export async function loadContactPageDocument() {
  const [row, sharedSections] = await Promise.all([
    fetchPublishedPageRow("/contact/", PAGE_PUBLIC_SELECT),
    loadAboutSharedSections(),
  ]);

  return {
    document: shapeContactPageDocument(row, sharedSections),
    sharedSections,
  };
}

export async function loadPracticeAreasPageDocument() {
  const [row, sharedSections] = await Promise.all([
    fetchPublishedPageRow("/practice-areas/", PAGE_PUBLIC_SELECT),
    loadAboutSharedSections(),
  ]);

  return {
    document: shapePracticeAreasPageDocument(row, sharedSections),
    sharedSections,
  };
}

export async function loadPracticeAreaPageDocument(urlPath: string) {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  const row = await fetchPublishedPageRow(normalizedPath, PAGE_PUBLIC_WITH_TYPE_SELECT);
  return shapePracticeAreaPageDocument(row, normalizedPath);
}

export async function loadBlogIndexPageDocument() {
  const row = await fetchPublishedPageRow("/blog/", PAGE_PUBLIC_SELECT);
  const document = shapeGenericPageDocument<ContentBlock[] | null>(row, "/blog/");
  return {
    document,
    view: shapeBlogIndexView(document),
  };
}

export async function loadDynamicPageDocument(urlPath: string) {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  const row = await fetchPublishedPageRow(normalizedPath, PAGE_PUBLIC_WITH_TYPE_SELECT);
  return shapeGenericPageDocument(row, normalizedPath);
}

export async function loadBlogPostDocument(slug: string) {
  const normalizedSlug = normalizeStoredPostSlug(slug);
  if (!normalizedSlug) {
    return null;
  }

  const row = await fetchRestSingle<CmsPostRow>(`posts?slug=eq.${encodeURIComponent(normalizedSlug)}&status=eq.published&select=id,title,slug,body,excerpt,featured_image,category_id,meta_title,meta_description,canonical_url,og_title,og_description,og_image,noindex,published_at,created_at,updated_at,post_categories(name,slug)&limit=1`);
  return shapePostDocument(row);
}

export async function loadBlogSidebarData() {
  const row = await fetchRestSingle<BlogSidebarRow>("blog_sidebar_settings?select=attorney_image,award_images&limit=1");
  return shapeBlogSidebar(row);
}

export async function loadRecentPosts(limit: number) {
  const rows = await fetchRestRows<CmsPostRow>(`posts?status=eq.published&select=id,title,slug,body,excerpt,featured_image,category_id,meta_title,meta_description,canonical_url,og_title,og_description,og_image,noindex,published_at,created_at,updated_at,post_categories(name,slug)&order=published_at.desc&limit=${limit}`);
  return rows.map((row) => shapePostDocument(row)).filter(Boolean) as PreloadedPostDocument[];
}

async function fetchPublishedPageRow(urlPath: string, select: string) {
  const normalizedPath = normalizeCmsUrlPath(urlPath);
  return fetchRestSingle<CmsPageRow>(`pages?url_path=eq.${encodeURIComponent(normalizedPath)}&status=eq.published&select=${select}`);
}

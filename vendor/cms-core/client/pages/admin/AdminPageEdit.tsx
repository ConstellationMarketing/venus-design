import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Page, ContentBlock } from "@/lib/database.types";
import { defaultHomeContent } from "@site/lib/cms/homePageTypes";
import type { HomePageContent } from "@site/lib/cms/homePageTypes";
import { defaultAboutContent } from "@site/lib/cms/aboutPageTypes";
import type { AboutPageContent } from "@site/lib/cms/aboutPageTypes";
import { defaultContactContent } from "@site/lib/cms/contactPageTypes";
import type { ContactPageContent } from "@site/lib/cms/contactPageTypes";
import { defaultPracticeAreasContent } from "@site/lib/cms/practiceAreasPageTypes";
import type { PracticeAreasPageContent } from "@site/lib/cms/practiceAreasPageTypes";
import {
  defaultPracticeAreaPageContent,
  normalizePracticeAreaContentSections,
} from "@site/lib/cms/practiceAreaPageTypes";
import type { PracticeAreaPageContent } from "@site/lib/cms/practiceAreaPageTypes";
import { clearPracticeAreaPageCache } from "@site/hooks/usePracticeAreaPageContent";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Loader2, ExternalLink, History, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { extractFaqItems, parseSchemaTypes } from "@site/lib/schemaHelpers";
import BlockEditor from "../../components/admin/BlockEditor";
import PageContentEditor from "../../components/admin/PageContentEditor";
import SchemaTypeSelector from "../../components/admin/SchemaTypeSelector";
import SchemaPreview from "../../components/admin/SchemaPreview";
import ImageUploader from "../../components/admin/ImageUploader";
import { clearPageCache } from "../../hooks/usePageContent";
import type { PageKey } from "../../lib/pageContentTypes";
import RevisionPanel, { createPageRevision } from "../../components/admin/RevisionPanel";
import URLChangeRedirectModal from "../../components/admin/URLChangeRedirectModal";
import type { PageRevision } from "@/lib/database.types";
import { triggerRebuild } from "../../lib/triggerRebuild";
import { toast } from "sonner";
import { PublishDateTimeField } from "@site/components/admin/editors/EditorShared";

// Strip trailing slash for path comparisons (except root "/")
function normalizePath(p: string): string {
  return p === "/" ? p : p.replace(/\/+$/, "");
}

function normalizePracticeAreaPageContent(content: unknown): PracticeAreaPageContent {
  const obj = (content && typeof content === "object" && !Array.isArray(content))
    ? content as Partial<PracticeAreaPageContent>
    : {};
  const merged = mergeWithDefaults(obj, defaultPracticeAreaPageContent);
  return {
    ...merged,
    contentSections: normalizePracticeAreaContentSections(merged.contentSections),
  };
}

function getPracticeHeroBackgroundImage(content: unknown): string {
  return normalizePracticeAreaPageContent(content).hero.backgroundImage?.trim() || "";
}

function setPracticeHeroBackgroundImage(
  content: unknown,
  backgroundImage: string,
): PracticeAreaPageContent {
  const normalized = normalizePracticeAreaPageContent(content);
  return {
    ...normalized,
    hero: {
      ...normalized.hero,
      backgroundImage,
    },
  };
}

function syncPracticePageHeroAndFeaturedImage(page: Page): Page {
  if (page.page_type !== "practice") {
    return page;
  }

  const heroImage = getPracticeHeroBackgroundImage(page.content);
  const featuredImage = page.og_image?.trim() || "";
  const syncedImage = heroImage || featuredImage;

  if (!syncedImage && !heroImage && !featuredImage) {
    return page;
  }

  return {
    ...page,
    og_image: syncedImage || null,
    content: setPracticeHeroBackgroundImage(page.content, syncedImage),
  };
}

// Generic deep merge utility for content normalization
function mergeWithDefaults<T extends Record<string, any>>(
  cmsContent: Partial<T> | null | undefined,
  defaults: T,
): T {
  if (!cmsContent) return defaults;

  const result: any = { ...defaults };

  for (const key in defaults) {
    if (cmsContent[key] !== undefined) {
      const defaultValue = defaults[key];
      const cmsValue = cmsContent[key];

      // Handle arrays: use CMS value if it has items, otherwise use defaults
      if (Array.isArray(defaultValue)) {
        result[key] = Array.isArray(cmsValue) && cmsValue.length > 0
          ? cmsValue
          : defaultValue;
      }
      // Handle nested objects: merge recursively
      else if (defaultValue && typeof defaultValue === 'object' && !Array.isArray(defaultValue)) {
        result[key] = { ...defaultValue, ...cmsValue };
      }
      // Primitive values: use CMS value
      else {
        result[key] = cmsValue;
      }
    }
  }

  // Preserve any extra keys from CMS content not present in defaults
  // (e.g. headingTags, future optional fields)
  for (const key in cmsContent) {
    if (!(key in defaults) && cmsContent[key] !== undefined) {
      result[key] = cmsContent[key];
    }
  }

  return result as T;
}

export default function AdminPageEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState<Page | null>(null);
  const [activeTab, setActiveTab] = useState("content");
  const [originalUrlPath, setOriginalUrlPath] = useState<string>("");
  const [previousStatus, setPreviousStatus] = useState<string>("");
  const [previousNoindex, setPreviousNoindex] = useState<boolean>(false);
  const [showRedirectModal, setShowRedirectModal] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    if (id) {
      fetchPage();
    }
  }, [id]);

  const fetchPage = async () => {
    const { data, error } = await supabase
      .from("pages")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching page:", error);
      navigate("/admin/pages");
      return;
    }

    setPage(data);
    setOriginalUrlPath(data.url_path);
    setPreviousStatus(data.status);
    setPreviousNoindex(data.noindex ?? false);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!page) return;

    // Check if URL path changed and prompt for redirect
    if (page.url_path !== originalUrlPath && originalUrlPath !== "") {
      setPendingSave(true);
      setShowRedirectModal(true);
      return;
    }

    await performSave();
  };

  const performSave = async () => {
    if (!page) return;
    setSaving(true);

    const pageToSave = syncPracticePageHeroAndFeaturedImage(page);

    // Auto-create revision on every save (captures state before the new save)
    await createPageRevision(page);

    // Normalize URL path to always include trailing slash
    const normalizedSaveUrlPath = pageToSave.url_path === '/'
      ? '/'
      : pageToSave.url_path.replace(/\/+$/, '') + '/';

    const { error } = await supabase
      .from("pages")
      .update({
        title: pageToSave.title,
        url_path: normalizedSaveUrlPath,
        page_type: pageToSave.page_type,
        content: pageToSave.content as unknown,
        meta_title: pageToSave.meta_title,
        meta_description: pageToSave.meta_description,
        canonical_url: pageToSave.canonical_url,
        og_title: pageToSave.og_title,
        og_description: pageToSave.og_description,
        og_image: pageToSave.og_image,
        noindex: pageToSave.noindex,
        schema_type: pageToSave.schema_type,
        schema_data: pageToSave.schema_data,
        status: pageToSave.status,
        published_at:
          pageToSave.status === "published" && !pageToSave.published_at
            ? new Date().toISOString()
            : pageToSave.published_at,
      } as Record<string, unknown>)
      .eq("id", page.id);

    if (error) {
      console.error("Error saving page:", error);
      toast.error("Failed to save page: " + error.message);
    } else {
      // Clear the page cache so the frontend fetches fresh content
      const savedNormPath = normalizePath(pageToSave.url_path);
      if (savedNormPath === "/" || savedNormPath === "/about" || savedNormPath === "/contact" || savedNormPath === "/practice-areas") {
        clearPageCache(savedNormPath as PageKey);
      }
      // Clear individual practice area page cache
      if (pageToSave.url_path?.startsWith("/practice-areas/")) {
        const slug = pageToSave.url_path.replace("/practice-areas/", "");
        clearPracticeAreaPageCache(slug);
      }
      // Update tracking state after successful save with normalized path
      setPage(prev => prev ? { ...pageToSave, url_path: normalizedSaveUrlPath } : prev);
      setOriginalUrlPath(normalizedSaveUrlPath);
      setPreviousStatus(pageToSave.status);

      // Trigger rebuild if noindex changed on a published page
      // (draft pages are not in the SSG output, so no rebuild needed)
      if (previousNoindex !== pageToSave.noindex && pageToSave.status === "published") {
        triggerRebuild().then((result) => {
          if (result.ok) {
            toast.success("Page saved. Site rebuild triggered — changes will be live after the deploy completes.");
          } else {
            toast.error(`Page saved, but the rebuild could not be triggered automatically. Please deploy manually. (${result.error})`);
          }
        });
      } else {
        toast.success("Page saved successfully!");
      }

      setPreviousNoindex(pageToSave.noindex ?? false);
      setPendingSave(false);
    }
    setSaving(false);
  };

  const updatePage = (updates: Partial<Page>) => {
    if (!page) return;
    setPage({ ...page, ...updates });
  };

  const handleContentChange = (content: ContentBlock[]) => {
    updatePage({ content });
  };

  const handleRestoreRevision = (revision: PageRevision) => {
    if (!page) return;
    setPage({
      ...page,
      title: revision.title,
      url_path: revision.url_path,
      page_type: revision.page_type,
      content: revision.content,
      meta_title: revision.meta_title,
      meta_description: revision.meta_description,
      canonical_url: revision.canonical_url,
      og_title: revision.og_title,
      og_description: revision.og_description,
      og_image: revision.og_image,
      noindex: revision.noindex,
      status: revision.status,
    });
    setActiveTab("content");
    toast.info("Revision restored! Don't forget to save the page.");
  };

  const handleRedirectModalClose = () => {
    setShowRedirectModal(false);
    setPendingSave(false);
  };

  const handleRedirectConfirm = async () => {
    setShowRedirectModal(false);
    await performSave();
  };

  const normalizedUrlPath = page?.url_path ? normalizePath(page.url_path) : "";

  // Stable numeric IDs for structured pages — never changes even when the URL/slug changes
  const STRUCTURED_PAGE_IDS = {
    HOME: 1,
    ABOUT: 2,
    CONTACT: 3,
    PRACTICE_LISTING: 4,
  };

  // Check if this is a structured page using stable page_id (not URL path)
  const isPracticeAreaPage = page?.page_type === "practice";

  const isStructuredPage =
    Object.values(STRUCTURED_PAGE_IDS).includes(page?.page_id as number) ||
    isPracticeAreaPage;

  // Normalize content by merging with defaults based on page type
  const normalizedContent = useMemo(() => {
    if (!isStructuredPage) return page?.content;
    if (!page?.content && !isPracticeAreaPage) return page?.content;

    // Use stable page_id to determine which defaults to merge
    switch (page.page_id) {
      case 1: // Home
        return mergeWithDefaults(
          page.content as unknown as Partial<HomePageContent>,
          defaultHomeContent
        );
      case 2: // About Us
        return mergeWithDefaults(
          page.content as unknown as Partial<AboutPageContent>,
          defaultAboutContent
        );
      case 3: // Contact
        return mergeWithDefaults(
          page.content as unknown as Partial<ContactPageContent>,
          defaultContactContent
        );
      case 4: // Practice Areas listing
        return mergeWithDefaults(
          page.content as unknown as Partial<PracticeAreasPageContent>,
          defaultPracticeAreasContent
        );
      default:
        // Individual practice area pages (detected by page_type)
        if (isPracticeAreaPage) {
          const normalized = normalizePracticeAreaPageContent(page.content);
          if (!normalized.hero.backgroundImage && page.og_image) {
            return setPracticeHeroBackgroundImage(normalized, page.og_image);
          }
          return normalized;
        }
        return page.content;
    }
  }, [page?.content, page?.page_id, page?.page_type, page?.og_image, isStructuredPage]);

  // Detect FAQ items in current page content for the SEO tab notice
  const faqItems = useMemo(
    () => (page ? extractFaqItems(page.content) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page?.content],
  );
  const hasExplicitFaqSchema = parseSchemaTypes(page?.schema_type).includes("FAQPage");

  const handleStructuredContentChange = (content: unknown) => {
    if (isPracticeAreaPage) {
      updatePage({
        content: content as ContentBlock[],
        og_image: getPracticeHeroBackgroundImage(content) || null,
      });
      return;
    }

    updatePage({ content: content as ContentBlock[] });
  };

  const updateFeaturedImage = (url: string) => {
    if (isPracticeAreaPage) {
      updatePage({
        og_image: url || null,
        content: setPracticeHeroBackgroundImage(page?.content, url) as unknown as ContentBlock[],
      });
      return;
    }

    updatePage({ og_image: url });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!page) {
    return <div>Page not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/pages">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{page.title}</h1>
              <Badge
                variant={page.status === "published" ? "default" : "secondary"}
              >
                {page.status}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">{page.url_path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {page.status === "published" && (
            <a href={page.url_path} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Live
              </Button>
            </a>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="seo">SEO & Meta</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="revisions">
            <History className="h-4 w-4 mr-2" />
            Revisions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            {isStructuredPage ? (
              <div>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Structured Page Editor:</strong> This page uses a
                    structured content format. Edit each section below to update
                    the page content while preserving the design.
                  </p>
                </div>
                <PageContentEditor
                  pageId={page.page_id}
                  pageKey={normalizedUrlPath}
                  content={normalizedContent}
                  onChange={handleStructuredContentChange}
                  pageType={page.page_type}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Page Content</CardTitle>
                  <CardDescription>
                    Add and arrange content blocks for this page
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <BlockEditor
                    content={page.content as ContentBlock[]}
                    onChange={handleContentChange}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="seo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Meta Tags</CardTitle>
              <CardDescription>
                Optimize your page for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={page.meta_title || ""}
                  onChange={(e) => updatePage({ meta_title: e.target.value })}
                  placeholder="Page Title | Your Site Name"
                />
                <p className="text-sm text-gray-500">
                  {(page.meta_title || "").length}/60 characters recommended
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={page.meta_description || ""}
                  onChange={(e) =>
                    updatePage({ meta_description: e.target.value })
                  }
                  placeholder="A brief description of this page..."
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {(page.meta_description || "").length}/160 characters
                  recommended
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
                <Input
                  id="canonicalUrl"
                  value={page.canonical_url || ""}
                  onChange={(e) =>
                    updatePage({ canonical_url: e.target.value })
                  }
                  placeholder={siteSettings.siteUrl ? `${siteSettings.siteUrl}${page.url_path}` : "https://yourdomain.com/page"}
                />
              </div>

              <hr />

              <h3 className="text-lg font-semibold">
                Open Graph (Social Sharing)
              </h3>

              <div className="space-y-2">
                <Label htmlFor="ogTitle">OG Title</Label>
                <Input
                  id="ogTitle"
                  value={page.og_title || ""}
                  onChange={(e) => updatePage({ og_title: e.target.value })}
                  placeholder="Leave blank to use Meta Title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={page.og_description || ""}
                  onChange={(e) =>
                    updatePage({ og_description: e.target.value })
                  }
                  placeholder="Leave blank to use Meta Description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{isPracticeAreaPage ? "Featured / Social Image" : "OG / Social Image"}</Label>
                <p className="text-sm text-gray-500 mb-2">
                  {isPracticeAreaPage
                    ? "For practice area pages, this image is synced with the hero background image. Updating either field updates the other."
                    : "This image is used for social sharing tags like Open Graph and Twitter cards. It does not control the page hero image."}
                </p>
                <ImageUploader
                  value={page.og_image || ""}
                  onChange={updateFeaturedImage}
                  folder={isPracticeAreaPage ? "practice-areas" : "og-images"}
                  placeholder={isPracticeAreaPage ? "Upload a featured / hero image" : "Upload an image for social sharing"}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={page.noindex}
                  onCheckedChange={(checked) =>
                    updatePage({ noindex: checked })
                  }
                />
                <Label>No Index (hide from search engines)</Label>
              </div>

              <hr />

              <h3 className="text-lg font-semibold">
                Schema.org Structured Data
              </h3>
              <p className="text-sm text-gray-500">
                Add structured data to help search engines understand your
                content
              </p>

              <SchemaTypeSelector
                value={page.schema_type || ""}
                onChange={(v) => updatePage({ schema_type: v || null })}
              />

              {faqItems.length > 0 && (
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <AlertDescription className="text-blue-800 text-sm">
                    <strong>FAQPage schema auto-generated</strong> —{" "}
                    {faqItems.length} FAQ item{faqItems.length !== 1 ? "s" : ""} detected on
                    this page. A{" "}
                    <code className="text-xs bg-blue-100 px-1 rounded">FAQPage</code>{" "}
                    structured data block will be automatically injected into the page{" "}
                    <code className="text-xs bg-blue-100 px-1 rounded">&lt;head&gt;</code>,
                    helping search engines display rich FAQ results.
                    {hasExplicitFaqSchema && (
                      <span className="block mt-1 text-blue-700">
                        FAQPage is also explicitly selected above — this is consistent and correct.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {page.schema_type && (
                <div className="space-y-2">
                  <Label htmlFor="schemaData">Schema Data (JSON)</Label>
                  <Textarea
                    id="schemaData"
                    value={
                      page.schema_data
                        ? JSON.stringify(page.schema_data, null, 2)
                        : ""
                    }
                    onChange={(e) => {
                      try {
                        const parsed = e.target.value
                          ? JSON.parse(e.target.value)
                          : null;
                        updatePage({ schema_data: parsed });
                      } catch {
                        // Allow typing invalid JSON temporarily
                      }
                    }}
                    placeholder='{"name": "Your Firm Name", "telephone": "000-000-0000"}'
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-sm text-gray-500">
                    Additional properties for the Schema.org type (e.g.,
                    address, phone, etc.)
                  </p>
                </div>
              )}

              <SchemaPreview
                schemaType={page.schema_type}
                schemaData={page.schema_data}
                page={page}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
              <CardDescription>
                Configure page properties and publishing status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Page Title</Label>
                <Input
                  id="title"
                  value={page.title}
                  onChange={(e) => updatePage({ title: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urlPath">URL Path</Label>
                <Input
                  id="urlPath"
                  value={page.url_path}
                  onChange={(e) => updatePage({ url_path: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageType">Page Type</Label>
                <Select
                  value={page.page_type}
                  onValueChange={(v) =>
                    updatePage({ page_type: v as Page["page_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard Page</SelectItem>
                    <SelectItem value="practice">Practice Area Page</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={page.status}
                  onValueChange={(v) =>
                    updatePage({ status: v as Page["status"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Only published pages appear on the live site after the next
                  publish
                </p>
              </div>

              <PublishDateTimeField
                id="publishedAt"
                value={page.published_at}
                onChange={(publishedAt) => updatePage({ published_at: publishedAt })}
                helperText="Used for admin records and SEO metadata. Visibility is still controlled by Status, and publishing without a date will use the current time."
              />
              <p className="text-sm text-gray-500">
                Last updated: {new Date(page.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revisions" className="mt-6">
          <RevisionPanel
            pageId={page.id}
            currentPage={page}
            onRestore={handleRestoreRevision}
          />
        </TabsContent>

      </Tabs>

      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-12 px-5 shadow-2xl"
          aria-label="Save page changes"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* URL Change Redirect Modal */}
      <URLChangeRedirectModal
        open={showRedirectModal}
        onClose={handleRedirectModalClose}
        oldPath={originalUrlPath}
        newPath={page.url_path}
        onConfirm={handleRedirectConfirm}
      />
    </div>
  );
}

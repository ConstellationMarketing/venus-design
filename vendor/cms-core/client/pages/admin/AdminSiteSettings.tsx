import { useEffect, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type {
  SiteSettings,
  NavigationItem,
  NavigationChildItem,
  FooterLink,
  SocialLink,
  SiteSettingsRow,
} from "@/lib/siteSettingsTypes";
import {
  DEFAULT_SITE_SETTINGS,
  rowToSiteSettings,
  siteSettingsToRow,
} from "@/lib/siteSettingsTypes";
import { clearSiteSettingsCache } from "@/hooks/useSiteSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Search,
  BarChart3,
  Code,
  AlertTriangle,
  ChevronDown,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import RichTextEditor from "@site/components/admin/RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import { useUserRole } from "../../hooks/useUserRole";
import { triggerRebuild } from "../../lib/triggerRebuild";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import ImageUploader from "@/components/admin/ImageUploader";
import { getFaviconSettingsSignature } from "@site/lib/seo/favicon";
import { processFaviconSource } from "@site/lib/seo/faviconProcessing";

export default function AdminSiteSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [draggingNavIndex, setDraggingNavIndex] = useState<number | null>(null);
  const [originalNoindex, setOriginalNoindex] = useState<boolean>(false);
  const [originalFaviconSignature, setOriginalFaviconSignature] = useState<string>(
    getFaviconSettingsSignature(DEFAULT_SITE_SETTINGS),
  );
  const [faviconProcessing, setFaviconProcessing] = useState(false);
  const [faviconError, setFaviconError] = useState<string | null>(null);
  const [rebuildStatus, setRebuildStatus] = useState<
    { type: "success" | "warning"; message: string } | null
  >(null);
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("settings_key", "global")
      .single();

    if (error) {
      console.error("Error fetching settings:", error);
      // Use defaults if not found
      setLoading(false);
      return;
    }

    if (data) {
      setSettingsId(data.id);
      const parsed = rowToSiteSettings(data as SiteSettingsRow);
      setSettings(parsed);
      setOriginalNoindex(parsed.siteNoindex ?? false);
      setOriginalFaviconSignature(getFaviconSettingsSignature(parsed));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (faviconProcessing) {
      toast.info("Please wait for the favicon assets to finish generating.");
      return;
    }

    if (settings.faviconSourceUrl.trim() && !settings.faviconAssets) {
      toast.error("Generate favicon assets before saving your new favicon.");
      return;
    }

    setSaving(true);

    const rowData = siteSettingsToRow(settings);

    let error;
    if (settingsId) {
      // Update existing
      const result = await supabase
        .from("site_settings")
        .update(rowData)
        .eq("id", settingsId);
      error = result.error;
    } else {
      // Insert new
      const result = await supabase
        .from("site_settings")
        .insert({ ...rowData, settings_key: "global" });
      error = result.error;
    }

    if (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings: " + error.message);
    } else {
      // Clear the cache so components refetch
      clearSiteSettingsCache();

      const nextFaviconSignature = getFaviconSettingsSignature(settings);
      const shouldTriggerRebuild =
        originalNoindex !== settings.siteNoindex
        || originalFaviconSignature !== nextFaviconSignature;

      if (shouldTriggerRebuild) {
        setRebuildStatus(null);
        const result = await triggerRebuild();
        if (result.ok) {
          setRebuildStatus({
            type: "success",
            message:
              "SEO or favicon settings changed — site rebuild triggered. Changes will be live after the deploy completes.",
          });
        } else {
          setRebuildStatus({
            type: "warning",
            message: `Settings saved, but rebuild could not be triggered automatically. Please deploy manually. (${result.error})`,
          });
        }
        setOriginalNoindex(settings.siteNoindex);
        setOriginalFaviconSignature(nextFaviconSignature);
      }

      toast.success("Settings saved successfully!");
      setFaviconError(null);
    }
    setSaving(false);
  };

  const updateSettings = (
    updates: Partial<SiteSettings> | ((current: SiteSettings) => SiteSettings),
  ) => {
    setSettings((current) => (
      typeof updates === "function"
        ? updates(current)
        : { ...current, ...updates }
    ));
  };

  const handleLogoUrlChange = (logoUrl: string) => {
    updateSettings({ logoUrl: logoUrl.trim() });
  };

  const handleFaviconSourceChange = (sourceUrl: string) => {
    const normalizedSourceUrl = sourceUrl.trim();
    setFaviconError(null);
    updateSettings((current) => ({
      ...current,
      faviconSourceUrl: normalizedSourceUrl,
      faviconAssets:
        normalizedSourceUrl && normalizedSourceUrl === current.faviconSourceUrl
          ? current.faviconAssets
          : null,
    }));
  };

  const generateFaviconAssets = async (sourceUrl = settings.faviconSourceUrl) => {
    const normalizedSourceUrl = sourceUrl.trim();

    if (!normalizedSourceUrl) {
      setFaviconError(null);
      updateSettings({ faviconSourceUrl: "", faviconAssets: null });
      return;
    }

    setFaviconProcessing(true);
    setFaviconError(null);

    try {
      const faviconAssets = await processFaviconSource({
        sourceUrl: normalizedSourceUrl,
        siteName: settings.siteName,
      });

      updateSettings({
        faviconSourceUrl: normalizedSourceUrl,
        faviconAssets,
      });
      toast.success("Favicon assets generated successfully!");
    } catch (error) {
      console.error("Error processing favicon:", error);
      const message = error instanceof Error ? error.message : "Failed to process favicon.";
      updateSettings((current) => ({
        ...current,
        faviconSourceUrl: normalizedSourceUrl,
        faviconAssets: null,
      }));
      setFaviconError(message);
      toast.error(message);
    } finally {
      setFaviconProcessing(false);
    }
  };

  // Navigation items handlers
  const addNavItem = () => {
    const newOrder = settings.navigationItems.length + 1;
    updateSettings({
      navigationItems: [
        ...settings.navigationItems,
        { label: "", href: "/", order: newOrder },
      ],
    });
  };

  const updateNavItem = (index: number, updates: Partial<NavigationItem>) => {
    const items = [...settings.navigationItems];
    items[index] = { ...items[index], ...updates };
    updateSettings({ navigationItems: items });
  };

  const removeNavItem = (index: number) => {
    const items = settings.navigationItems.filter((_, i) => i !== index);
    updateSettings({ navigationItems: items });
  };

  const reorderNavItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    updateSettings((current) => ({
      ...current,
      navigationItems: reorderItems(current.navigationItems, fromIndex, toIndex).map(
        (item, itemIndex) => ({ ...item, order: itemIndex + 1 }),
      ),
    }));
  };

  const handleNavDragStart = (event: DragEvent, index: number) => {
    setDraggingNavIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleNavDragOver = (event: DragEvent) => {
    if (draggingNavIndex === null) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleNavDrop = (event: DragEvent, index: number) => {
    if (draggingNavIndex === null) {
      return;
    }

    event.preventDefault();
    reorderNavItems(draggingNavIndex, index);
    setDraggingNavIndex(null);
  };

  // Footer About links handlers
  const addAboutLink = () => {
    updateSettings({
      footerAboutLinks: [...settings.footerAboutLinks, { label: "" }],
    });
  };

  const updateAboutLink = (index: number, updates: Partial<FooterLink>) => {
    const items = [...settings.footerAboutLinks];
    items[index] = { ...items[index], ...updates };
    updateSettings({ footerAboutLinks: items });
  };

  const removeAboutLink = (index: number) => {
    const items = settings.footerAboutLinks.filter((_, i) => i !== index);
    updateSettings({ footerAboutLinks: items });
  };

  // Footer Practice links handlers
  const addPracticeLink = () => {
    updateSettings({
      footerPracticeLinks: [...settings.footerPracticeLinks, { label: "" }],
    });
  };

  const updatePracticeLink = (index: number, updates: Partial<FooterLink>) => {
    const items = [...settings.footerPracticeLinks];
    items[index] = { ...items[index], ...updates };
    updateSettings({ footerPracticeLinks: items });
  };

  const removePracticeLink = (index: number) => {
    const items = settings.footerPracticeLinks.filter((_, i) => i !== index);
    updateSettings({ footerPracticeLinks: items });
  };

  // Social links handlers
  const addSocialLink = () => {
    updateSettings({
      socialLinks: [
        ...settings.socialLinks,
        { platform: "facebook", url: "", enabled: true },
      ],
    });
  };

  const updateSocialLink = (index: number, updates: Partial<SocialLink>) => {
    const items = [...settings.socialLinks];
    items[index] = { ...items[index], ...updates };
    updateSettings({ socialLinks: items });
  };

  const removeSocialLink = (index: number) => {
    const items = settings.socialLinks.filter((_, i) => i !== index);
    updateSettings({ socialLinks: items });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
            <p className="text-gray-500 text-sm">
              Global Header & Footer configuration
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || faviconProcessing}>
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

      {rebuildStatus && (
        <Alert
          className={`flex items-start gap-3 ${
            rebuildStatus.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          {rebuildStatus.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <AlertDescription
            className={`text-sm ${
              rebuildStatus.type === "success"
                ? "text-green-800"
                : "text-amber-800"
            }`}
          >
            {rebuildStatus.type === "success" && (
              <RefreshCw className="inline h-3.5 w-3.5 mr-1 animate-spin" />
            )}
            {rebuildStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="branding">
        <TabsList>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="navigation">Navigation</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="contact">Contact Info</TabsTrigger>
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="analytics">Analytics & Scripts</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Site Name</CardTitle>
              <CardDescription>
                The name of your site, displayed in the admin panel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) => updateSettings({ siteName: e.target.value })}
                  placeholder="Your Site Name"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Your site logo appears in the header and footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Logo Image</Label>
                <ImageUploader
                  value={settings.logoUrl}
                  onChange={handleLogoUrlChange}
                  onSelectAsset={(asset) => {
                    if (asset.suggestedAltText && asset.suggestedAltText !== settings.logoAlt) {
                      updateSettings({ logoAlt: asset.suggestedAltText });
                    }
                  }}
                  folder="site/logos"
                  accept="image/*"
                  preserveOriginal
                  placeholder="Upload or choose a logo from the media library"
                  helperText="PNG, JPG, GIF, SVG, or WebP up to 10MB. You can also browse the media library or paste a URL."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoAlt">Logo Alt Text</Label>
                <Input
                  id="logoAlt"
                  value={settings.logoAlt}
                  onChange={(e) => updateSettings({ logoAlt: e.target.value })}
                  placeholder="Company Name"
                />
                <p className="text-xs text-gray-500">
                  Alt text is filled automatically from the selected media item when available, and you can edit it here.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favicon</CardTitle>
              <CardDescription>
                Displayed in browser tabs, bookmarks, and mobile shortcuts. This stays separate from your social sharing image and site logo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Favicon Source</Label>
                <ImageUploader
                  value={settings.faviconSourceUrl}
                  onChange={handleFaviconSourceChange}
                  onSelectAsset={(asset) => {
                    void generateFaviconAssets(asset.url);
                  }}
                  folder="favicons/source"
                  accept="image/png,image/svg+xml,image/jpeg,image/webp"
                  preserveOriginal
                  placeholder="Upload or choose a square favicon source"
                  helperText="PNG, SVG, JPG, or WebP up to 10MB — square images work best and original formats are preserved."
                />
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                <p className="text-sm text-slate-700">
                  Upload a square PNG or SVG for the best result. The system generates browser and device icon sizes automatically.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void generateFaviconAssets()}
                  disabled={faviconProcessing || !settings.faviconSourceUrl.trim()}
                >
                  {faviconProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating favicon assets...
                    </>
                  ) : settings.faviconAssets ? (
                    "Regenerate favicon assets"
                  ) : (
                    "Generate favicon assets"
                  )}
                </Button>
              </div>

              {faviconError && (
                <Alert className="border-red-200 bg-red-50 text-red-800">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription>{faviconError}</AlertDescription>
                </Alert>
              )}

              {(settings.faviconAssets?.icon32Url || settings.faviconSourceUrl) && (
                <div className="rounded-lg border bg-gray-50 p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900">Preview</p>
                  <div className="flex flex-wrap gap-4">
                    {[16, 32, 64].map((size) => (
                      <div key={size} className="flex flex-col items-center gap-2">
                        <div className="flex items-center justify-center rounded-md border bg-white shadow-sm" style={{ width: Math.max(size + 20, 48), height: Math.max(size + 20, 48) }}>
                          <img
                            src={settings.faviconAssets?.icon32Url || settings.faviconSourceUrl}
                            alt="Favicon preview"
                            style={{ width: size, height: size }}
                            className="rounded-sm object-contain"
                          />
                        </div>
                        <span className="text-xs text-gray-500">{size}×{size}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.faviconAssets && (
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="text-sm font-medium text-gray-900">Generated icon set</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { label: "Source image", url: settings.faviconAssets.sourceUrl },
                      { label: "Browser icon (32×32)", url: settings.faviconAssets.icon32Url },
                      { label: "Apple touch icon (180×180)", url: settings.faviconAssets.appleTouchIconUrl },
                      { label: "App icon (192×192)", url: settings.faviconAssets.manifest192Url },
                      { label: "App icon (512×512)", url: settings.faviconAssets.manifest512Url },
                      ...(settings.faviconAssets.svgUrl
                        ? [{ label: "SVG source icon", url: settings.faviconAssets.svgUrl }]
                        : []),
                    ].map((item) => (
                      <div key={item.label} className="rounded-md border bg-gray-50 p-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {item.label}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-sm text-blue-600 underline"
                        >
                          {item.url}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Header CTA Button</CardTitle>
              <CardDescription>
                The call-to-action button in the header
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="headerCtaText">Button Text</Label>
                <Input
                  id="headerCtaText"
                  value={settings.headerCtaText}
                  onChange={(e) =>
                    updateSettings({ headerCtaText: e.target.value })
                  }
                  placeholder="GET HELP NOW"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="headerCtaUrl">Button URL</Label>
                <Input
                  id="headerCtaUrl"
                  value={settings.headerCtaUrl}
                  onChange={(e) =>
                    updateSettings({ headerCtaUrl: e.target.value })
                  }
                  placeholder="#book"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Copyright Text</CardTitle>
              <CardDescription>Displayed in the footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="copyrightText">Copyright Text</Label>
                <Input
                  id="copyrightText"
                  value={settings.copyrightText}
                  onChange={(e) =>
                    updateSettings({ copyrightText: e.target.value })
                  }
                  placeholder="Copyright © 2017 - {year} | Company Name | All Rights Reserved"
                />
                <p className="text-sm text-gray-500">
                  Use <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{'{year}'}</code> to insert the current year automatically. Example: <span className="italic">Copyright © 2017 - {'{year}'}</span>
                </p>
              </div>
              {settings.copyrightText && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <p className="text-sm text-gray-800">
                    {settings.copyrightText.replace(/\{year\}/gi, String(new Date().getFullYear()))}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Navigation Tab */}
        <TabsContent value="navigation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Navigation Menu</CardTitle>
              <CardDescription>
                Links displayed in the header navigation bar. Drag menu items, dropdown items, or grandchild items to reorder them.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.navigationItems.map((item, index) => (
                <div
                  key={index}
                  onDragOver={handleNavDragOver}
                  onDrop={(event) => handleNavDrop(event, index)}
                  className={`space-y-2 rounded-lg border p-3 transition-colors ${
                    draggingNavIndex === index
                      ? "border-blue-300 bg-blue-50/70 opacity-70"
                      : "border-transparent bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => handleNavDragStart(event, index)}
                      onDragEnd={() => setDraggingNavIndex(null)}
                      className="cursor-grab rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 active:cursor-grabbing"
                      aria-label={`Drag ${item.label || "navigation item"} to reorder`}
                    >
                      <GripVertical className="h-5 w-5" />
                    </button>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <Input
                        value={item.label}
                        onChange={(e) =>
                          updateNavItem(index, { label: e.target.value })
                        }
                        placeholder="Label"
                      />
                      <Input
                        value={item.href}
                        onChange={(e) =>
                          updateNavItem(index, { href: e.target.value })
                        }
                        placeholder="/page-url"
                      />
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={item.openInNewTab || false}
                          onCheckedChange={(checked) =>
                            updateNavItem(index, { openInNewTab: checked })
                          }
                        />
                        <span className="text-sm text-gray-500">New tab</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeNavItem(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <NavigationChildrenEditor
                    navChildren={item.children || []}
                    onChange={(children) => updateNavItem(index, { children })}
                  />
                </div>
              ))}
              <Button variant="outline" onClick={addNavItem} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Navigation Item
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Tab */}
        <TabsContent value="footer" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Footer Tagline</CardTitle>
              <CardDescription>
                Rich text tagline displayed in the footer area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="footerResourcesHeading">Resources Column Title</Label>
                  <Input
                    id="footerResourcesHeading"
                    value={settings.footerResourcesHeading}
                    onChange={(e) => updateSettings({ footerResourcesHeading: e.target.value })}
                    placeholder="Resources"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="footerPracticeAreasHeading">Practice Areas Column Title</Label>
                  <Input
                    id="footerPracticeAreasHeading"
                    value={settings.footerPracticeAreasHeading}
                    onChange={(e) => updateSettings({ footerPracticeAreasHeading: e.target.value })}
                    placeholder="Practice Areas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tagline (HTML)</Label>
                  <RichTextEditor
                    value={settings.footerTaglineHtml}
                    onChange={(html) => updateSettings({ footerTaglineHtml: html })}
                    placeholder="Enter footer tagline..."
                  />
                  <p className="text-xs text-gray-500">
                    Use the <strong>paint brush</strong> button to highlight text with the accent color.
                  </p>
                </div>

                {/* Live preview */}
                {settings.footerTaglineHtml && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Preview (as it appears in footer)</Label>
                    <div className="bg-[#1a1a2e] rounded-lg p-6">
                      <div
                        className="font-playfair text-[24px] md:text-[32px] leading-tight text-white [&_.text-law-accent]:text-[#c8b560]"
                        dangerouslySetInnerHTML={{ __html: settings.footerTaglineHtml }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Column Links</CardTitle>
              <CardDescription>
                Links in the resources section of the footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.footerAboutLinks.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updateAboutLink(index, { label: e.target.value })
                    }
                    placeholder="Link text"
                    className="flex-1"
                  />
                  <Input
                    value={item.href || ""}
                    onChange={(e) =>
                      updateAboutLink(index, {
                        href: e.target.value || undefined,
                      })
                    }
                    placeholder="/page-url (optional)"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAboutLink(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addAboutLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Practice Areas Column Links</CardTitle>
              <CardDescription>
                Links in the "Practice Areas" section of the footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.footerPracticeLinks.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Input
                    value={item.label}
                    onChange={(e) =>
                      updatePracticeLink(index, { label: e.target.value })
                    }
                    placeholder="Link text"
                    className="flex-1"
                  />
                  <Input
                    value={item.href || ""}
                    onChange={(e) =>
                      updatePracticeLink(index, {
                        href: e.target.value || undefined,
                      })
                    }
                    placeholder="/page-url (optional)"
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePracticeLink(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addPracticeLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Link
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Map Embed</CardTitle>
              <CardDescription>
                Google Maps embed URL for the footer map
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="mapEmbedUrl">Map Embed URL</Label>
                <Input
                  id="mapEmbedUrl"
                  value={settings.mapEmbedUrl}
                  onChange={(e) =>
                    updateSettings({ mapEmbedUrl: e.target.value })
                  }
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </div>
              {settings.mapEmbedUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Preview:</p>
                  <iframe
                    src={settings.mapEmbedUrl}
                    width="100%"
                    height="200"
                    className="rounded-lg border"
                    loading="lazy"
                    title="Map Preview"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Info Tab */}
        <TabsContent value="contact" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Phone Number</CardTitle>
              <CardDescription>Displayed in header and footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number (digits only)</Label>
                <Input
                  id="phoneNumber"
                  value={settings.phoneNumber}
                  onChange={(e) =>
                    updateSettings({ phoneNumber: e.target.value })
                  }
                  placeholder="0000000000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneDisplay">Display Format</Label>
                <Input
                  id="phoneDisplay"
                  value={settings.phoneDisplay}
                  onChange={(e) =>
                    updateSettings({ phoneDisplay: e.target.value })
                  }
                  placeholder="000-000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneAvailability">Availability Text</Label>
                <Input
                  id="phoneAvailability"
                  value={settings.phoneAvailability}
                  onChange={(e) =>
                    updateSettings({ phoneAvailability: e.target.value })
                  }
                  placeholder="Available 24/7"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  checked={settings.applyPhoneGlobally}
                  onCheckedChange={(checked) =>
                    updateSettings({ applyPhoneGlobally: checked })
                  }
                />
                <Label>Apply this phone number globally across all pages</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>
                Physical address displayed in the footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={settings.addressLine1}
                  onChange={(e) =>
                    updateSettings({ addressLine1: e.target.value })
                  }
                  placeholder="123 Main Street, Suite 100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  value={settings.addressLine2}
                  onChange={(e) =>
                    updateSettings({ addressLine2: e.target.value })
                  }
                  placeholder="City, State 12345"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Tab */}
        <TabsContent value="social" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Social media icons displayed in the footer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.socialLinks.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <Select
                    value={item.platform}
                    onValueChange={(v) =>
                      updateSocialLink(index, {
                        platform: v as SocialLink["platform"],
                      })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="twitter">Twitter/X</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={item.url}
                    onChange={(e) =>
                      updateSocialLink(index, { url: e.target.value })
                    }
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.enabled}
                      onCheckedChange={(checked) =>
                        updateSocialLink(index, { enabled: checked })
                      }
                    />
                    <span className="text-sm text-gray-500">Show</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSocialLink(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addSocialLink}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Social Link
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Site URL
              </CardTitle>
              <CardDescription>
                Your site's public domain, used for canonical URLs and SEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  value={settings.siteUrl}
                  onChange={(e) => {
                    // Auto-strip trailing slash
                    const val = e.target.value.replace(/\/+$/, "");
                    updateSettings({ siteUrl: val });
                  }}
                  placeholder="https://example.com"
                />
                <p className="text-sm text-gray-500">
                  Enter your full domain without a trailing slash (e.g. https://example.com). This is used for canonical URLs, Open Graph tags, and structured data.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Engine Settings
              </CardTitle>
              <CardDescription>
                Control how search engines index your site
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Enabling site-wide noindex will prevent search engines from indexing any page on your site. This is useful during development or for private sites.
                </p>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label className="text-base font-medium">Site-wide No Index</Label>
                  <p className="text-sm text-gray-500">
                    When enabled, all pages will have a noindex meta tag, hiding the entire site from search engines.
                  </p>
                </div>
                <Switch
                  checked={settings.siteNoindex}
                  onCheckedChange={(checked) =>
                    updateSettings({ siteNoindex: checked })
                  }
                />
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Per-Page Indexing</h4>
                <p className="text-sm text-gray-600">
                  Individual pages can also be hidden from search engines using the "No Index" toggle in each page's SEO settings. This allows you to hide specific pages while keeping the rest of your site indexed.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Global Schema (JSON-LD)
              </CardTitle>
              <CardDescription>
                Structured data added to every page on the site. Useful for Organization, LocalBusiness, or other site-wide schema markup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="globalSchema">JSON-LD Schema</Label>
                <Textarea
                  id="globalSchema"
                  value={settings.globalSchema}
                  onChange={(e) =>
                    updateSettings({ globalSchema: e.target.value })
                  }
                  placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Company",\n  "url": "https://example.com"\n}`}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  Enter valid JSON-LD. This will be injected as a <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">&lt;script type="application/ld+json"&gt;</code> tag on every page, in addition to any per-page schema.
                </p>
              </div>
              {settings.globalSchema && (
                <GlobalSchemaValidator json={settings.globalSchema} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics & Scripts Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Analytics
              </CardTitle>
              <CardDescription>
                Track website traffic and user behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga4MeasurementId">GA4 Measurement ID</Label>
                <Input
                  id="ga4MeasurementId"
                  value={settings.ga4MeasurementId}
                  onChange={(e) =>
                    updateSettings({ ga4MeasurementId: e.target.value })
                  }
                  placeholder="G-XXXXXXXXXX"
                  disabled={!isAdmin && !roleLoading}
                />
                <p className="text-sm text-gray-500">
                  Find this in your Google Analytics 4 property settings
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Google Ads Conversion Tracking
              </CardTitle>
              <CardDescription>
                Track conversions from Google Ads campaigns
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleAdsId">Google Ads ID</Label>
                <Input
                  id="googleAdsId"
                  value={settings.googleAdsId}
                  onChange={(e) =>
                    updateSettings({ googleAdsId: e.target.value })
                  }
                  placeholder="AW-XXXXXXXXX"
                  disabled={!isAdmin && !roleLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="googleAdsConversionLabel">Conversion Label (optional)</Label>
                <Input
                  id="googleAdsConversionLabel"
                  value={settings.googleAdsConversionLabel}
                  onChange={(e) =>
                    updateSettings({ googleAdsConversionLabel: e.target.value })
                  }
                  placeholder="XXXXXXXXXX"
                  disabled={!isAdmin && !roleLoading}
                />
                <p className="text-sm text-gray-500">
                  Optional: Used for specific conversion actions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Custom Scripts
              </CardTitle>
              <CardDescription>
                Add custom JavaScript or tracking pixels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAdmin && !roleLoading && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Admin Only</p>
                    <p className="text-sm text-amber-700">
                      Only administrators can edit custom scripts. Contact an admin if you need to add tracking codes.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="headScripts">Head Scripts</Label>
                <Textarea
                  id="headScripts"
                  value={settings.headScripts}
                  onChange={(e) =>
                    updateSettings({ headScripts: e.target.value })
                  }
                  placeholder="<!-- Scripts to inject before </head> -->"
                  rows={6}
                  className="font-mono text-sm"
                  disabled={!isAdmin && !roleLoading}
                />
                <p className="text-sm text-gray-500">
                  Scripts inserted just before the closing &lt;/head&gt; tag
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerScripts">Footer Scripts</Label>
                <Textarea
                  id="footerScripts"
                  value={settings.footerScripts}
                  onChange={(e) =>
                    updateSettings({ footerScripts: e.target.value })
                  }
                  placeholder="<!-- Scripts to inject before </body> -->"
                  rows={6}
                  className="font-mono text-sm"
                  disabled={!isAdmin && !roleLoading}
                />
                <p className="text-sm text-gray-500">
                  Scripts inserted just before the closing &lt;/body&gt; tag
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function reorderItems<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  if (
    fromIndex < 0
    || toIndex < 0
    || fromIndex >= items.length
    || toIndex >= items.length
  ) {
    return items;
  }

  const reordered = [...items];
  const [movedItem] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, movedItem);
  return reordered;
}

/* ------------------------------------------------------------------ */
/*  GlobalSchemaValidator – validates JSON-LD input                     */
/* ------------------------------------------------------------------ */
function GlobalSchemaValidator({ json }: { json: string }) {
  let isValid = false;
  let errorMsg = "";

  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) {
      errorMsg = "Schema must be a JSON object or array of objects.";
    } else {
      isValid = true;
    }
  } catch (e) {
    errorMsg = (e as Error).message;
  }

  if (isValid) {
    return (
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800">✓ Valid JSON</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-sm text-red-800">
        <strong>Invalid JSON:</strong> {errorMsg}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  NavigationChildrenEditor – collapsible sub-items for dropdown menus */
/* ------------------------------------------------------------------ */
function NavigationChildrenEditor({
  navChildren,
  onChange,
  level = 1,
}: {
  navChildren: NavigationChildItem[];
  onChange: (children: NavigationChildItem[]) => void;
  level?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const addChild = () => {
    onChange([...navChildren, { label: "", href: "", openInNewTab: false, children: [] }]);
  };

  const updateChild = (index: number, updates: Partial<NavigationChildItem>) => {
    const items = [...navChildren];
    items[index] = { ...items[index], ...updates };
    onChange(items);
  };

  const removeChild = (index: number) => {
    onChange(navChildren.filter((_, i) => i !== index));
  };

  const reorderChildren = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) {
      return;
    }

    onChange(reorderItems(navChildren, fromIndex, toIndex));
  };

  const handleChildDragStart = (event: DragEvent, index: number) => {
    event.stopPropagation();
    setDraggingIndex(index);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleChildDragOver = (event: DragEvent) => {
    if (draggingIndex === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
  };

  const handleChildDrop = (event: DragEvent, index: number) => {
    if (draggingIndex === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    reorderChildren(draggingIndex, index);
    setDraggingIndex(null);
  };

  const label = level === 1 ? "Dropdown Items" : "Grandchild Items";
  const addLabel = level === 1 ? "Add Sub-Item" : "Add Grandchild Item";
  const accentClass = level === 1 ? "border-blue-200" : "border-slate-300";
  const marginClass = level === 1 ? "ml-8" : "ml-6";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ${marginClass}`}
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
          {label} ({navChildren.length})
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className={`${marginClass} mt-2 space-y-3 border-l-2 ${accentClass} pl-4`}>
          {navChildren.map((child, idx) => (
            <div
              key={idx}
              onDragOver={handleChildDragOver}
              onDrop={(event) => handleChildDrop(event, idx)}
              className={`space-y-2 rounded-md border p-2 transition-colors ${
                draggingIndex === idx
                  ? "border-blue-300 bg-blue-50/70 opacity-70"
                  : "border-transparent bg-white/70"
              }`}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => handleChildDragStart(event, idx)}
                  onDragEnd={() => setDraggingIndex(null)}
                  className="cursor-grab rounded p-1 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 active:cursor-grabbing"
                  aria-label={`Drag ${child.label || label.toLowerCase()} to reorder`}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <Input
                  value={child.label}
                  onChange={(e) => updateChild(idx, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1"
                />
                <Input
                  value={child.href}
                  onChange={(e) => updateChild(idx, { href: e.target.value })}
                  placeholder="/page-url"
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <Switch
                    checked={child.openInNewTab || false}
                    onCheckedChange={(checked) =>
                      updateChild(idx, { openInNewTab: checked })
                    }
                  />
                  <span className="text-xs text-gray-500">New tab</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeChild(idx)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              {level === 1 && (
                <NavigationChildrenEditor
                  navChildren={child.children || []}
                  onChange={(children) => updateChild(idx, { children })}
                  level={2}
                />
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addChild}
            className="w-full"
          >
            <Plus className="h-3 w-3 mr-1" />
            {addLabel}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

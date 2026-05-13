import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Post, PostCategory } from "@/lib/database.types";
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
import { ArrowLeft, Save, Loader2, ExternalLink } from "lucide-react";
import RichTextEditor from "@site/components/admin/RichTextEditor";
import ImageUploader from "../../components/admin/ImageUploader";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PublishDateTimeField } from "@site/components/admin/editors/EditorShared";

export default function AdminPostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<PostCategory[]>([]);
  const [activeTab, setActiveTab] = useState("content");
  const { settings: siteSettings } = useSiteSettings();

  useEffect(() => {
    if (id) {
      fetchPost();
      fetchCategories();
    }
  }, [id]);

  const fetchPost = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching post:", error);
      navigate("/admin/posts");
      return;
    }

    setPost(data as Post);
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("post_categories")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);

    const { error } = await supabase
      .from("posts")
      .update({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        featured_image: post.featured_image,
        category_id: post.category_id,
        body: post.body,
        meta_title: post.meta_title,
        meta_description: post.meta_description,
        canonical_url: post.canonical_url,
        og_title: post.og_title,
        og_description: post.og_description,
        og_image: post.og_image,
        noindex: post.noindex,
        status: post.status,
        published_at:
          post.status === "published" && !post.published_at
            ? new Date().toISOString()
            : post.published_at,
      } as Record<string, unknown>)
      .eq("id", post.id);

    if (error) {
      console.error("Error saving post:", error);
      toast.error("Failed to save post: " + error.message);
    } else {
      toast.success("Post saved successfully!");
    }
    setSaving(false);
  };

  const updatePost = (updates: Partial<Post>) => {
    if (!post) return;
    setPost({ ...post, ...updates });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!post) {
    return <div>Post not found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/posts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {post.title}
              </h1>
              <Badge
                variant={post.status === "published" ? "default" : "secondary"}
              >
                {post.status}
              </Badge>
            </div>
            <p className="text-gray-500 text-sm">/blog/{post.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.status === "published" && (
            <a
              href={`/blog/${post.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
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
        </TabsList>

        {/* ─── Tab 1: Content ─── */}
        <TabsContent value="content" className="mt-6 space-y-6">
          {/* Post Title */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <Label htmlFor="postTitle">Post Title</Label>
                <Input
                  id="postTitle"
                  value={post.title}
                  onChange={(e) => updatePost({ title: e.target.value })}
                  className="text-2xl font-semibold h-14"
                  placeholder="Enter post title..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Hero Background Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hero Background Image</CardTitle>
              <CardDescription>
                This image appears as the full-width hero background on the
                public blog post page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploader
                value={post.featured_image || ""}
                onChange={(url) => updatePost({ featured_image: url })}
                folder="blog-images"
                placeholder="Upload a hero background image"
              />
            </CardContent>
          </Card>

          {/* Post Body — RichTextEditor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Post Body</CardTitle>
              <CardDescription>
                Write your post content. Use the toolbar for formatting,
                lists, blockquotes, links, and inline images.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RichTextEditor
                value={post.body || ""}
                onChange={(html) => updatePost({ body: html })}
                placeholder="Start writing your blog post…"
                minHeight="400px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: SEO & Meta ─── */}
        <TabsContent value="seo" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SEO & Meta Tags</CardTitle>
              <CardDescription>
                Optimize your post for search engines
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={post.meta_title || ""}
                  onChange={(e) => updatePost({ meta_title: e.target.value })}
                  placeholder="Post Title | Blog"
                />
                <p className="text-sm text-gray-500">
                  {(post.meta_title || "").length}/60 characters recommended
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  value={post.meta_description || ""}
                  onChange={(e) =>
                    updatePost({ meta_description: e.target.value })
                  }
                  placeholder="A brief description of this post..."
                  rows={3}
                />
                <p className="text-sm text-gray-500">
                  {(post.meta_description || "").length}/160 characters
                  recommended
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl">Canonical URL (Optional)</Label>
                <Input
                  id="canonicalUrl"
                  value={post.canonical_url || ""}
                  onChange={(e) =>
                    updatePost({ canonical_url: e.target.value })
                  }
                  placeholder={siteSettings.siteUrl ? `${siteSettings.siteUrl}/blog/${post.slug}/` : "https://yourdomain.com/blog/post"}
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
                  value={post.og_title || ""}
                  onChange={(e) => updatePost({ og_title: e.target.value })}
                  placeholder="Leave blank to use Meta Title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ogDescription">OG Description</Label>
                <Textarea
                  id="ogDescription"
                  value={post.og_description || ""}
                  onChange={(e) =>
                    updatePost({ og_description: e.target.value })
                  }
                  placeholder="Leave blank to use Meta Description"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>OG Image</Label>
                <p className="text-sm text-gray-500 mb-2">
                  Used when sharing on social media. Falls back to featured
                  image if not set.
                </p>
                <ImageUploader
                  value={post.og_image || ""}
                  onChange={(url) => updatePost({ og_image: url })}
                  folder="blog-images"
                  placeholder="Upload an OG image"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={post.noindex}
                  onCheckedChange={(checked) =>
                    updatePost({ noindex: checked })
                  }
                />
                <Label>No Index (hide from search engines)</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 3: Settings ─── */}
        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Post Settings</CardTitle>
              <CardDescription>
                Configure post properties and publishing status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={post.slug}
                  onChange={(e) => updatePost({ slug: e.target.value })}
                />
                <p className="text-sm text-gray-500">
                  Available at /blog/{post.slug}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={post.category_id || "none"}
                  onValueChange={(v) =>
                    updatePost({ category_id: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt</Label>
                <Textarea
                  id="excerpt"
                  value={post.excerpt || ""}
                  onChange={(e) => updatePost({ excerpt: e.target.value })}
                  placeholder="A short summary for post listings and cards..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={post.status}
                  onValueChange={(v) =>
                    updatePost({ status: v as Post["status"] })
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
                  Only published posts appear on the live site
                </p>
              </div>

              <PublishDateTimeField
                id="publishedAt"
                value={post.published_at}
                onChange={(publishedAt) => updatePost({ published_at: publishedAt })}
                helperText="Used for post display and SEO metadata. Visibility is still controlled by Status, and publishing without a date will use the current time."
              />
              <p className="text-sm text-gray-500">
                Last updated: {new Date(post.updated_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

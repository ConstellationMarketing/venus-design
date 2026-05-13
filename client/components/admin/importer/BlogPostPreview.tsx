import type { TransformedBlogPost } from "@site/lib/importer/types";
import { Badge } from "@/components/ui/badge";
import { Globe, Search } from "lucide-react";

interface BlogPostPreviewProps {
  record: TransformedBlogPost;
}

export default function BlogPostPreview({ record }: BlogPostPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Featured image + content */}
      <div className="flex gap-4">
        {/* Featured image */}
        {record.featured_image && (
          <div className="w-32 h-24 bg-muted rounded overflow-hidden shrink-0">
            <img
              src={record.featured_image}
              alt={record.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.display = "none";
                el.parentElement!.innerHTML =
                  '<div class="flex items-center justify-center w-full h-full text-xs text-muted-foreground">No image</div>';
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base">{record.title}</h3>

          {record.category && (
            <Badge variant="secondary" className="text-xs mt-1">
              {record.category}
            </Badge>
          )}

          {record.excerpt && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {record.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Body preview */}
      {record.body && (
        <div className="border rounded-lg p-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
            Body Preview
          </p>
          <div
            className="text-sm text-muted-foreground line-clamp-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: record.body }}
          />
        </div>
      )}

      {/* SEO summary card */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-1">
          <Search className="h-3 w-3" />
          SEO Summary
        </p>
        <div className="space-y-1">
          {record.meta_title && (
            <p className="text-sm">
              <span className="text-muted-foreground text-xs">Title:</span>{" "}
              {record.meta_title}
            </p>
          )}
          {record.meta_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              <span className="text-xs">Desc:</span>{" "}
              {record.meta_description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge variant="secondary" className="text-xs gap-1">
            <Globe className="h-3 w-3" />
            /blog/{record.slug}
          </Badge>
          {record.canonical_url && (
            <Badge variant="outline" className="text-xs">
              Canonical: {record.canonical_url}
            </Badge>
          )}
          {record.noindex && (
            <Badge variant="destructive" className="text-xs">
              noindex
            </Badge>
          )}
          {record.og_title && (
            <Badge variant="outline" className="text-xs">
              OG: {record.og_title.slice(0, 30)}
              {record.og_title.length > 30 && "…"}
            </Badge>
          )}
          {record.og_image && (
            <Badge variant="outline" className="text-xs">
              OG Image set
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}

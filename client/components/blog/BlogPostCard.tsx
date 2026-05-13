import { Link } from "react-router-dom";
import { Calendar, Tag } from "lucide-react";
import { normalizeSlug } from "@site/lib/utils";
import type { PreloadedPostDocument } from "@site/lib/cms/publicLoaders";

interface BlogPostCardProps {
  post: PreloadedPostDocument;
}

export default function BlogPostCard({ post }: BlogPostCardProps) {
  const displayDate = post.published_at || post.created_at;
  const cleanSlug = normalizeSlug(post.slug);
  const fallbackOgImage = typeof post.og_image === "string" ? post.og_image : post.og_image?.url || "";
  const cardImage = post.featured_image || fallbackOgImage;

  return (
    <Link
      to={`/blog/${cleanSlug}/`}
      className="group block bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      {cardImage ? (
        <div className="aspect-[16/9] overflow-hidden bg-gray-100">
          <img
            src={cardImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            width={600}
            height={338}
          />
        </div>
      ) : (
        <div className="aspect-[16/9] bg-gradient-to-br from-[#183658] to-[#0f2742] flex items-center justify-center">
          <span
            className="text-white/30 text-6xl font-light"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            {post.title.charAt(0)}
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center gap-3 mb-3 text-sm text-gray-500">
          {post.post_categories?.name && (
            <span className="flex items-center gap-1 text-[#6b8d0c] font-medium">
              <Tag className="h-3 w-3" />
              {post.post_categories.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(displayDate || Date.now()).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        <h2
          className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#183658] transition-colors line-clamp-2"
          style={{ fontFamily: "Archivo, sans-serif" }}
        >
          {post.title}
        </h2>

        {post.excerpt && (
          <p className="text-gray-600 text-sm line-clamp-3">{post.excerpt}</p>
        )}

        <span className="inline-block mt-4 text-sm font-semibold text-[#183658] group-hover:text-[#6b8d0c] transition-colors">
          Read More →
        </span>
      </div>
    </Link>
  );
}

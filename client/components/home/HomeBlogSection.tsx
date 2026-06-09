import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown, Newspaper } from "lucide-react";
import type { HomeBlogContent } from "@site/lib/cms/homePageTypes";
import {
  loadRecentPosts,
  type PreloadedPostDocument,
} from "@site/lib/cms/publicLoaders";
import { getPreloadedRecentPosts } from "@site/lib/preloadState";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import SiteLink from "@site/components/layout/SiteLink";
import { normalizeSlug } from "@site/lib/utils";

interface HomeBlogSectionProps {
  content?: HomeBlogContent;
  headingTag?: string;
}

let cachedPosts: PreloadedPostDocument[] | null = null;

function ButtonWithArrow({ href, label }: { href: string; label: string }) {
  return (
    <SiteLink
      href={href}
      className="group inline-flex overflow-hidden text-[18px] leading-7 text-white"
    >
      <span className="flex items-center bg-[#bb133e] px-8 py-3 transition-colors duration-300 group-hover:bg-[#a51037]">
        {label}
      </span>
      <span className="flex items-center justify-center bg-[#8f0f28] px-4 py-3 transition-colors duration-300 group-hover:bg-[#7b0d22]">
        <ChevronDown className="h-5 w-5" />
      </span>
    </SiteLink>
  );
}

function getPostExcerpt(post: PreloadedPostDocument) {
  const source = (post.excerpt || post.body || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!source) {
    return "";
  }

  if (source.length <= 110) {
    return source;
  }

  return `${source.slice(0, 107).trimEnd()}...`;
}

function getPostDate(post: PreloadedPostDocument) {
  const source = post.published_at || post.created_at;

  if (!source) {
    return "";
  }

  const parsed = new Date(source);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function HomeBlogSection({
  content,
  headingTag,
}: HomeBlogSectionProps) {
  const { pathname } = useLocation();
  const preloadedPosts = getPreloadedRecentPosts(pathname);
  const initialPosts = (preloadedPosts || cachedPosts || []).slice(0, 4);

  if (preloadedPosts && !cachedPosts) {
    cachedPosts = preloadedPosts;
  }

  const [posts, setPosts] = useState<PreloadedPostDocument[]>(initialPosts);
  const [loading, setLoading] = useState(!preloadedPosts && !cachedPosts);
  const heading = content?.heading?.trim() || "";
  const buttonLabel = content?.buttonLabel?.trim() || "Read All";
  const buttonLink = content?.buttonLink?.trim() || "/blog/";

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      if (cachedPosts) {
        if (isMounted) {
          setPosts(cachedPosts.slice(0, 4));
          setLoading(false);
        }
        return;
      }

      try {
        const recentPosts = await loadRecentPosts(4);
        cachedPosts = recentPosts;

        if (isMounted) {
          setPosts(recentPosts);
        }
      } catch (error) {
        console.error("[HomeBlogSection] Failed to load posts:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPosts();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!content || (!heading && !loading && posts.length === 0)) {
    return null;
  }

  return (
    <section className="bg-white py-14 font-poppins text-black">
      <div className="mx-auto mb-8 flex w-[80%] max-w-[2560px] flex-col gap-5 px-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 shrink-0 text-[#333]">
            <Newspaper className="h-5 w-5 md:h-6 md:w-6" strokeWidth={2} />
          </div>
          <DynamicHeading
            tag={headingTag}
            defaultTag="h2"
            className="text-[24px] leading-8 text-[#333]"
          >
            {heading || "News & Reports"}
          </DynamicHeading>
        </div>

        <ButtonWithArrow href={buttonLink} label={buttonLabel} />
      </div>

      <div className="mx-auto w-[80%] max-w-[1441px] px-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#bb133e]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="py-12 text-center text-black/60">No blog posts published yet.</div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
            {posts.map((post) => {
              const slug = normalizeSlug(post.slug);
              const href = `/blog/${slug}/`;
              const image = post.featured_image || (typeof post.og_image === "string" ? post.og_image : post.og_image?.url) || "";
              const excerpt = getPostExcerpt(post);
              const displayDate = getPostDate(post);

              return (
                <SiteLink
                  key={post.id}
                  href={href}
                  className="group flex flex-col overflow-hidden border border-[#e5e7eb] bg-white transition-shadow duration-300 hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[#f3f4f6]">
                    {image ? (
                      <img
                        src={image}
                        alt={post.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#f3f4f6] text-4xl text-black/20">
                        {post.title.charAt(0)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    {displayDate ? (
                      <p className="mb-3 text-[14px] uppercase tracking-[0.35px] text-[#bb133e]">
                        {displayDate}
                      </p>
                    ) : null}

                    <h3 className="mb-3 text-[20px] font-semibold leading-7 text-[#333] transition-colors duration-300 group-hover:text-[#bb133e]">
                      {post.title}
                    </h3>

                    {excerpt ? (
                      <p className="mb-4 flex-1 text-[14px] leading-[22.75px] text-[#4b5563]">
                        {excerpt}
                      </p>
                    ) : <div className="flex-1" />}

                    <div className="flex items-center text-[14px] font-medium leading-5 text-[#bb133e] transition-transform duration-300 group-hover:translate-x-1">
                      <span>Read More</span>
                      <ChevronDown className="ml-1 h-4 w-4 -rotate-90" />
                    </div>
                  </div>
                </SiteLink>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

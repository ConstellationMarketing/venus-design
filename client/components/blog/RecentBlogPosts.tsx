import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BlogPostCard from "@site/components/blog/BlogPostCard";
import type { RecentPostsConfig, PreloadedPostDocument } from "@site/lib/cms/publicLoaders";
import { loadRecentPosts } from "@site/lib/cms/publicLoaders";
import { getPreloadedRecentPosts } from "@site/lib/preloadState";

interface RecentBlogPostsProps {
  data: RecentPostsConfig;
}

let cachedPosts: PreloadedPostDocument[] | null = null;

export default function RecentBlogPosts({ data }: RecentBlogPostsProps) {
  const { pathname } = useLocation();
  const preloadedPosts = getPreloadedRecentPosts(pathname);
  const initialPosts = (preloadedPosts || cachedPosts || []).slice(0, data.postCount);

  if (preloadedPosts && !cachedPosts) {
    cachedPosts = preloadedPosts;
  }

  const [posts, setPosts] = useState<PreloadedPostDocument[]>(initialPosts);
  const [loading, setLoading] = useState(!preloadedPosts && !cachedPosts);

  useEffect(() => {
    let isMounted = true;

    async function fetchRecentPostsList() {
      if (cachedPosts) {
        if (isMounted) {
          setPosts(cachedPosts.slice(0, data.postCount));
          setLoading(false);
        }
        return;
      }

      try {
        const recentPosts = await loadRecentPosts(data.postCount);
        cachedPosts = recentPosts;

        if (isMounted) {
          setPosts(recentPosts);
        }
      } catch (err) {
        console.error("Error fetching recent posts:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRecentPostsList();

    return () => {
      isMounted = false;
    };
  }, [data.postCount]);

  return (
    <section className="bg-white py-[40px] md:py-[60px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        <div className="text-center mb-[30px] md:mb-[50px]">
          <p className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[rgb(107,141,12)] mb-[10px]">
            {data.sectionLabel}
          </p>
          <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black">
            {data.heading}
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-outfit text-[18px] text-black/60">
              No posts published yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

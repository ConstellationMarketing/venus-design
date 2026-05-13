import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BlogPostCard from "./BlogPostCard";
import {
  filterRecentPosts,
  loadRecentPosts,
  type PreloadedPostDocument,
} from "@site/lib/cms/publicLoaders";
import { getPreloadedRecentPosts } from "@site/lib/preloadState";

interface RecentPostsProps {
  excludeId?: string;
}

let cachedPosts: PreloadedPostDocument[] | null = null;

export default function RecentPosts({ excludeId }: RecentPostsProps) {
  const { pathname } = useLocation();
  const preloadedPosts = getPreloadedRecentPosts(pathname);
  const initialPosts = filterRecentPosts(preloadedPosts || cachedPosts || [], excludeId, 3);

  if (preloadedPosts && !cachedPosts) {
    cachedPosts = preloadedPosts;
  }

  const [posts, setPosts] = useState<PreloadedPostDocument[]>(initialPosts);
  const [loading, setLoading] = useState(!preloadedPosts && !cachedPosts);

  useEffect(() => {
    let isMounted = true;

    async function fetchPosts() {
      if (cachedPosts) {
        if (isMounted) {
          setPosts(filterRecentPosts(cachedPosts, excludeId, 3));
          setLoading(false);
        }
        return;
      }

      try {
        const recentPosts = await loadRecentPosts(4);
        cachedPosts = recentPosts;

        if (isMounted) {
          setPosts(filterRecentPosts(recentPosts, excludeId, 3));
        }
      } catch (err) {
        console.error("Error fetching recent posts:", err);
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
  }, [excludeId]);

  if (!loading && posts.length === 0) {
    return null;
  }

  return (
    <section className="bg-gray-50 py-14 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2
          className="text-3xl md:text-4xl font-light text-gray-900 mb-10 text-center"
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          Recent Articles
        </h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4" />
                <div className="bg-gray-200 rounded h-4 w-3/4 mb-2" />
                <div className="bg-gray-200 rounded h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

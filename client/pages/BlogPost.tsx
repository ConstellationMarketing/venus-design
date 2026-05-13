import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@site/components/Seo";
import Layout from "@site/components/layout/Layout";
import BlogPostHero from "@site/components/blog/BlogPostHero";
import BlogSidebar from "@site/components/blog/BlogSidebar";
import RecentPosts from "@site/components/blog/RecentPosts";
import { ArrowLeft } from "lucide-react";
import NotFound from "./NotFound";
import {
  isPreloadedPostDocumentShape,
  loadBlogPostDocument,
  normalizeCmsUrlPath,
  normalizePostSlug,
  type PreloadedPostDocument,
} from "@site/lib/cms/publicLoaders";
import { getPreloadedPostDocument } from "@site/lib/preloadState";

const postCache = new Map<string, PreloadedPostDocument>();

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const postPath = slug ? normalizeCmsUrlPath(`/blog/${normalizePostSlug(slug)}/`) : "";
  const preloadedPost = postPath ? getPreloadedPostDocument(postPath) : null;
  const normalizedPreloadedPost = isPreloadedPostDocumentShape(preloadedPost) ? preloadedPost : null;
  const initialPost = (postPath ? postCache.get(postPath) : null) || normalizedPreloadedPost;

  if (normalizedPreloadedPost && postPath && !postCache.has(postPath)) {
    postCache.set(postPath, normalizedPreloadedPost);
  }

  const [post, setPost] = useState<PreloadedPostDocument | null>(initialPost);
  const [loading, setLoading] = useState(!initialPost);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const normalizedPath = normalizeCmsUrlPath(`/blog/${normalizePostSlug(slug)}/`);
    const cached = postCache.get(normalizedPath);
    if (cached) {
      setPost(cached);
      setLoading(false);
      setNotFound(false);
      return;
    }

    let isMounted = true;

    async function fetchPost() {
      try {
        const loadedPost = await loadBlogPostDocument(slug);
        if (!loadedPost) {
          if (isMounted) {
            setNotFound(true);
          }
          return;
        }

        postCache.set(normalizedPath, loadedPost);

        if (isMounted) {
          setPost(loadedPost);
          setNotFound(false);
        }
      } catch (err) {
        console.error("Error fetching post:", err);
        if (isMounted) {
          setNotFound(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#183658]" />
        </div>
      </Layout>
    );
  }

  if (notFound || !post) {
    return <NotFound />;
  }

  const displayDate = post.published_at || post.created_at;

  return (
    <Layout>
      <Seo
        routeType="post"
        title={post.title}
        meta={post}
        description={post.excerpt || undefined}
        image={post.featured_image || undefined}
        publishedTime={post.published_at || post.created_at || undefined}
        updatedTime={post.updated_at || post.published_at || post.created_at || undefined}
      />

      <BlogPostHero
        title={post.title}
        categoryName={post.post_categories?.name}
        publishedDate={displayDate}
        featuredImage={post.featured_image}
      />

      <section className="bg-white py-10 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/blog/"
            className="inline-flex items-center gap-2 text-sm text-[#183658] hover:text-[#6b8d0c] transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Blog
          </Link>

          <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
            <article className="flex-1 min-w-0 lg:max-w-[70%]">
              {post.body ? (
                <div
                  className="prose prose-lg max-w-none
                    prose-headings:font-semibold prose-headings:text-gray-900
                    prose-a:text-[#183658] prose-a:underline hover:prose-a:text-[#6b8d0c]
                    prose-blockquote:border-l-4 prose-blockquote:border-[#6b8d0c] prose-blockquote:text-gray-600
                    prose-img:rounded-lg prose-img:shadow-md"
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
              ) : post.excerpt ? (
                <p className="text-xl text-gray-600 leading-relaxed border-l-4 border-[#6b8d0c] pl-4">
                  {post.excerpt}
                </p>
              ) : (
                <p className="text-gray-400 italic">This post has no content yet.</p>
              )}
            </article>

            <div className="w-full lg:w-[30%] lg:max-w-[340px] shrink-0">
              <div className="sticky top-8">
                <BlogSidebar />
              </div>
            </div>
          </div>
        </div>
      </section>

      <RecentPosts excludeId={post.id} />
    </Layout>
  );
}

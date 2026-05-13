import type { ContentBlock } from "@site/lib/blocks";
import RecentBlogPosts from "@site/components/blog/RecentBlogPosts";

interface RecentPostsBlockProps {
  block: Extract<ContentBlock, { type: "recent-posts" }>;
}

export default function RecentPostsBlock({ block }: RecentPostsBlockProps) {
  return (
    <RecentBlogPosts
      data={{
        sectionLabel: block.sectionLabel,
        heading: block.heading,
        postCount: block.postCount ?? 6,
      }}
    />
  );
}

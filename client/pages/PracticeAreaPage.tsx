import { useParams } from "react-router-dom";
import Layout from "@site/components/layout/Layout";
import PracticePageView from "@site/components/practice/PracticePageView";
import { usePracticeAreaPageContent } from "@site/hooks/usePracticeAreaPageContent";
import { Loader2 } from "lucide-react";

export default function PracticeAreaPage() {
  const { slug } = useParams<{ slug: string }>();
  const { content, meta, title, publishedAt, updatedAt, isLoading, notFound } =
    usePracticeAreaPageContent(slug);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        </div>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <div className="bg-brand-dark py-[60px] md:py-[100px]">
          <div className="max-w-[800px] mx-auto text-center px-4">
            <h1 className="font-playfair text-[36px] md:text-[48px] text-white mb-4">
              Page Not Found
            </h1>
            <p className="font-outfit text-[18px] text-white/80">
              The practice area page you're looking for doesn't exist or hasn't
              been published yet.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <PracticePageView
      content={content}
      meta={meta}
      title={title}
      publishedAt={publishedAt}
      updatedAt={updatedAt}
    />
  );
}

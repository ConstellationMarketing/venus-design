import Layout from "@site/components/layout/Layout";
import Seo from "@site/components/Seo";
import PracticeAreaContentSection from "@site/components/practice/PracticeAreaContentSection";
import PracticeAreaFaq from "@site/components/practice/PracticeAreaFaq";
import PracticeAreaHero from "@site/components/practice/PracticeAreaHero";
import PracticeAreaSocialProof from "@site/components/practice/PracticeAreaSocialProof";
import type { PageMeta } from "@site/lib/cms/pageMeta";
import type { PracticeAreaPageContent } from "@site/lib/cms/practiceAreaPageTypes";

interface PracticePageViewProps {
  content: PracticeAreaPageContent;
  meta: PageMeta;
  title?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export default function PracticePageView({
  content,
  meta,
  title,
  publishedAt,
  updatedAt,
}: PracticePageViewProps) {
  return (
    <Layout>
      <Seo
        title={title || undefined}
        meta={meta}
        image={content.hero.backgroundImage || undefined}
        pageContent={content}
        publishedTime={publishedAt}
        updatedTime={updatedAt}
      />

      <div className="relative -mt-[180px] bg-brand-dark">
        {content.hero.backgroundImage && (
          <>
            <img
              src={content.hero.backgroundImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ backgroundColor: "rgba(6, 29, 27, 0.85)" }}
            />
          </>
        )}

        <div className="h-[180px]" />

        <PracticeAreaHero content={content.hero} />

        <PracticeAreaSocialProof
          content={content.socialProof}
          headingTags={content.headingTags}
        />
      </div>

      {content.contentSections.map((section, index) => (
        <PracticeAreaContentSection
          key={index}
          section={section}
          index={index}
        />
      ))}

      <PracticeAreaFaq
        content={content.faq}
        headingTags={content.headingTags}
      />
    </Layout>
  );
}

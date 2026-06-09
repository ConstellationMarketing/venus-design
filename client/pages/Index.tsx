import Seo from "@site/components/Seo";
import Layout from "@site/components/layout/Layout";
import Hero from "@site/components/home/Hero";
import AboutSection from "@site/components/home/AboutSection";
import PracticeAreasSection from "@site/components/home/PracticeAreasSection";
import TestimonialsSection from "@site/components/home/TestimonialsSection";
import HomeBlogSection from "@site/components/home/HomeBlogSection";
import GoogleReviewsSection from "@site/components/home/GoogleReviewsSection";
import FaqSection from "@site/components/home/FaqSection";
import ContactUsSection from "@site/components/home/ContactUsSection";
import { useHomeContent } from "@site/hooks/useHomeContent";
import { Loader2 } from "lucide-react";

export default function Index() {
  const { content, meta, title, publishedAt, updatedAt, isLoading } = useHomeContent();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        </div>
      </Layout>
    );
  }

  const heroContent = content.hero;

  return (
    <Layout>
      <Seo
        title={title || "Home"}
        meta={meta}
        pageContent={content}
        publishedTime={publishedAt}
        updatedTime={updatedAt}
      />

      <Hero content={heroContent} />

      {/* About Us Section */}
      <AboutSection content={content.about} headingTag={content.headingTags?.["about.sectionLabel"]} />

      <PracticeAreasSection
        intro={content.practiceAreasIntro}
        grid={content.practiceAreas}
        headingTags={content.headingTags}
      />

      {/* Testimonials Section */}
      <TestimonialsSection content={content.testimonials} headingTag={content.headingTags?.["testimonials.sectionLabel"]} />

      {/* Blog Section */}
      <HomeBlogSection content={content.blog} headingTag={content.headingTags?.["blog.heading"]} />

      {/* Google Reviews Section */}
      <GoogleReviewsSection content={content.googleReviews} headingTag={content.headingTags?.["googleReviews.sectionLabel"]} />

      {/* FAQ Section */}
      <FaqSection content={content.faq} />

      {/* Contact Us Section */}
      <ContactUsSection content={content.contact} headingTag={content.headingTags?.["contact.sectionLabel"]} />
    </Layout>
  );
}

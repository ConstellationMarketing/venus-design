import Seo from "@site/components/Seo";
import Layout from "@site/components/layout/Layout";
import CallBox from "@site/components/shared/CallBox";
import StatsGrid from "@site/components/shared/StatsGrid";
import TeamMemberCard from "@site/components/about/TeamMemberCard";
import ValueCard from "@site/components/about/ValueCard";
import {
  Phone as PhoneIcon,
  Calendar,
  Scale,
  Award,
  Users,
  Heart,
  type LucideIcon,
  Loader2,
} from "lucide-react";
import { useAboutContent } from "@site/hooks/useAboutContent";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";

// Icon mapping for values section
const iconMap: Record<string, LucideIcon> = {
  Scale,
  Award,
  Users,
  Heart,
};

export default function AboutUs() {
  const { content, meta, title, publishedAt, updatedAt, isLoading } = useAboutContent();
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-brand-accent" />
        </div>
      </Layout>
    );
  }

  // Map team members from CMS content
  const teamMembers = content.team.members;

  // Map core values from CMS content with icon components
  const coreValues = content.values.items.map((item) => ({
    icon: iconMap[item.icon] || Scale,
    title: item.title,
    description: item.description,
  }));

  // Map stats from CMS content
  const stats = content.stats.stats;

  // Map why choose us from CMS content
  const whyChooseUs = content.whyChooseUs.items;

  return (
    <Layout>
      <Seo
        title={title || "About Us"}
        meta={meta}
        pageContent={content}
        publishedTime={publishedAt}
        updatedTime={updatedAt}
      />

      {/* Hero Section */}
      <div className="bg-brand-dark pt-[30px] md:pt-[54px] pb-[30px] md:pb-[54px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%]">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-[5%]">
            {/* Left Side - Heading */}
            <div className="lg:w-[65%]">
              {/* H1 Title - Section Heading */}
              <DynamicHeading
                tag={content.headingTags?.["hero.sectionLabel"]}
                defaultTag="h1"
                className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent mb-[10px]"
              >
                {content.hero.sectionLabel}
              </DynamicHeading>
              {/* Tagline - styled as large text but not H1 */}
              <p className="font-playfair text-[clamp(2.5rem,7vw,68.8px)] font-light leading-[1.2] text-white mb-[20px] md:mb-[30px]">
                <span
                  dangerouslySetInnerHTML={{
                    __html: content.hero.tagline.replace(
                      /(Justice & Excellence|Justice|Excellence)/g,
                      '<span class="text-brand-accent">$1</span>',
                    ),
                  }}
                />
              </p>
              <RichText
                html={content.hero.description}
                className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[30px] text-white/90"
              />
            </div>

            {/* Right Side - CallBox */}
            <div className="w-full lg:w-[30%] lg:flex lg:items-center">
              <CallBox
                icon={PhoneIcon}
                title={phoneLabel}
                subtitle={phoneDisplay}
                phone={phoneNumber}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Our Story Section */}
      {(content.story.heading || content.story.paragraphs.length > 0) && (
      <div className="bg-white pt-[30px] md:pt-[54px] pb-[30px] md:pb-[54px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[80%]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[8%]">
            {/* Left Side - Content */}
            <div>
              <div className="mb-[10px]">
                <DynamicHeading
                  tag={content.headingTags?.["story.sectionLabel"]}
                  defaultTag="h2"
                  className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[rgb(107,141,12)]"
                >
                  {content.story.sectionLabel}
                </DynamicHeading>
              </div>
              <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[20px]">
                {content.story.heading}
              </p>
              <div className="space-y-[15px] md:space-y-[20px]">
                {content.story.paragraphs.map((paragraph, index) => (
                  <RichText
                    key={index}
                    html={paragraph}
                    className="font-outfit text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-black"
                  />
                ))}
              </div>
            </div>

            {/* Right Side - Image */}
            <div className="flex items-center justify-center">
              <div className="relative">
                <img
                  src={content.story.image}
                  alt={content.story.imageAlt}
                  className="max-w-full w-auto h-auto object-contain"
                  width={338}
                  height={462}
                  loading="lazy"
                />
                {/* Fade-out gradient at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-[80px] bg-gradient-to-t from-white to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      )}

      {/* Mission & Vision Section */}
      {(content.missionVision.mission.heading || content.missionVision.vision.heading) && (
      <div className="bg-brand-accent-dark py-[40px] md:py-[60px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[80%]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[8%]">
            {/* Mission */}
            <div className="text-center lg:text-left">
              <h2 className="font-playfair text-[32px] md:text-[40px] leading-tight text-brand-accent pb-[15px] md:pb-[20px]">
                {content.missionVision.mission.heading}
              </h2>
              <RichText
                html={content.missionVision.mission.text}
                className="font-outfit text-[16px] md:text-[18px] leading-[26px] md:leading-[30px] text-white"
              />
            </div>

            {/* Vision */}
            <div className="text-center lg:text-left">
              <h2 className="font-playfair text-[32px] md:text-[40px] leading-tight text-brand-accent pb-[15px] md:pb-[20px]">
                {content.missionVision.vision.heading}
              </h2>
              <RichText
                html={content.missionVision.vision.text}
                className="font-outfit text-[16px] md:text-[18px] leading-[26px] md:leading-[30px] text-white"
              />
            </div>
          </div>
        </div>
      </div>

      )}

      {/* Team Section */}
      {teamMembers.length > 0 && (
      <div className="bg-white pt-[40px] md:pt-[60px] pb-[30px] md:pb-[54px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
          <div className="text-center mb-[30px] md:mb-[50px]">
            <div className="mb-[10px]">
              <DynamicHeading
                tag={content.headingTags?.["team.sectionLabel"]}
                defaultTag="h2"
                className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[rgb(107,141,12)]"
              >
                {content.team.sectionLabel}
              </DynamicHeading>
            </div>
            <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black">
              {content.team.heading.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < content.team.heading.split("\n").length - 1 && (
                    <br className="hidden md:block" />
                  )}
                </span>
              ))}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {teamMembers.map((member, index) => (
              <TeamMemberCard key={index} {...member} />
            ))}
          </div>
        </div>
      </div>

      )}

      {/* Core Values Section */}
      {coreValues.length > 0 && (
      <div className="bg-brand-dark py-[40px] md:py-[60px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
          <div className="text-center mb-[30px] md:mb-[50px]">
            <div className="mb-[10px]">
              <DynamicHeading
                tag={content.headingTags?.["values.sectionLabel"]}
                defaultTag="h2"
                className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent"
              >
                {content.values.sectionLabel}
              </DynamicHeading>
            </div>
            <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-white">
              {content.values.heading}
            </p>
            {content.values.subtitle && (
              <p className="font-outfit text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-white/80 mt-[15px]">
                {content.values.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-[5%]">
            {coreValues.map((value, index) => (
              <ValueCard key={index} {...value} />
            ))}
          </div>
        </div>
      </div>

      )}

      {/* Stats Section */}
      {stats.length > 0 && (
      <div className="bg-white py-[30px] md:py-[40px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%]">
          <StatsGrid stats={stats} />
        </div>
      </div>

      )}

      {/* Why Choose Us Section */}
      {whyChooseUs.length > 0 && (
      <div className="bg-white pt-[30px] md:pt-[40px] pb-[40px] md:pb-[60px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[80%]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-[8%]">
            {/* Left Side - Heading + Image */}
            <div>
              <div className="mb-[10px]">
                <DynamicHeading
                  tag={content.headingTags?.["whyChooseUs.sectionLabel"]}
                  defaultTag="h2"
                  className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[rgb(107,141,12)]"
                >
                  {content.whyChooseUs.sectionLabel}
                </DynamicHeading>
              </div>
              <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[20px]">
                {content.whyChooseUs.heading}
              </p>
              <RichText
                html={content.whyChooseUs.description}
                className="font-outfit text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-black mb-[30px]"
              />
              {/* Stock image */}
              {content.whyChooseUs.image && (
                <div className="hidden lg:block">
                  <img
                    src={content.whyChooseUs.image}
                    alt={content.whyChooseUs.imageAlt || "Why Choose Us"}
                    className="w-full max-w-[400px] h-auto object-cover"
                    width={400}
                    height={300}
                    loading="lazy"
                  />
                </div>
              )}
            </div>

            {/* Right Side - Features List */}
            <div className="space-y-[20px] md:space-y-[30px]">
              {whyChooseUs.map((feature, index) => (
                <div key={index}>
                  <div className="mb-[15px] md:mb-[20px]">
                    <h3 className="font-outfit text-[22px] md:text-[28px] leading-tight md:leading-[28px] text-black pb-[10px]">
                      {feature.number}. {feature.title}
                    </h3>
                    <RichText
                      html={feature.description}
                      className="font-outfit text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-black"
                    />
                  </div>
                  {index < whyChooseUs.length - 1 && (
                    <div className="h-[1px] bg-brand-border/30"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      )}

      {/* Call to Action Section */}
      {content.cta.heading && (
      <div className="bg-brand-accent py-[40px] md:py-[60px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[80%]">
          <div className="text-center mb-[30px] md:mb-[40px]">
            <h2 className="font-playfair text-[36px] md:text-[48px] lg:text-[60px] leading-tight text-black pb-[15px]">
              {content.cta.heading}
            </h2>
            <RichText
              html={content.cta.description}
              className="font-outfit text-[18px] md:text-[22px] leading-[26px] md:leading-[32px] text-black/80"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-center md:items-start">
            <CallBox
              icon={PhoneIcon}
              title={phoneLabel}
              subtitle={phoneDisplay}
              phone={phoneNumber}
              className="bg-brand-accent-dark hover:bg-black"
              variant="dark"
            />
            <CallBox
              icon={Calendar}
              title={content.cta.secondaryButton.label}
              subtitle={content.cta.secondaryButton.sublabel}
              link={content.cta.secondaryButton.link}
              className="bg-brand-accent-dark hover:bg-black"
              variant="dark"
            />
          </div>
        </div>
      </div>
      )}
    </Layout>
  );
}

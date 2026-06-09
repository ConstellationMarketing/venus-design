import type { PracticeAreasIntroContent } from "@site/lib/cms/homePageTypes";

interface PracticeAreasSectionProps {
  content?: PracticeAreasIntroContent;
}

export default function PracticeAreasSection({ content }: PracticeAreasSectionProps) {
  // Guard: if no meaningful content, don't render
  if (!content || (!content.heading && !content.sectionLabel)) {
    return null;
  }

  const data = content;

  return (
    <div className="bg-brand-dark py-[15px] md:py-[20px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] py-[20px] md:py-[27px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:gap-[5.5%]">
          {/* Left Column - Section Label + Heading */}
          <div className="md:w-full">
            {data.sectionLabel && (
              <p className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent mb-[10px]">
                {data.sectionLabel}
              </p>
            )}
            {data.heading && (
              <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-white pb-[10px]">
                {data.heading}
              </h2>
            )}
          </div>

          <div className="md:w-full" />
        </div>
      </div>
    </div>
  );
}

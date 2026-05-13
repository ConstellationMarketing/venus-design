import { Scale } from "lucide-react";
import { Link } from "react-router-dom";
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

          {/* Right Column - Discover CTA */}
          {(data.buttonTextLine1 || data.buttonTextLine2) && (
            <div className="md:w-full flex items-center">
              <Link
                to={data.buttonLink || "/practice-areas/"}
                className="bg-brand-accent p-[8px] w-full max-w-[400px] mx-auto md:mx-auto cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group block"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-white p-[15px] mt-1 flex items-center justify-center group-hover:bg-black transition-colors duration-300">
                    <Scale className="w-8 h-8 text-black group-hover:text-white transition-colors duration-300" />
                  </div>
                  <div className="flex-1">
                    <p className="font-outfit text-[16px] md:text-[18px] leading-tight text-black pb-[10px] group-hover:text-white transition-colors duration-300">
                      {data.buttonTextLine1}
                    </p>
                    <p className="font-outfit text-[18px] md:text-[24px] text-black leading-none group-hover:text-white transition-colors duration-300">
                      {data.buttonTextLine2}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { Scale } from "lucide-react";
import type { ContentBlock } from "@site/lib/blocks";
import RichText from "@site/components/shared/RichText";
import CmsFormRenderer from "@site/components/shared/CmsFormRenderer";

interface ContactSectionBlockProps {
  block: Extract<ContentBlock, { type: "contact-section" }>;
}

export default function ContactSectionBlock({ block }: ContactSectionBlockProps) {
  return (
    <div className="bg-white pt-[30px] md:pt-[54px] relative">
      <div className="max-w-[1600px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] relative flex flex-col lg:flex-row gap-8 lg:gap-[3%]">
        {/* Left Side */}
        <div className="lg:w-[65.667%] relative">
          {/* Top Heading Section */}
          <div className="py-[4.2415%] relative w-full">
            <div className="relative w-full">
              <div className="mb-[10px]">
                <p className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[#6b8d0c]">
                  {block.sectionLabel}
                </p>
              </div>
              <div>
                <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
                  {block.heading}
                </h2>
                <RichText
                  html={block.description}
                  className="font-outfit text-[16px] md:text-[24px] leading-[24px] md:leading-[36px] text-black"
                />
              </div>
            </div>
          </div>

          {/* Form Heading Panel */}
          <div
            className="relative w-full p-[30px]"
            style={{ backgroundColor: "rgba(29, 73, 70, 0.54)" }}
          >
            <div className="text-left">
              <h3 className="font-playfair text-[22px] md:text-[28px] leading-tight md:leading-[36.4px] text-white pb-[10px]">
                {block.formHeading}
              </h3>
              <p className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[28px] text-white font-light">
                Our intake team is available 24 hours a day, seven days a week
              </p>
              <div className="mt-[20px] md:mt-[30px] flex justify-start">
                <div className="bg-brand-accent p-[15px] inline-block">
                  <Scale
                    className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] text-black"
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:w-[31.3333%] relative p-[30px] pt-[30px] shadow-[0px_7px_29px_0px_rgba(100,100,111,0.2)]">
          <CmsFormRenderer formId="contact-block" className="p-[5px] mx-auto space-y-[25px]" />
        </div>
      </div>
    </div>
  );
}

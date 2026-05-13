import { Phone, Calendar } from "lucide-react";
import type { ContentBlock } from "@site/lib/blocks";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import CallBox from "@site/components/shared/CallBox";
import RichText from "@site/components/shared/RichText";

interface ContentSectionBlockProps {
  block: Extract<ContentBlock, { type: "content-section" }>;
  index: number;
}

export default function ContentSectionBlock({ block, index }: ContentSectionBlockProps) {
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();
  const imageOnLeft = block.imagePosition === "left";
  const showCTAs = block.showCTAs !== false;
  const hasSidebar = showCTAs || !!block.image;

  return (
    <div className={`py-[40px] md:py-[60px] ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        <div
          className={`flex flex-col ${imageOnLeft ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 lg:gap-[5%] items-start`}
        >
          {/* Rich Text Content */}
          <div className={hasSidebar ? "lg:w-[60%]" : "w-full"}>
            <RichText
              html={block.body}
              className="font-outfit text-[16px] md:text-[18px] leading-[26px] md:leading-[30px] text-black/90 prose prose-lg max-w-none
                [&_h2]:font-playfair [&_h2]:text-[28px] [&_h2]:md:text-[36px] [&_h2]:leading-tight [&_h2]:text-black [&_h2]:mb-4
                [&_h3]:font-playfair [&_h3]:text-[22px] [&_h3]:md:text-[28px] [&_h3]:leading-tight [&_h3]:text-black [&_h3]:mb-3
                [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4 [&_li]:mb-1"
            />
          </div>

          {/* Image + CTAs (sidebar) */}
          {hasSidebar && (
            <div className="lg:w-[35%]">
              {block.image && (
                <img
                  src={block.image}
                  alt={block.imageAlt || ""}
                  className="w-full h-auto object-cover mb-6"
                  loading="lazy"
                />
              )}

              {showCTAs && (
                <div className="flex flex-col gap-6">
                  <CallBox
                    icon={Phone}
                    title={phoneLabel}
                    subtitle={phoneDisplay}
                    phone={phoneNumber}
                  />
                  <CallBox
                    icon={Calendar}
                    title="Schedule Now"
                    subtitle="Free Consultation"
                    link="/contact/"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

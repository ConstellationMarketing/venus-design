import { Phone, Calendar } from "lucide-react";
import type { PracticeAreaContentSectionItem } from "@site/lib/cms/practiceAreaPageTypes";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import CallBox from "@site/components/shared/CallBox";
import RichText from "@site/components/shared/RichText";

interface PracticeAreaContentSectionProps {
  section: PracticeAreaContentSectionItem;
  index: number;
}

export default function PracticeAreaContentSection({
  section,
  index,
}: PracticeAreaContentSectionProps) {
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();
  const imageOnLeft = section.imagePosition === "left";
  const showCTAs = section.showCTAs !== false;

  return (
    <div className={`py-[40px] md:py-[60px] ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        <div
          className={`flex flex-col ${imageOnLeft ? "lg:flex-row-reverse" : "lg:flex-row"} gap-8 lg:gap-[5%] items-start`}
        >
          {/* Rich Text Content - larger column (full width when no sidebar) */}
          <div className={showCTAs || section.image ? "lg:w-[60%]" : "w-full"}>
            <RichText
              html={section.body}
              className="font-outfit text-[16px] md:text-[18px] leading-[26px] md:leading-[30px] text-black/90 prose prose-lg max-w-none
                [&_h2]:font-playfair [&_h2]:text-[28px] [&_h2]:md:text-[36px] [&_h2]:leading-tight [&_h2]:text-black [&_h2]:mb-4
                [&_h3]:font-playfair [&_h3]:text-[22px] [&_h3]:md:text-[28px] [&_h3]:leading-tight [&_h3]:text-black [&_h3]:mb-3
                [&_p]:mb-4 [&_ul]:mb-4 [&_ol]:mb-4 [&_li]:mb-1"
            />
          </div>

          {/* Image + CTAs - smaller column (hidden entirely when no image and no CTAs) */}
          {(showCTAs || section.image) && (
            <div className="lg:w-[35%]">
              {section.image && (
                <img
                  src={section.image}
                  alt={section.imageAlt || ""}
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

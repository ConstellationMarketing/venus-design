import { Phone } from "lucide-react";
import type { ContentBlock } from "@site/lib/blocks";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import CallBox from "@site/components/shared/CallBox";
import RichText from "@site/components/shared/RichText";

interface HeroBlockProps {
  block: Extract<ContentBlock, { type: "hero" }>;
}

export default function HeroBlock({ block }: HeroBlockProps) {
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();

  return (
    <div
      className="bg-brand-dark pt-[30px] md:pt-[54px] pb-[30px] md:pb-[54px] relative z-10"
      style={
        block.backgroundImage
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${block.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%]">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[5%]">
          {/* Left Side - Heading */}
          <div className="lg:w-[65%]">
            <h1 className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent mb-[10px]">
              {block.sectionLabel}
            </h1>

            <p className="font-playfair text-[clamp(2.5rem,7vw,68.8px)] font-light leading-[1.2] text-white mb-[20px] md:mb-[30px]">
              {block.tagline}
            </p>

            <RichText
              html={block.description}
              className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[30px] text-white/90"
            />
          </div>

          {/* Right Side - CallBox */}
          <div className="w-full lg:w-[30%] lg:flex lg:items-center">
            <CallBox
              icon={Phone}
              title={phoneLabel}
              subtitle={phoneDisplay}
              phone={phoneNumber}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

import { Phone, Calendar } from "lucide-react";
import type { ContentBlock } from "@site/lib/blocks";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import CallBox from "@site/components/shared/CallBox";
import RichText from "@site/components/shared/RichText";

interface CTABlockProps {
  block: Extract<ContentBlock, { type: "cta" }>;
}

export default function CTABlock({ block }: CTABlockProps) {
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();

  return (
    <div className="bg-brand-accent py-[40px] md:py-[60px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[80%]">
        <div className="text-center mb-[30px] md:mb-[40px]">
          <h2 className="font-playfair text-[36px] md:text-[48px] lg:text-[60px] leading-tight text-black pb-[15px]">
            {block.heading}
          </h2>
          <RichText
            html={block.description}
            className="font-outfit text-[18px] md:text-[22px] leading-[26px] md:leading-[32px] text-black/80"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-center md:items-start">
          <CallBox
            icon={Phone}
            title={phoneLabel}
            subtitle={phoneDisplay}
            phone={phoneNumber}
            className="bg-brand-accent-dark hover:bg-black"
            variant="dark"
          />
          {block.secondaryButton && (
            <CallBox
              icon={Calendar}
              title={block.secondaryButton.label}
              subtitle={block.secondaryButton.sublabel}
              link={block.secondaryButton.link}
              className="bg-brand-accent-dark hover:bg-black"
              variant="dark"
            />
          )}
        </div>
      </div>
    </div>
  );
}

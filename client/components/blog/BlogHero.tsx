import { Phone } from "lucide-react";
import CallBox from "@site/components/shared/CallBox";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import type { BlogHeroData } from "@site/lib/cms/publicLoaders";

interface BlogHeroProps {
  hero: BlogHeroData;
}

export default function BlogHero({ hero }: BlogHeroProps) {
  const { phoneNumber, phoneDisplay, phoneLabel } = useGlobalPhone();
  const sectionLabel = hero.title;
  const tagline = hero.subtitle;

  return (
    <div className="bg-brand-dark pt-[30px] md:pt-[54px] pb-[30px] md:pb-[54px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%]">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-[5%]">
          <div className="lg:w-[65%]">
            <h1 className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent mb-[10px]">
              {sectionLabel}
            </h1>
            <p className="font-playfair text-[clamp(2.5rem,7vw,68.8px)] font-light leading-[1.2] text-white mb-[20px] md:mb-[30px]">
              {tagline}
            </p>
          </div>

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

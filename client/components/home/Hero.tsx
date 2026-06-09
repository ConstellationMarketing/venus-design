import type { HeroContent } from "@site/lib/cms/homePageTypes";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import { ChevronDown } from "lucide-react";
import SiteLink from "../layout/SiteLink";

interface HeroProps {
  content: HeroContent;
}

function buildPhoneHref(phoneNumber: string, phoneDisplay: string) {
  const source = phoneNumber.trim() || phoneDisplay.trim();
  const digits = source.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

function getDisplayHeadlineLines(headline: string, highlightedText: string) {
  const source = headline.trim();
  const highlight = highlightedText.trim();

  if (!source) {
    return [];
  }

  let remaining = source;

  if (highlight) {
    const sourceLower = source.toLowerCase();
    const highlightLower = highlight.toLowerCase();
    const index = sourceLower.indexOf(highlightLower);

    if (index >= 0) {
      remaining = `${source.slice(0, index)} ${source.slice(index + highlight.length)}`;
    }
  }

  const lines = remaining
    .split(/\n|,/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (lines.length > 0) {
    return lines;
  }

  return highlight ? [] : [source];
}

export default function Hero({ content }: HeroProps) {
  const { phoneDisplay, phoneNumber } = useGlobalPhone();
  const phoneHref = buildPhoneHref(phoneNumber, phoneDisplay);
  const headlineLines = getDisplayHeadlineLines(content.headline, content.highlightedText);
  const primaryCtaLabel = content.primaryCtaLabel.trim() || "Contact Us";
  const primaryCtaUrl = content.primaryCtaUrl.trim() || "/contact/";
  const secondaryCtaLabel = content.secondaryCtaLabel.trim() || "Call Us Now";
  const hasAnyImage = Boolean(content.primaryImage || content.secondaryImage);

  return (
    <section className="bg-white pb-8 font-poppins text-black">
      <div className="mx-auto w-[90%] max-w-[2560px] px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="sr-only">{content.h1Title.trim() || content.headline.trim() || content.highlightedText.trim()}</h1>

            {headlineLines.length > 0 ? (
              <div className="mb-4">
                <p className="font-sawarabi text-[clamp(3rem,7vw,74px)] leading-[1.1] text-black">
                  {headlineLines.map((line, index) => (
                    <span key={`${line}-${index}`} className="block">
                      {line}{index < headlineLines.length - 1 ? "," : ""}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}

            {content.highlightedText.trim() ? (
              <div className="mb-12">
                <p className="inline-block bg-[#b0d9e1] px-2 font-playfair text-[clamp(3rem,7vw,74px)] italic leading-[1.1] text-black">
                  {content.highlightedText}
                </p>
              </div>
            ) : null}

            {content.description.trim() ? (
              <div className="mb-12 max-w-[720px]">
                <p className="text-[20px] leading-8 text-black md:text-[24px] md:leading-8">
                  {content.description}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-4">
              <SiteLink
                href={primaryCtaUrl}
                className="group inline-flex overflow-hidden text-[18px] leading-7 text-white"
              >
                <span className="flex items-center bg-[#e6446d] px-8 py-3 transition-colors duration-300 group-hover:bg-[#d13963]">
                  {primaryCtaLabel}
                </span>
                <span className="flex items-center justify-center bg-[#d13963] px-4 py-3 transition-colors duration-300 group-hover:bg-[#bb133e]">
                  <ChevronDown className="h-5 w-5" />
                </span>
              </SiteLink>

              {phoneHref ? (
                <a
                  href={phoneHref}
                  className="group inline-flex overflow-hidden text-[18px] leading-7 text-white"
                >
                  <span className="flex items-center bg-[#195dcd] px-8 py-3 transition-colors duration-300 group-hover:bg-[#0b4ab0]">
                    {secondaryCtaLabel}
                  </span>
                  <span className="flex items-center justify-center bg-[#002664] px-4 py-3 transition-colors duration-300 group-hover:bg-[#001d4d]">
                    <ChevronDown className="h-5 w-5" />
                  </span>
                </a>
              ) : null}
            </div>
          </div>

          {hasAnyImage ? (
            <div className="flex justify-center lg:justify-end">
              <div className="grid w-full max-w-[660px] gap-6">
                {content.primaryImage ? (
                  <img
                    src={content.primaryImage}
                    alt={content.primaryImageAlt || content.h1Title || "Homepage hero image"}
                    className="w-full max-w-full object-cover align-middle"
                    loading="eager"
                  />
                ) : null}
                {content.secondaryImage ? (
                  <img
                    src={content.secondaryImage}
                    alt={content.secondaryImageAlt || content.h1Title || "Homepage hero image"}
                    className="w-full max-w-full object-cover align-middle"
                    loading="eager"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

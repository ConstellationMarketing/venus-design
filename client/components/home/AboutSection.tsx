import { ChevronDown, User } from "lucide-react";
import type { AboutContent } from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import SiteLink from "@site/components/layout/SiteLink";

interface AboutSectionProps {
  content?: AboutContent;
  headingTag?: string;
}

function splitHeadingLines(value: string) {
  return value
    .split(/\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function ButtonWithArrow({
  href,
  label,
  colors,
}: {
  href: string;
  label: string;
  colors: {
    body: string;
    bodyHover: string;
    arrow: string;
    arrowHover: string;
  };
}) {
  return (
    <SiteLink href={href} className="group inline-flex overflow-hidden text-[18px] leading-7 text-white">
      <span className={`flex items-center px-8 py-3 transition-colors duration-300 ${colors.body} ${colors.bodyHover}`}>
        {label}
      </span>
      <span className={`flex items-center justify-center px-4 py-3 transition-colors duration-300 ${colors.arrow} ${colors.arrowHover}`}>
        <ChevronDown className="h-5 w-5" />
      </span>
    </SiteLink>
  );
}

export default function AboutSection({ content, headingTag }: AboutSectionProps) {
  if (!content || (!content.heading && !content.description && !content.attorneyImage)) {
    return null;
  }

  const data = content;
  const headingLines = splitHeadingLines(data.heading);
  const contactLabel = data.contactLabel.trim() || "Contact Us Today";
  const contactHref = data.contactText.trim() || "/contact/";
  const bannerTitle = data.ctaTitle.trim();
  const bannerButtonLabel = data.ctaButtonLabel.trim() || "Get started";
  const bannerButtonHref = data.ctaButtonLink.trim() || "/contact/";

  return (
    <section className="bg-white font-poppins text-black">
      <div className="mx-auto w-[90%] max-w-[2560px] px-4">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div
            className="min-h-[350px] bg-cover bg-center bg-no-repeat"
            style={data.attorneyImage ? { backgroundImage: `url(${data.attorneyImage})` } : undefined}
            aria-label={data.attorneyImageAlt || "Attorney image"}
            role={data.attorneyImage ? "img" : undefined}
          />

          <div className="bg-[#aecdff] px-8 py-10 md:px-12 md:py-12">
            {data.sectionLabel ? (
              <div className="mb-8">
                <DynamicHeading
                  tag={headingTag}
                  defaultTag="h2"
                  className="inline-flex items-center gap-3 bg-white px-8 py-2 text-[20px] leading-8 text-black md:text-[24px] md:leading-8"
                >
                  <User className="h-5 w-5 md:h-6 md:w-6" />
                  {data.sectionLabel}
                </DynamicHeading>
              </div>
            ) : null}

            {headingLines.length > 0 ? (
              <div className="mb-8">
                <h3 className="font-sawarabi text-[clamp(2.5rem,5vw,60px)] leading-[1.1] text-black">
                  {headingLines.map((line, index) => (
                    <span key={`${line}-${index}`} className="block pb-2 last:pb-0">
                      {line}
                    </span>
                  ))}
                </h3>
              </div>
            ) : null}

            {data.description ? (
              <div className="mb-10">
                <RichText
                  html={data.description}
                  className="text-[20px] leading-8 text-black md:text-[24px] md:leading-8 [&_p]:mb-0"
                />
              </div>
            ) : null}

            <ButtonWithArrow
              href={contactHref}
              label={contactLabel}
              colors={{
                body: "bg-[#002664]",
                bodyHover: "group-hover:bg-[#001333]",
                arrow: "bg-[#001333]",
                arrowHover: "group-hover:bg-[#000d24]",
              }}
            />
          </div>
        </div>
      </div>

      {(bannerTitle || data.ctaButtonLabel || data.ctaButtonLink) ? (
        <div className="mx-auto w-[90%] max-w-[2560px] px-4">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-[#ff8aa8] px-8 py-8 md:px-8 md:py-8">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <span className="text-[20px] leading-8 text-black md:text-[24px] md:leading-8">
                  {bannerTitle}
                </span>
                <ButtonWithArrow
                  href={bannerButtonHref}
                  label={bannerButtonLabel}
                  colors={{
                    body: "bg-[#e6446d]",
                    bodyHover: "group-hover:bg-[#d13963]",
                    arrow: "bg-[#d13963]",
                    arrowHover: "group-hover:bg-[#bb133e]",
                  }}
                />
              </div>
            </div>
            <div />
          </div>
        </div>
      ) : null}
    </section>
  );
}

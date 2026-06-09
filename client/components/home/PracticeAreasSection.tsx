import {
  Scale,
  Car,
  Briefcase,
  Users,
  Home,
  DollarSign,
  FileText,
  Heart,
  Shield,
  TrendingUp,
  Stethoscope,
  Building,
  Truck,
  Bike,
  Footprints,
  AlertTriangle,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type {
  PracticeAreasGridContent,
  PracticeAreasIntroContent,
} from "@site/lib/cms/homePageTypes";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import SiteLink from "@site/components/layout/SiteLink";

const iconMap: Record<string, LucideIcon> = {
  Car,
  Truck,
  Bike,
  Footprints,
  AlertTriangle,
  Building,
  FileText,
  Scale,
  Briefcase,
  Users,
  Home,
  DollarSign,
  Heart,
  Shield,
  TrendingUp,
  Stethoscope,
};

interface PracticeAreasSectionProps {
  intro?: PracticeAreasIntroContent;
  grid?: PracticeAreasGridContent;
  headingTags?: Record<string, string>;
}

function ButtonWithArrow({ href, label }: { href: string; label: string }) {
  return (
    <SiteLink href={href} className="group inline-flex overflow-hidden text-[18px] leading-7 text-white">
      <span className="flex items-center bg-[#e6446d] px-8 py-3 transition-colors duration-300 group-hover:bg-[#d13963]">
        {label}
      </span>
      <span className="flex items-center justify-center bg-[#d13963] px-4 py-3 transition-colors duration-300 group-hover:bg-[#bb133e]">
        <ChevronDown className="h-5 w-5" />
      </span>
    </SiteLink>
  );
}

export default function PracticeAreasSection({
  intro,
  grid,
  headingTags,
}: PracticeAreasSectionProps) {
  const featureItems = intro?.features ?? [];
  const areaItems = grid?.items ?? [];
  const showIntro = Boolean(intro && (intro.sectionLabel || intro.heading || featureItems.some((item) => item.title || item.image)));
  const showGrid = areaItems.length > 0;

  if (!showIntro && !showGrid) {
    return null;
  }

  return (
    <section className="bg-white py-12 md:py-16">
      <div className="mx-auto w-[90%] max-w-[2560px] px-4">
        {showIntro ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
            <div>
              {intro?.sectionLabel ? (
                <DynamicHeading
                  tag={headingTags?.["practiceAreasIntro.sectionLabel"]}
                  defaultTag="h2"
                  className="mb-3 text-[18px] leading-tight text-[#bb133e] md:text-[24px] md:leading-[36px]"
                >
                  {intro.sectionLabel}
                </DynamicHeading>
              ) : null}
              {intro?.heading ? (
                <h2 className="font-sawarabi text-[clamp(2.5rem,5vw,60px)] leading-[1.08] text-black">
                  {intro.heading.split(/\n/).map((line, index) => (
                    <span key={`${line}-${index}`} className="block">
                      {line}
                    </span>
                  ))}
                </h2>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {featureItems.map((feature, index) => {
                const featureTag = headingTags?.[`practiceAreasIntro.features.${index}.title`] ?? "h3";

                return (
                  <div key={index} className="overflow-hidden border border-black/10 bg-white">
                    {feature.image ? (
                      <img
                        src={feature.image}
                        alt={feature.imageAlt || feature.title || "Practice area feature"}
                        className="h-[180px] w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-[180px] w-full bg-black/5" />
                    )}
                    <div className="p-5">
                      <DynamicHeading
                        tag={featureTag}
                        defaultTag="h3"
                        className="font-playfair text-[24px] leading-tight text-black"
                      >
                        {feature.title}
                      </DynamicHeading>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {showGrid ? (
          <div className={showIntro ? "mt-12 md:mt-16" : ""}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {areaItems.map((area, index) => {
                const Icon = iconMap[area.icon] || Scale;

                return (
                  <SiteLink
                    key={index}
                    href={area.link}
                    className="group flex min-h-[220px] flex-col justify-between border border-black/10 bg-[#f7f7f7] p-6 transition-colors duration-300 hover:border-[#bb133e] hover:bg-white"
                  >
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#aecdff] text-black transition-colors duration-300 group-hover:bg-[#bb133e] group-hover:text-white">
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </div>
                    <h3 className="font-playfair text-[28px] leading-tight text-black transition-colors duration-300 group-hover:text-[#bb133e]">
                      {area.title}
                    </h3>
                  </SiteLink>
                );
              })}
            </div>

            {(grid?.ctaLabel || grid?.ctaLink) ? (
              <div className="mt-10 flex justify-center">
                <ButtonWithArrow
                  href={grid?.ctaLink || "/practice-areas/"}
                  label={grid?.ctaLabel || "View All Practice Areas"}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

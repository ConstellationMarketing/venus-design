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
  Plane,
  Diamond,
  User,
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
  Plane,
  Diamond,
  User,
};

const defaultPracticeAreaIcons: LucideIcon[] = [Car, Truck, Bike, Footprints];

function normalizeIconKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const iconAliases: Record<string, keyof typeof iconMap> = {
  car: "Car",
  auto: "Car",
  vehicle: "Car",
  truck: "Truck",
  bike: "Bike",
  bicycle: "Bike",
  motorcycle: "Bike",
  pedestrian: "Footprints",
  walk: "Footprints",
  footprints: "Footprints",
  warning: "AlertTriangle",
  alert: "AlertTriangle",
  alerttriangle: "AlertTriangle",
  building: "Building",
  property: "Building",
  file: "FileText",
  filetext: "FileText",
  document: "FileText",
  text: "FileText",
  scale: "Scale",
  scales: "Scale",
  briefcase: "Briefcase",
  business: "Briefcase",
  users: "Users",
  people: "Users",
  home: "Home",
  house: "Home",
  money: "DollarSign",
  dollarsign: "DollarSign",
  heart: "Heart",
  shield: "Shield",
  trending: "TrendingUp",
  trendingup: "TrendingUp",
  chart: "TrendingUp",
  medical: "Stethoscope",
  doctor: "Stethoscope",
  stethoscope: "Stethoscope",
  plane: "Plane",
  airplane: "Plane",
  diamond: "Diamond",
  user: "User",
  person: "User",
};

function resolvePracticeAreaIcon(iconName: string, title: string, index: number): LucideIcon {
  const directMatch = iconMap[iconName];

  if (directMatch) {
    return directMatch;
  }

  const normalizedIcon = normalizeIconKey(iconName);
  const aliasedIcon = normalizedIcon ? iconAliases[normalizedIcon] : undefined;

  if (aliasedIcon) {
    return iconMap[aliasedIcon];
  }

  const lowerTitle = title.toLowerCase();

  if (/(car|auto|vehicle)/.test(lowerTitle)) {
    return Car;
  }

  if (/truck/.test(lowerTitle)) {
    return Truck;
  }

  if (/(motorcycle|bike|bicycle)/.test(lowerTitle)) {
    return Bike;
  }

  if (/(pedestrian|walk|foot)/.test(lowerTitle)) {
    return Footprints;
  }

  if (/(medical|doctor|malpractice|hospital)/.test(lowerTitle)) {
    return Stethoscope;
  }

  if (/(business|employment|work|job)/.test(lowerTitle)) {
    return Briefcase;
  }

  if (/(estate|probate|family|child|custody)/.test(lowerTitle)) {
    return Users;
  }

  if (/(property|real estate|premises|building)/.test(lowerTitle)) {
    return Building;
  }

  return defaultPracticeAreaIcons[index % defaultPracticeAreaIcons.length] || Scale;
}

interface PracticeAreasSectionProps {
  intro?: PracticeAreasIntroContent;
  grid?: PracticeAreasGridContent;
  headingTags?: Record<string, string>;
}

function ButtonWithArrow({ href, label }: { href: string; label: string }) {
  return (
    <SiteLink
      href={href}
      className="group inline-flex overflow-hidden text-[18px] leading-7 text-white"
    >
      <span className="flex items-center bg-[#bb133e] px-8 py-3 transition-colors duration-300 group-hover:bg-[#a51037]">
        {label}
      </span>
      <span className="flex items-center justify-center bg-[#8f0f28] px-4 py-3 transition-colors duration-300 group-hover:bg-[#7b0d22]">
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
  const headingText = intro?.sectionLabel?.trim() || intro?.heading?.trim() || "";
  const showLeftPanel = Boolean(headingText || areaItems.length > 0);
  const showRightPanel = featureItems.some((item) => item.title || item.image);

  if (!showLeftPanel && !showRightPanel) {
    return null;
  }

  return (
    <section className="bg-white font-poppins text-[#333]">
      <div className="mx-auto w-[90%] max-w-[2560px] px-4">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="bg-[#f9d0de] px-10 py-10">
            {headingText ? (
              <div className="mb-16 mt-5">
                <DynamicHeading
                  tag={headingTags?.["practiceAreasIntro.sectionLabel"]}
                  defaultTag="h3"
                  className="font-sawarabi text-[32px] leading-10 text-[#333]"
                >
                  {headingText}
                </DynamicHeading>
              </div>
            ) : null}

            <div>
              {areaItems.map((area, index) => {
                const Icon = resolvePracticeAreaIcon(area.icon, area.title, index);

                return (
                  <SiteLink
                    key={index}
                    href={area.link}
                    className={`flex items-start border-b border-black pb-3 text-[#333] transition-opacity duration-300 hover:opacity-75 ${index > 0 ? "mt-8" : ""}`}
                  >
                    <div className="w-8 shrink-0">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                    <div className="ml-4">
                      <h4 className="text-[18px] leading-7 text-[#333]">
                        {area.title}
                      </h4>
                    </div>
                  </SiteLink>
                );
              })}
            </div>
          </div>

          <div className="px-12 py-16 md:px-12 md:py-16">
            <div className="grid gap-8 sm:grid-cols-2">
              {featureItems.map((feature, index) => {
                const featureTag = headingTags?.[`practiceAreasIntro.features.${index}.title`] ?? "h3";

                return (
                  <div key={index} className="text-left">
                    <div className="mb-8 inline-block text-left">
                      {feature.image ? (
                        <img
                          src={feature.image}
                          alt={feature.imageAlt || feature.title || "Practice area feature"}
                          className="h-[70px] w-auto max-w-full align-middle"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-[70px] w-[61px] bg-black/5" />
                      )}
                    </div>
                    <DynamicHeading
                      tag={featureTag}
                      defaultTag="h3"
                      className="font-sawarabi text-[36px] leading-10 text-[#333]"
                    >
                      {feature.title}
                    </DynamicHeading>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {(grid?.ctaLabel || grid?.ctaLink) ? (
        <div className="mx-auto w-[90%] max-w-[2560px] px-4">
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="bg-[#bb133e] px-6 py-6">
              <ButtonWithArrow
                href={grid?.ctaLink || "/practice-areas/"}
                label={grid?.ctaLabel || "See all services"}
              />
            </div>
            <div />
          </div>
        </div>
      ) : null}
    </section>
  );
}

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
  type LucideIcon,
} from "lucide-react";
import type { PracticeAreasGridContent } from "@site/lib/cms/homePageTypes";
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

interface PracticeAreasGridProps {
  grid?: PracticeAreasGridContent;
}

export default function PracticeAreasGrid({ grid }: PracticeAreasGridProps) {
  if (!grid?.items?.length) {
    return null;
  }

  return (
    <div className="bg-white">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {grid.items.map((area, index) => {
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
    </div>
  );
}

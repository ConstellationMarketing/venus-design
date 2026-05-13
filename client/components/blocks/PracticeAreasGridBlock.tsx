import type { ContentBlock } from "@site/lib/blocks";
import PracticeAreaCard from "@site/components/practice/PracticeAreaCard";
import RichText from "@site/components/shared/RichText";
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

interface PracticeAreasGridBlockProps {
  block: Extract<ContentBlock, { type: "practice-areas-grid" }>;
}

export default function PracticeAreasGridBlock({ block }: PracticeAreasGridBlockProps) {
  return (
    <div className="bg-white py-[40px] md:py-[60px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        {/* Section Header */}
        <div className="text-center mb-[30px] md:mb-[50px]">
          <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black">
            {block.heading}
          </h2>
          {block.description && (
            <RichText
              html={block.description}
              className="font-outfit text-[16px] md:text-[18px] leading-[24px] md:leading-[28px] text-black/80 mt-[15px] max-w-[800px] mx-auto"
            />
          )}
        </div>

        {/* Practice Areas Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {block.areas.map((area, index) => (
            <PracticeAreaCard
              key={index}
              icon={iconMap[area.icon] || Scale}
              title={area.title}
              description={area.description}
              image={area.image}
              imageAlt={area.imageAlt}
              link={area.link}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

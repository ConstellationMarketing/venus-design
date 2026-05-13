import { LucideIcon } from "lucide-react";
import RichText from "@site/components/shared/RichText";

interface ValueCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export default function ValueCard({
  icon: Icon,
  title,
  description,
}: ValueCardProps) {
  return (
    <div className="group">
      <div className="flex flex-col items-center text-center">
        {/* Icon Section */}
        <div className="mb-[20px] md:mb-[30px]">
          <div className="bg-brand-accent p-[20px] md:p-[25px] inline-block transition-all duration-300 group-hover:bg-white group-hover:scale-110">
            <Icon
              className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] text-black transition-colors duration-300"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Content Section */}
        <div>
          <h3 className="font-playfair text-[24px] md:text-[32px] leading-tight text-white pb-[10px] md:pb-[15px]">
            {title}
          </h3>
          <RichText
            html={description}
            className="font-outfit text-[14px] md:text-[16px] leading-[22px] md:leading-[26px] text-white/80"
          />
        </div>
      </div>
    </div>
  );
}

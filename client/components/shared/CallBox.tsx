import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface CallBoxProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Internal route link (uses React Router) */
  link?: string;
  /** Raw phone digits — when provided, the entire box becomes a tel: link */
  phone?: string;
  className?: string;
  variant?: "light" | "dark"; // light = black text on light bg, dark = white text on dark bg
}

/** Strip all non-digit characters for use in tel: href */
function toRawDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export default function CallBox({
  icon: Icon,
  title,
  subtitle,
  link,
  phone,
  className = "",
  variant = "light",
}: CallBoxProps) {
  // Text colors based on variant - only affects text, not icons
  const textColor = variant === "dark" ? "text-white" : "text-black";
  const textHoverColor =
    variant === "dark"
      ? ""
      : "group-hover:text-white transition-colors duration-300";

  const content = (
    <div
      className={`bg-brand-accent p-[8px] w-full lg:w-[340px] cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="bg-white p-[15px] mt-1 flex items-center justify-center group-hover:bg-black transition-colors duration-300">
          <Icon
            className="w-8 h-8 [&>*]:fill-none [&>*]:stroke-black group-hover:[&>*]:stroke-white transition-colors duration-300"
            strokeWidth={1.5}
          />
        </div>
        <div className="flex-1">
          <p
            className={`font-outfit text-[16px] md:text-[18px] leading-tight ${textColor} ${textHoverColor} pb-[10px]`}
          >
            {title}
          </p>
          <p
            className={`font-outfit text-[18px] md:text-[24px] ${textColor} ${textHoverColor} leading-none whitespace-nowrap`}
          >
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );

  // Phone link takes priority over route link
  if (phone) {
    const digits = toRawDigits(phone);
    return <a href={`tel:${digits}`} className="block">{content}</a>;
  }

  if (link) {
    return <Link to={link} className="block">{content}</Link>;
  }

  return content;
}

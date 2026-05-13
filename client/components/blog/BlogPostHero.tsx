import { Phone, Calendar as CalendarIcon, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";

interface BlogPostHeroProps {
  title: string;
  categoryName?: string | null;
  publishedDate: string;
  featuredImage?: string | null;
}

export default function BlogPostHero({
  title,
  categoryName,
  publishedDate,
  featuredImage,
}: BlogPostHeroProps) {
  const { phoneDisplay, phoneNumber, phoneLabel } = useGlobalPhone();

  const formattedDate = new Date(publishedDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="relative w-full min-h-[340px] md:min-h-[420px] lg:min-h-[480px] flex items-end">
      {/* Background */}
      {featuredImage ? (
        <>
          <img
            src={featuredImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
        </>
      ) : (
        <div className="absolute inset-0 bg-brand-dark" />
      )}

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 pt-20 md:pb-14 md:pt-28">
        {/* Category + Date */}
        <div className="flex items-center gap-3 mb-4 text-sm">
          {categoryName && (
            <span className="inline-flex items-center gap-1.5 bg-brand-accent/90 text-brand-dark font-semibold px-3 py-1 rounded-full text-xs uppercase tracking-wide">
              <Tag className="h-3 w-3" />
              {categoryName}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-gray-300">
            <CalendarIcon className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
        </div>

        {/* Title */}
        <h1
          className="text-3xl md:text-4xl lg:text-5xl xl:text-[3.25rem] font-light text-white leading-tight max-w-4xl"
          style={{ fontFamily: "Playfair Display, serif" }}
        >
          {title}
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <a
            href={`tel:${phoneNumber.replace(/\D/g, "")}`}
            className="inline-flex items-center gap-3 bg-brand-accent px-5 py-3 text-black font-outfit font-medium hover:bg-brand-accent-dark hover:text-white transition-colors duration-300"
          >
            <Phone className="h-5 w-5" strokeWidth={1.5} />
            <span>{phoneDisplay}</span>
          </a>
          <Link
            to="/contact/"
            className="inline-flex items-center gap-3 border border-white/40 px-5 py-3 text-white font-outfit font-medium hover:bg-white/10 transition-colors duration-300"
          >
            <CalendarIcon className="h-5 w-5" strokeWidth={1.5} />
            <span>Book a Consultation</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

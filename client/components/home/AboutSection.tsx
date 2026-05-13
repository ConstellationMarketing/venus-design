import { Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import type { AboutContent } from "@site/lib/cms/homePageTypes";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";

interface AboutSectionProps {
  content?: AboutContent;
  headingTag?: string;
}

export default function AboutSection({ content, headingTag }: AboutSectionProps) {
  // Guard: if no meaningful content, don't render
  if (!content || (!content.heading && !content.description)) {
    return null;
  }

  const data = content;
  const features = data.features || [];
  const stats = data.stats || [];
  const { phoneNumber, phoneLabel, phoneDisplay } = useGlobalPhone();

  return (
    <div className="bg-white pt-[30px] md:pt-[54px]">
      {/* Main Content Section */}
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] pt-[20px] md:pt-[27px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-[5.5%]">
          {/* Left Column - About Text and CTAs */}
          <div className="md:w-full">
            {/* About Us Label */}
            {data.sectionLabel && (
              <DynamicHeading
                tag={headingTag}
                defaultTag="h2"
                className="text-[rgb(107,141,12)] font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] mb-[10px]"
              >
                {data.sectionLabel}
              </DynamicHeading>
            )}

            {/* Subtitle */}
            <div className="mb-[20px] md:mb-[9.27%]">
              {data.heading && (
                <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
                  {data.heading}
                </p>
              )}
              {data.description && (
                <RichText
                  html={data.description}
                  className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[30px] text-black"
                />
              )}
            </div>

            {/* Call Us 24/7 Box */}
            <a href={`tel:${phoneNumber.replace(/\D/g, "")}`}>
              <div className="bg-brand-accent p-[8px] w-full max-w-[400px] mb-[9.27%] cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-[15px] mt-1 flex items-center justify-center group-hover:bg-black transition-colors duration-300">
                    <Phone
                      className="w-8 h-8 [&>*]:fill-none [&>*]:stroke-black group-hover:[&>*]:stroke-white transition-colors duration-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-outfit text-[16px] md:text-[18px] leading-tight text-black pb-[10px] group-hover:text-white transition-colors duration-300">
                      {phoneLabel}
                    </p>
                    <p className="font-outfit text-[28px] md:text-[40px] text-black leading-none group-hover:text-white transition-colors duration-300">
                      {phoneDisplay}
                    </p>
                  </div>
                </div>
              </div>
            </a>

            {/* Contact Us Box */}
            {data.contactLabel && (
              <Link to="/contact/" className="bg-brand-accent p-[8px] w-full max-w-[400px] cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group block">
                <div className="flex items-start gap-4">
                  <div className="bg-white p-[15px] mt-1 flex items-center justify-center group-hover:bg-black transition-colors duration-300">
                    <MessageCircle
                      className="w-8 h-8 [&>*]:fill-none [&>*]:stroke-black group-hover:[&>*]:stroke-white transition-colors duration-300"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-outfit text-[16px] md:text-[18px] leading-tight text-black pb-[10px] group-hover:text-white transition-colors duration-300">
                      {data.contactLabel}
                    </p>
                    <p className="font-outfit text-[18px] md:text-[24px] text-black leading-none group-hover:text-white transition-colors duration-300">
                      {data.contactText}
                    </p>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Middle Column - Image */}
          {data.attorneyImage && (
            <div className="md:w-full flex justify-center md:justify-start">
              <img
                src={data.attorneyImage}
                alt={data.attorneyImageAlt}
                className="max-w-full w-auto h-auto object-contain"
                width={462}
                height={631}
                loading="lazy"
              />
            </div>
          )}

          {/* Right Column - Features */}
          {features.length > 0 && (
            <div className="md:w-full space-y-[20px] md:space-y-[30px]">
              {features.map((feature, index) => (
                <div key={index}>
                  <div className="mb-[20px] md:mb-[30px]">
                    <h3 className="font-outfit text-[22px] md:text-[28px] leading-tight md:leading-[28px] text-black pb-[10px]">
                      {feature.number}. {feature.title}
                    </h3>
                    <RichText
                      html={feature.description}
                      className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[30px] text-black"
                    />
                  </div>
                  {index < features.length - 1 && (
                    <div className="h-[23px]">
                      <div className="inline-block w-full"></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {stats.length > 0 && (
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] py-[20px] md:py-[27px]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-[3%]">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="max-w-[550px] mx-auto">
                  <h4 className="font-[Crimson_Pro,Georgia,Times_New_Roman,serif] text-[40px] md:text-[60px] leading-tight md:leading-[60px] text-black pb-[10px]">
                    {stat.value}
                  </h4>
                  <div className="font-outfit text-[16px] md:text-[20px] font-light text-black text-center">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

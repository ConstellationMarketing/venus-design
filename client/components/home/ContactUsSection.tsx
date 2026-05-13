import { Scale } from "lucide-react";
import type { ContactContent } from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";
import CmsFormRenderer from "@site/components/shared/CmsFormRenderer";

interface ContactUsSectionProps {
  content?: ContactContent;
  headingTag?: string;
}

export default function ContactUsSection({ content, headingTag }: ContactUsSectionProps) {
  // Guard: if no meaningful content, don't render
  if (!content || (!content.heading && !content.sectionLabel)) {
    return null;
  }

  const data = content;
  const { settings } = useSiteSettings();

  // Fall back to Site Settings address when CMS address is empty
  const displayAddress = data.address ||
    [settings.addressLine1, settings.addressLine2].filter(Boolean).join(", ");

  return (
    <div className="bg-white pt-[30px] md:pt-[54px] relative">
      <div className="max-w-[1600px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] relative flex flex-col lg:flex-row gap-8 lg:gap-[3%]">
        {/* Left Side */}
        <div className="lg:w-[65.667%] relative">
          {/* Top Heading Section */}
          <div className="py-[4.2415%] relative w-full">
            <div className="relative w-full">
              {data.sectionLabel && (
                <div className="mb-[10px]">
                  <DynamicHeading
                    tag={headingTag}
                    defaultTag="h2"
                    className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-[#6b8d0c]"
                  >
                    {data.sectionLabel}
                  </DynamicHeading>
                </div>
              )}
              <div>
                {data.heading && (
                  <p className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
                    {data.heading}
                  </p>
                )}
                {data.description && (
                  <RichText
                    html={data.description}
                    className="font-outfit text-[16px] md:text-[24px] leading-[24px] md:leading-[36px] text-black"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Background Image Section with Two Parts */}
          <div
            className="relative w-full flex flex-col sm:flex-row pr-0 sm:pr-[20px]"
            style={data.backgroundImage
              ? {
                  backgroundImage: `url(${data.backgroundImage})`,
                  backgroundPosition: "50% 50%",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "cover",
                }
              : undefined}
          >
            {/* Left Image */}
            {data.image && (
              <div className="sm:w-[45.758%] sm:mr-[8.483%] relative -mt-[30px] ml-auto text-right">
                <img
                  src={data.image}
                  alt={data.imageAlt || "Contact Us"}
                  width={338}
                  height={462}
                  loading="lazy"
                  className="inline-block max-w-full w-[338px]"
                />
              </div>
            )}

            {/* Right Overlay Box */}
            {(data.formHeading || data.availabilityText) && (
              <div
                className="sm:w-[45.758%] relative p-[30px] ml-auto"
                style={{
                  backgroundColor: "rgba(29, 73, 70, 0.54)",
                }}
              >
                <div className="relative mb-[10px]">
                  <div className="table w-full mx-auto max-w-full">
                    <div className="table-cell w-[32px] leading-[0] mb-[30px]">
                      <span className="m-auto">
                        <span
                          className="inline-block opacity-0 bg-[#baea0] p-[20px_30px] text-[30px] leading-[30px] font-black"
                          style={{ fontFamily: "FontAwesome" }}
                        ></span>
                      </span>
                    </div>
                    <div className="table-cell align-top pl-[15px]"></div>
                  </div>
                </div>

                <div className="relative">
                  <div className="mx-auto max-w-full w-full text-center">
                    <div className="text-left">
                      {data.formHeading && (
                        <h3 className="font-playfair text-[22px] md:text-[28px] leading-tight md:leading-[36.4px] text-white pb-[10px]">
                          {data.formHeading}
                        </h3>
                      )}
                      {data.availabilityText && (
                        <div>
                          <p className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[28px] text-white font-light">
                            {data.availabilityText}
                          </p>
                        </div>
                      )}
                      <div className="mt-[20px] md:mt-[30px] flex justify-start">
                        <div className="bg-brand-accent p-[15px] inline-block">
                          <Scale
                            className="w-[40px] h-[40px] md:w-[50px] md:h-[50px] text-black"
                            strokeWidth={1.5}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:w-[31.3333%] relative p-[30px] pt-[30px] shadow-[0px_7px_29px_0px_rgba(100,100,111,0.2)]">
          <CmsFormRenderer formId="contact" className="p-[5px] mx-auto space-y-[25px]" />
        </div>
      </div>
    </div>
  );
}

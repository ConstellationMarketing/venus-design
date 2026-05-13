import type { AwardsContent } from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";

interface AwardsSectionProps {
  content?: AwardsContent;
  headingTag?: string;
}

export default function AwardsSection({ content, headingTag }: AwardsSectionProps) {
  // Guard: if no logos, don't render
  if (!content || !content.logos || content.logos.length === 0) {
    return null;
  }

  const data = content;
  const logos = data.logos;

  return (
    <div
      className="relative pt-[30px] md:pt-[54px]"
      style={{
        backgroundImage:
          "linear-gradient(rgb(6, 29, 27) 54%, rgb(255, 255, 255) 54%)",
      }}
    >
      <div className="max-w-[1640px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] flex flex-col lg:flex-row relative">
        {/* Left Side - Text Content */}
        <div className="lg:w-1/3 lg:min-w-[40%] bg-[rgb(239,239,239)] p-[30px] md:p-[40px] relative z-[2]">
          {data.sectionLabel && (
            <div className="mb-[10px]">
              <DynamicHeading
                tag={headingTag}
                defaultTag="h2"
                className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px]"
                style={{ color: "#6b8d0c" }}
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
                className="font-outfit text-[20px] leading-[30px] text-black"
              />
            )}
          </div>
        </div>

        {/* Right Side - Logo Grid */}
        <div className="lg:w-2/3 bg-[rgb(239,239,239)] relative z-[2]">
          {/* First Row */}
          {logos.slice(0, 4).length > 0 && (
            <div className="flex p-[50px] px-[30px] w-full">
              {logos.slice(0, 4).map((logo, index) => (
                <div
                  key={index}
                  className="bg-white flex-shrink-0"
                  style={{
                    width: "21.574%",
                    marginRight: index < 3 ? "4.569%" : "0",
                  }}
                >
                  <div className="text-center">
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      width={240}
                      height={155}
                      loading="lazy"
                      className="max-w-full inline-block"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Second Row */}
          {logos.slice(4, 8).length > 0 && (
            <div className="flex p-[50px] px-[30px] w-full">
              {logos.slice(4, 8).map((logo, index) => (
                <div
                  key={index}
                  className="bg-white flex-shrink-0"
                  style={{
                    width: "21.574%",
                    marginRight: index < 3 ? "4.569%" : "0",
                  }}
                >
                  <div className="text-center">
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      width={240}
                      height={155}
                      loading="lazy"
                      className="max-w-full inline-block"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

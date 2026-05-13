import type { ProcessContent, ProcessStep } from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";

interface ProcessSectionProps {
  content?: ProcessContent;
  headingTags?: Record<string, string>;
}

export default function ProcessSection({ content, headingTags }: ProcessSectionProps) {
  // Guard: if no steps, don't render
  if (!content || !content.steps || content.steps.length === 0) {
    return null;
  }

  const data = content;
  const steps = data.steps;

  return (
    <div className="bg-brand-dark pt-[30px] pb-[60px]">
      {/* Header Section */}
      <div className="max-w-[1080px] mx-auto w-[80%] py-[27px]">
        {data.sectionLabel && (
          <div className="text-center mb-[10px]">
            <DynamicHeading
              tag={headingTags?.["process.sectionLabel"]}
              defaultTag="h2"
              className="font-outfit text-[24px] leading-[36px]"
              style={{ color: "rgb(186, 234, 160)" }}
            >
              {data.sectionLabel}
            </DynamicHeading>
          </div>
        )}
        <div className="text-center">
          {data.headingLine1 && (
            <p className="font-playfair text-[28px] md:text-[40px] lg:text-[54px] leading-tight md:leading-[48.6px] text-white pb-[10px]">
              {data.headingLine1}
            </p>
          )}
          {data.headingLine2 && (
            <p className="font-playfair text-[28px] md:text-[40px] lg:text-[54px] leading-tight md:leading-[48.6px] text-white pb-[10px]">
              {data.headingLine2}
            </p>
          )}
        </div>
      </div>

      {/* Steps Grid */}
      <div className="max-w-[1600px] mx-auto w-[80%] flex flex-col md:flex-row gap-[3%]">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`md:w-[31.3333%] bg-[rgb(30,50,49)] p-[20px] ${
              index < steps.length - 1 ? "mb-4 md:mb-0" : ""
            }`}
          >
            {/* Step Number */}
            {step.number && (
              <div className="mb-[20px]">
                <p
                  className="font-outfit text-[24px] leading-[36px]"
                  style={{ color: "rgb(186, 234, 160)" }}
                >
                  {step.number}
                </p>
              </div>
            )}

            {/* Step Content */}
            <div className="mb-[30px]">
              {step.title && (
                <h3 className="font-outfit text-[32px] leading-[32px] text-white pb-[10px]">
                  {step.title}
                </h3>
              )}
              {step.description && (
                <RichText
                  html={step.description}
                  className="font-outfit text-[20px] leading-[30px] text-white"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

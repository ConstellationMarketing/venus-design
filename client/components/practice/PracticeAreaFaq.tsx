import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { PracticeAreaFaqContent } from "@site/lib/cms/practiceAreaPageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import { triggerDniRefreshAfterReveal } from "@site/components/layout/dniReveal";

interface PracticeAreaFaqProps {
  content: PracticeAreaFaqContent;
  headingTags?: Record<string, string>;
}

export default function PracticeAreaFaq({
  content,
  headingTags,
}: PracticeAreaFaqProps) {
  const [openIndex, setOpenIndex] = useState(0);

  if (!content.enabled) return null;

  const faqs = content.items || [];
  if (faqs.length === 0) return null;

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? -1 : index);
    triggerDniRefreshAfterReveal();
  };

  return (
    <div className="bg-white py-[40px] md:py-[60px]">
      {/* Header */}
      <div className="max-w-[1080px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] mb-[30px] md:mb-[40px]">
        <div className="text-center">
          <DynamicHeading
            tag={headingTags?.["faq.heading"]}
            defaultTag="h2"
            className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]"
          >
            {content.heading}
          </DynamicHeading>
          <RichText
            html={content.description}
            className="font-outfit text-[16px] md:text-[24px] leading-[24px] md:leading-[36px] text-black text-center"
          />
        </div>
      </div>

      {/* Accordion */}
      <div className="max-w-[900px] mx-auto w-[95%] md:w-[85%] lg:w-[80%]">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`border-[0.8px] border-[rgb(217,217,217)] ${
              index < faqs.length - 1 ? "mb-[12px]" : ""
            } ${openIndex === index ? "bg-brand-dark" : "bg-white"}`}
          >
            <button
              onClick={() => toggleFaq(index)}
              className={`w-full font-outfit text-[20px] md:text-[28px] leading-[28px] px-[20px] py-[20px] text-left flex items-center justify-between cursor-pointer ${
                openIndex === index ? "text-white" : "text-[rgb(67,67,67)]"
              }`}
            >
              <span className="pr-[50px]">{faq.question}</span>
              <ChevronDown
                className={`h-6 w-6 flex-shrink-0 transition-transform duration-200 ${
                  openIndex === index ? "rotate-180" : ""
                }`}
              />
            </button>
            <RichText
              html={faq.answer}
              hidden={openIndex !== index}
              aria-hidden={openIndex !== index}
              className="font-outfit text-[18px] md:text-[22px] leading-[28px] md:leading-[33px] font-light px-[20px] pb-[20px] pt-[10px] text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

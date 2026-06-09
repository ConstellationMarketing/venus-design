import { useEffect, useState } from "react";
import { ChevronDown, User } from "lucide-react";
import type { TestimonialsContent } from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";
import SiteLink from "@site/components/layout/SiteLink";

interface TestimonialsSectionProps {
  content?: TestimonialsContent;
  headingTag?: string;
}

function ButtonWithArrow({ href, label }: { href: string; label: string }) {
  return (
    <SiteLink
      href={href}
      className="group inline-flex overflow-hidden text-[18px] leading-7 text-white"
    >
      <span className="flex items-center bg-[#e6446d] px-8 py-3 transition-colors duration-300 group-hover:bg-[#d13963]">
        {label}
      </span>
      <span className="flex items-center justify-center bg-[#d13963] px-4 py-3 transition-colors duration-300 group-hover:bg-[#bb133e]">
        <ChevronDown className="h-5 w-5" />
      </span>
    </SiteLink>
  );
}

export default function TestimonialsSection({
  content,
  headingTag,
}: TestimonialsSectionProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const testimonials = content?.items ?? [];
  const currentTestimonial = testimonials[activeSlide] ?? null;
  const hasImage = Boolean(content?.backgroundImage);
  const hasButton = Boolean(content?.buttonLabel?.trim() || content?.buttonLink?.trim());
  const hasContent = Boolean(
    content?.sectionLabel?.trim()
      || content?.heading?.trim()
      || content?.description?.trim()
      || currentTestimonial
      || hasImage,
  );

  useEffect(() => {
    if (activeSlide > testimonials.length - 1) {
      setActiveSlide(0);
    }
  }, [activeSlide, testimonials.length]);

  useEffect(() => {
    if (testimonials.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % testimonials.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [testimonials.length]);

  if (!content || !hasContent) {
    return null;
  }

  return (
    <section className="bg-white py-14 font-poppins text-black">
      <div className="mx-auto mb-8 w-[80%] max-w-[2560px] px-4">
        {content.sectionLabel.trim() ? (
          <div className="mb-5 flex items-center gap-4">
            <div className="w-8 shrink-0 text-[#333]">
              <User className="h-6 w-6" strokeWidth={2} />
            </div>
            <DynamicHeading
              tag={headingTag}
              defaultTag="h2"
              className="text-[18px] leading-7 text-[#333]"
            >
              {content.sectionLabel}
            </DynamicHeading>
          </div>
        ) : null}

        {content.heading.trim() ? (
          <div>
            <p className="font-sawarabi text-[clamp(2.75rem,5vw,60px)] leading-[1.1] text-[#333] md:pb-2">
              {content.heading}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mx-auto w-[80%] max-w-[2560px] px-4">
        <div className={`grid gap-6 ${hasImage ? "lg:grid-cols-[40%_30%_30%]" : "lg:grid-cols-[55%_45%]"}`}>
          <div>
            {content.description.trim() ? (
              <div className="mb-8 max-w-[520px]">
                <RichText
                  html={content.description}
                  className="text-[24px] leading-8 text-black [&_p]:mb-0"
                />
              </div>
            ) : null}

            {hasButton ? (
              <ButtonWithArrow
                href={content.buttonLink.trim() || "/about/"}
                label={content.buttonLabel.trim() || "See what you get with Constellation"}
              />
            ) : null}
          </div>

          {hasImage ? (
            <div
              className="min-h-[300px] bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${content.backgroundImage})` }}
              aria-label={content.backgroundImageAlt || "Testimonial image"}
              role="img"
            />
          ) : null}

          <div className={`bg-[#dfdfd7] p-5 ${hasImage ? "" : "min-h-[300px]"}`}>
            {currentTestimonial ? (
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="relative">
                  <span className="absolute left-0 top-0 font-sawarabi text-[28px] leading-none text-black">&quot;</span>
                  <div className="px-4">
                    <RichText
                      html={currentTestimonial.text}
                      className="font-sawarabi text-[18px] leading-[27px] text-black [&_p]:mb-0"
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 font-sawarabi text-[28px] leading-none text-black">&quot;</span>
                </div>

                <div>
                  {currentTestimonial.author.trim() ? (
                    <p className="pt-2 text-right text-[16px] font-semibold text-[#333]">
                      {currentTestimonial.author}
                    </p>
                  ) : null}

                  {testimonials.length > 1 ? (
                    <div className="mt-4 flex justify-end gap-2">
                      {testimonials.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveSlide(index)}
                          className={`h-2.5 w-2.5 rounded-full transition-opacity ${index === activeSlide ? "bg-[#195dcd] opacity-100" : "bg-[#195dcd] opacity-35"}`}
                          aria-label={`Go to testimonial ${index + 1}`}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

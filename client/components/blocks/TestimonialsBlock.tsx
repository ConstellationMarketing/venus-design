import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContentBlock } from "@site/lib/blocks";
import RichText from "@site/components/shared/RichText";

interface TestimonialsBlockProps {
  block: Extract<ContentBlock, { type: "testimonials" }>;
}

export default function TestimonialsBlock({ block }: TestimonialsBlockProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const testimonials = block.items;

  if (!testimonials.length) return null;

  const nextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setActiveSlide(
      (prev) => (prev - 1 + testimonials.length) % testimonials.length,
    );
  };

  const goToSlide = (index: number) => {
    setActiveSlide(index);
  };

  return (
    <div className="bg-white py-[30px] md:py-[54px]">
      {/* Header Section */}
      <div className="max-w-[1080px] mx-auto w-[95%] md:w-[85%] lg:w-[80%] py-[20px] md:py-[27px]">
        <div className="text-center mb-[10px]">
          <p className="font-outfit text-[18px] md:text-[24px] leading-tight md:leading-[36px] text-brand-accent">
            {block.sectionLabel}
          </p>
        </div>
        <div className="text-center">
          <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
            {block.heading}
          </h2>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-[1360px] mx-auto w-[90%] md:w-[85%] lg:w-[80%] py-[27px] flex flex-col lg:flex-row gap-8 lg:gap-[3%]">
        {/* Left Side - Image */}
        {block.backgroundImage && (
          <div className="lg:w-[48.5%] flex items-center justify-center">
            <img
              src={block.backgroundImage}
              alt={block.backgroundImageAlt || "Testimonials"}
              width={609}
              height={530}
              loading="lazy"
              className="max-w-full"
            />
          </div>
        )}

        {/* Right Side - Carousel */}
        <div className={`${block.backgroundImage ? "lg:w-[48.5%]" : "w-full max-w-[700px] mx-auto"} relative group`}>
          {/* Carousel Container */}
          <div className="relative min-h-[400px] overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="w-full flex-shrink-0 bg-white bg-[url('/images/backgrounds/quote-bg.png')] bg-no-repeat bg-[position:left_10%_top_10%] px-[6%]"
                >
                  <div className="flex items-center min-h-[400px]">
                    <div className="w-full p-[30px]">
                      <RichText
                        html={testimonial.text}
                        className="font-outfit text-[24px] leading-[31.2px] text-black pb-[10px] text-left"
                      />
                      <div className="font-outfit text-[24px] font-semibold text-black text-left">
                        {testimonial.ratingImage && (
                          <img
                            src={testimonial.ratingImage}
                            alt={testimonial.ratingImageAlt || "Rating"}
                            width={186}
                            height={34}
                            loading="lazy"
                            className="max-w-full mb-1"
                          />
                        )}
                        <br />
                        Posted By {testimonial.author}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          {testimonials.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(95,99,104)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] cursor-pointer bg-white/80 hover:bg-white p-2"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(95,99,104)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-[100] cursor-pointer bg-white/80 hover:bg-white p-2"
                aria-label="Next testimonial"
              >
                <ChevronRight className="w-8 h-8" />
              </button>

              {/* Pagination Dots */}
              <div className="absolute bottom-[20px] left-0 w-full text-center z-10">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`inline-block w-[7px] h-[7px] bg-brand-accent-dark border border-brand-accent ${
                      index === activeSlide ? "opacity-100" : "opacity-50"
                    } ${index < testimonials.length - 1 ? "mr-[10px]" : ""} cursor-pointer transition-opacity hover:opacity-100`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

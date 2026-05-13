import type {
  GoogleReviewsContent,
  GoogleReviewItem,
} from "@site/lib/cms/homePageTypes";
import RichText from "@site/components/shared/RichText";
import DynamicHeading from "@site/components/shared/DynamicHeading";

interface GoogleReviewsSectionProps {
  content?: GoogleReviewsContent;
  headingTag?: string;
}

export default function GoogleReviewsSection({
  content,
  headingTag,
}: GoogleReviewsSectionProps) {
  // Guard: if no reviews, don't render
  if (!content || !content.reviews || content.reviews.length === 0) {
    return null;
  }

  const data = content;
  const reviews = data.reviews;

  return (
    <div className="bg-white pt-[54px]">
      {/* Header Section */}
      <div className="max-w-[1080px] mx-auto w-[80%] py-[27px]">
        {data.sectionLabel && (
          <div className="text-center mb-[10px]">
            <DynamicHeading
              tag={headingTag}
              defaultTag="h2"
              className="font-outfit text-[24px] leading-[36px]"
              style={{ color: "#6b8d0c" }}
            >
              {data.sectionLabel}
            </DynamicHeading>
          </div>
        )}
        <div className="text-center">
          {data.heading && (
            <p className="font-playfair text-[28px] md:text-[40px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
              {data.heading}
            </p>
          )}
          {data.description && (
            <RichText
              html={data.description}
              className="font-outfit text-[24px] leading-[36px] text-black text-center"
            />
          )}
        </div>
      </div>

      {/* First Row - 3 Reviews */}
      {reviews.slice(0, 3).length > 0 && (
        <div className="max-w-[1600px] mx-auto w-[80%] flex flex-col md:flex-row gap-0 mb-[30px]">
          {reviews.slice(0, 3).map((review, index) => (
            <div
              key={index}
              className={`md:w-[31.3333%] border-[0.8px] border-[rgb(224,224,224)] p-[20px] ${
                index < 2 ? "md:mr-[3%] mb-4 md:mb-0" : ""
              }`}
            >
              <div className="mb-[30px]">
                {review.ratingImage && (
                  <div className="pb-[10px]">
                    <img
                      src={review.ratingImage}
                      alt={review.ratingImageAlt || "5 stars"}
                      width={186}
                      height={34}
                      loading="lazy"
                      className="max-w-full"
                    />
                  </div>
                )}
                <RichText
                  html={review.text}
                  className="font-outfit text-[22px] leading-[33px] text-black pb-[22px]"
                />
                <div className="font-outfit text-[22px] leading-[33px] text-black flex items-center justify-between">
                  <strong className="font-bold">{review.author}</strong>
                  <img
                    src="/images/logos/google-icon.png"
                    alt="Google"
                    width={24}
                    height={24}
                    loading="lazy"
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Second Row - 3 Reviews */}
      {reviews.slice(3, 6).length > 0 && (
        <div className="max-w-[1600px] mx-auto w-[80%] flex flex-col md:flex-row gap-0">
          {reviews.slice(3, 6).map((review, index) => (
            <div
              key={index}
              className={`md:w-[31.3333%] border-[0.8px] border-[rgb(224,224,224)] p-[20px] ${
                index < 2 ? "md:mr-[3%] mb-4 md:mb-0" : ""
              }`}
            >
              <div className="mb-[30px]">
                {review.ratingImage && (
                  <div className="pb-[10px]">
                    <img
                      src={review.ratingImage}
                      alt={review.ratingImageAlt || "5 stars"}
                      width={186}
                      height={34}
                      loading="lazy"
                      className="max-w-full"
                    />
                  </div>
                )}
                <RichText
                  html={review.text}
                  className="font-outfit text-[22px] leading-[33px] text-black pb-[22px]"
                />
                <div className="font-outfit text-[22px] leading-[33px] text-black flex items-center justify-between">
                  <strong className="font-bold">{review.author}</strong>
                  <img
                    src="/images/logos/google-icon.png"
                    alt="Google"
                    width={24}
                    height={24}
                    loading="lazy"
                    className="max-w-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

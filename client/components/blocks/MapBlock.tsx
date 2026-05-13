import type { ContentBlock } from "@site/lib/blocks";
import RichText from "@site/components/shared/RichText";

interface MapBlockProps {
  block: Extract<ContentBlock, { type: "map" }>;
}

export default function MapBlock({ block }: MapBlockProps) {
  return (
    <div className="bg-white py-[40px] md:py-[60px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        {(block.heading || block.subtext) && (
          <div className="text-center mb-[20px] md:mb-[30px]">
            {block.heading && (
              <h2 className="font-playfair text-[32px] md:text-[48px] lg:text-[54px] leading-tight md:leading-[54px] text-black pb-[10px]">
                {block.heading}
              </h2>
            )}
            {block.subtext && (
              <RichText
                html={block.subtext}
                className="font-outfit text-[16px] md:text-[20px] leading-[24px] md:leading-[30px] text-black/80"
              />
            )}
          </div>
        )}

        <div className="w-full h-[400px] md:h-[500px]">
          <iframe
            src={block.mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location Map"
          />
        </div>
      </div>
    </div>
  );
}

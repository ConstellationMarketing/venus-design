import type { ContentBlock } from "@site/lib/blocks";
import DynamicHeading from "@site/components/shared/DynamicHeading";

interface HeadingBlockProps {
  block: Extract<ContentBlock, { type: "heading" }>;
}

export default function HeadingBlock({ block }: HeadingBlockProps) {
  return (
    <div className="py-[20px] md:py-[30px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        <DynamicHeading
          tag={`h${block.level}`}
          defaultTag="h2"
          className="font-playfair text-[32px] md:text-[42px] lg:text-[48px] leading-tight text-black"
        >
          {block.text}
        </DynamicHeading>
      </div>
    </div>
  );
}

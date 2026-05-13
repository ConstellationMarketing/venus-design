import RichText from "@site/components/shared/RichText";

interface LegacyBlockProps {
  block: Record<string, unknown>;
}

/**
 * Fallback renderer for old/unknown block types.
 * Provides backwards compatibility for "paragraph" blocks and shows
 * a re-create message for everything else.
 */
export default function LegacyBlock({ block }: LegacyBlockProps) {
  // Backwards compat: old "paragraph" blocks render as basic rich text
  if (block.type === "paragraph" && typeof block.content === "string") {
    return (
      <div className="py-[20px] md:py-[30px]">
        <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
          <RichText
            html={block.content}
            className="font-outfit text-[16px] md:text-[18px] leading-[26px] md:leading-[30px] text-black/90 prose prose-lg max-w-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="py-[20px] md:py-[30px]">
      <div className="max-w-[2560px] mx-auto w-[95%] md:w-[90%] lg:w-[85%]">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-800">
          <strong>Legacy block</strong> ({String(block.type)}) — please re-create this section using the updated block types.
        </div>
      </div>
    </div>
  );
}

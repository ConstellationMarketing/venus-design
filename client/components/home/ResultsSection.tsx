import type { ResultsContent } from "@site/lib/cms/homePageTypes";

interface ResultsSectionProps {
  content?: ResultsContent;
}

export default function ResultsSection({ content }: ResultsSectionProps) {
  const items = content?.items ?? [];

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="bg-white pb-24 font-poppins text-black">
      <div className="mx-auto w-[90%] max-w-[1400px] px-4">
        <div className="bg-[#b0d9e1] py-8">
          <div className="grid gap-0 md:grid-cols-2 lg:grid-cols-4">
            {items.map((item, index) => (
              <div
                key={index}
                className={`px-5 py-5 text-center ${index < items.length - 1 ? "border-b border-black md:border-b-0 lg:border-r" : ""}`}
              >
                {item.image ? (
                  <div className="mb-8 flex justify-center">
                    <img
                      src={item.image}
                      alt={item.description || item.title}
                      className="max-w-full align-middle"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                {item.title.trim() ? (
                  <h3
                    className="whitespace-nowrap pb-2 text-center text-[clamp(3rem,7vw,90px)] leading-[1.1] text-black"
                    style={{ fontFamily: '"Bebas Neue", cursive', fontWeight: 400 }}
                  >
                    {item.title}
                  </h3>
                ) : null}

                {item.description.trim() ? (
                  <p className="text-center font-poppins text-[24px] font-normal leading-8 text-black">
                    {item.description}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

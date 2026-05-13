import { Phone } from "lucide-react";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";

export default function Hero() {
  const { phoneDisplay, phoneLabel, phoneNumber } = useGlobalPhone();

  return (
    <div className="max-w-[2560px] mx-auto w-[95%] py-[27px] my-[40px]">
      <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-[3%]">
        {/* Headline Section */}
        <div className="lg:w-[65.667%]">
          <div className="mb-[40px]">
            <div className="relative">
              <p className="font-playfair text-[clamp(2rem,5vw,68.8px)] font-light leading-[1.2] text-white text-left">
                {phoneLabel}
              </p>
            </div>
          </div>

          {/* Call Box */}
          <a
            href={`tel:${phoneNumber.replace(/\D/g, "")}`}
            className="bg-brand-accent p-[8px] w-full max-w-[400px] cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group block"
          >
            <div className="flex items-start gap-4">
              <div className="bg-white p-[15px] mt-1 flex items-center justify-center group-hover:bg-black transition-colors duration-300">
                <Phone
                  className="w-8 h-8 [&>*]:fill-none [&>*]:stroke-black group-hover:[&>*]:stroke-white transition-colors duration-300"
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1">
                <p className="font-outfit text-[18px] leading-[18px] text-black pb-[10px] font-normal group-hover:text-white transition-colors duration-300">
                  {phoneLabel}
                </p>
                <p className="font-outfit text-[clamp(1.5rem,4vw,40px)] text-black leading-tight group-hover:text-white transition-colors duration-300">
                  {phoneDisplay}
                </p>
              </div>
            </div>
          </a>
        </div>

        {/* Spacer for form (will be added separately) */}
        <div className="lg:w-[31.3333%]"></div>
      </div>
    </div>
  );
}

import React from "react";

import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Twitter,
  Phone,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";


const SOCIAL_ICON_MAP: Record<string, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
  twitter: Twitter,
};

const SOCIAL_LABEL_MAP: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "Youtube",
  linkedin: "LinkedIn",
  twitter: "X",
};

export default function Footer() {
  const { settings } = useSiteSettings();

const logoUrl = settings.logoUrl?.trim() || "";
const logoAlt = settings.logoAlt?.trim() || settings.siteName?.trim() || "Logo";

const phoneNumber = settings.phoneNumber?.trim() || "";
const phoneDisplay = settings.phoneDisplay?.trim() || "";
const phoneLabel = settings.phoneAvailability?.trim() || "";

const copyrightRaw = settings.copyrightText?.trim() || "";
const copyrightText = copyrightRaw.replace(/\{year\}/gi, String(new Date().getFullYear()));
const mapEmbedUrl = settings.mapEmbedUrl?.trim() || "";

const resourceLinks = settings.footerAboutLinks ?? [];
const practiceLinks = settings.footerPracticeLinks ?? [];
const resourcesHeading = settings.footerResourcesHeading?.trim() || "";
const practiceAreasHeading = settings.footerPracticeAreasHeading?.trim() || "";
const footerTaglineHtml = settings.footerTaglineHtml || "";

const enabledSocialLinks = (settings.socialLinks ?? []).filter((s) => s.enabled);


  return (
    <footer className="bg-brand-dark relative">
      {/* Top Section: Tagline and Call Box */}
      <div className="max-w-[2560px] mx-auto w-[95%] py-[20px] md:py-[27px] flex flex-col lg:flex-row lg:items-center gap-8">
        {/* Left: Tagline */}
        <div className="lg:w-[75%]">
          <div>
{footerTaglineHtml ? (
  <div
    className="font-playfair text-[clamp(2rem,6vw,59.136px)] leading-tight md:leading-[70.9632px] font-light text-white"
    dangerouslySetInnerHTML={{ __html: footerTaglineHtml }}
  />
) : null}

          </div>
        </div>

        {/* Right: Call Us Box */}
        <div className="lg:w-[25%]">
          <a href={`tel:${phoneNumber.replace(/\D/g, "")}`}>
            <div className="bg-brand-accent p-[8px] w-full ml-auto cursor-pointer transition-all duration-300 hover:bg-brand-accent-dark group">
              <div className="table w-full mx-auto max-w-full flex-row-reverse">
                <div className="table-cell w-[32px] leading-[0] mb-[30px]">
                  <span className="m-auto">
                    <span className="inline-block bg-white p-[15px] text-black group-hover:bg-black transition-colors duration-300">
                      <Phone
                        className="w-[31px] h-[31px] [&>*]:fill-none [&>*]:stroke-black group-hover:[&>*]:stroke-white transition-colors duration-300"
                        strokeWidth={1.5}
                      />
                    </span>
                  </span>
                </div>
                <div className="table-cell align-top pl-[15px]">
                  <p className="font-outfit text-[16px] md:text-[18px] leading-tight text-black pb-[10px] group-hover:text-white transition-colors duration-300">
                    {phoneLabel}
                  </p>
                  <div>
                    <p className="font-outfit text-[28px] md:text-[40px] leading-tight md:leading-[44px] text-black group-hover:text-white transition-colors duration-300 whitespace-nowrap">
                      {phoneDisplay}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Footer Links Section */}
      <div className="border-t border-b border-[#838383] max-w-[2560px] mx-auto w-[95%] py-[20px] md:py-[27px] flex flex-col lg:flex-row gap-6 md:gap-8 lg:gap-[3%]">
        {/* Logo Column */}
        <div className="lg:w-[20%] lg:mr-[3%]">
          <Link to="/" className="block">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={logoAlt}
                className="w-[200px] max-w-full"
                width={200}
                height={33}
              />
            ) : (
              <span className="font-outfit text-white text-[24px] leading-none">
                {settings.siteName || " "}
              </span>
            )}
          </Link>

        </div>

        {/* Resources Column */}
        <div className="lg:w-[20%] lg:mr-[3%]">
          <div className="font-outfit text-[18px] md:text-[24px] font-light leading-tight md:leading-[36px] text-white">
            {resourcesHeading ? (
              <h3 className="font-outfit text-[28px] md:text-[36px] leading-tight md:leading-[36px] text-white pb-[10px]">
                {resourcesHeading}
              </h3>
            ) : null}
              {resourceLinks.length > 0 ? (
                <ul className="text-[18px] md:text-[24px] font-light leading-tight md:leading-[36px] space-y-1">
                  {resourceLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href || "#"}
                        className="hover:text-brand-accent transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

          </div>
        </div>

        {/* Practice Areas Column */}
        <div className="lg:w-[20%] lg:mr-[3%]">
          <div className="font-outfit text-[18px] md:text-[24px] font-light leading-tight md:leading-[36px] text-white">
            {practiceAreasHeading ? (
              <h3 className="font-outfit text-[28px] md:text-[36px] leading-tight md:leading-[36px] text-white pb-[10px]">
                {practiceAreasHeading}
              </h3>
            ) : null}
              {practiceLinks.length > 0 ? (
                <ul className="text-[18px] md:text-[24px] font-light leading-tight md:leading-[36px] space-y-1">
                  {practiceLinks.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.href || "/practice-areas/"}
                        className="hover:text-brand-accent transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
          </div>
        </div>

        {/* Map Column */}
        <div className="lg:w-[40%] max-w-[900px]">
          <div className="relative">
            {mapEmbedUrl ? (
              <iframe
                src={mapEmbedUrl}
                width="100%"
                height="250"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-[250px]"
                title="Office Location"
              />
            ) : null}
          </div>
        </div>
</div>
      {/* Social Media Section */}
      <SocialLinksSection />


      {/* Copyright Section */}
      <div className="border-t border-[#838383] max-w-[2560px] mx-auto w-full py-[10px] px-[30px]">
        <div className="w-full mx-auto my-auto">
          <div className="font-outfit text-[18px] font-light leading-[27px] text-white text-center">
            {copyrightText ? <p>{copyrightText}</p> : null}
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Renders the social icon row; falls back to default set if CMS provides none */
function SocialLinksSection() {
  const { settings } = useSiteSettings();

  const socialLinks =
    settings.socialLinks?.filter((s) => s.enabled) ?? [];

  if (socialLinks.length === 0) return null;

  return (
    <div className="max-w-[1080px] mx-auto w-[80%] py-[20px]">
      <div className="w-full">
        <ul className="text-center leading-[26px]">
          {socialLinks.map((social, idx) => {
            const Icon = SOCIAL_ICON_MAP[social.platform];
            const label =
              SOCIAL_LABEL_MAP[social.platform] || social.platform;

            if (!Icon) return null;

            const isLast = idx === socialLinks.length - 1;

            return (
              <li key={social.platform} className="inline-block mb-[8px]">
                <a
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-block w-[52px] h-[52px] bg-[#142928] border border-[#616f6f] ${
                    isLast ? "" : "mr-[8px]"
                  } align-middle transition-all duration-300 hover:bg-brand-accent hover:border-brand-accent group flex items-center justify-center`}
                  title={`Follow on ${label}`}
                >
                  <Icon className="w-6 h-6 text-white group-hover:text-black transition-colors duration-300" />
                  <span className="sr-only">Follow on {label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

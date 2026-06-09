import type { ComponentType, SVGProps } from "react";
import {
  Facebook,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Twitter,
  Youtube,
} from "lucide-react";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";

const SOCIAL_ICON_MAP: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
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

function getPhoneHref(phoneNumber: string, phoneDisplay: string) {
  const source = phoneNumber.trim() || phoneDisplay.trim();
  const digits = source.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export default function Footer() {
  const { settings } = useSiteSettings();

  const footerTaglineHtml = settings.footerTaglineHtml || "";
  const copyrightRaw = settings.copyrightText?.trim() || "";
  const copyrightText = copyrightRaw.replace(/\{year\}/gi, String(new Date().getFullYear()));
  const mapEmbedUrl = settings.mapEmbedUrl?.trim() || "";
  const phoneDisplay = settings.phoneDisplay?.trim() || "";
  const phoneHref = getPhoneHref(settings.phoneNumber, phoneDisplay);
  const addressLine1 = settings.addressLine1?.trim() || "";
  const addressLine2 = settings.addressLine2?.trim() || "";
  const addressLines = [addressLine1, addressLine2].filter(Boolean);
  const enabledSocialLinks = (settings.socialLinks ?? []).filter((social) => social.enabled && social.url);

  const footerImages = [
    settings.footerPrimaryImageUrl?.trim() || "",
    settings.footerSecondaryImageUrl?.trim() || "",
  ].filter(Boolean);

  if (footerImages.length === 0 && settings.logoUrl?.trim()) {
    footerImages.push(settings.logoUrl.trim());
  }

  return (
    <footer className="bg-[#002664] py-12 font-poppins text-white">
      <div className="mx-auto w-[80%] max-w-[1441px] px-4">
        <div className="grid gap-12 lg:grid-cols-[36.7%_57.8%]">
          <div>
            {footerImages.length > 0 ? (
              <div className="mb-8 flex flex-wrap items-center gap-4 md:flex-nowrap">
                {footerImages.map((imageUrl, index) => (
                  <img
                    key={`${imageUrl}-${index}`}
                    alt={settings.siteName?.trim() || `Footer image ${index + 1}`}
                    loading="lazy"
                    src={imageUrl}
                    className="w-[177px] max-w-full object-contain"
                  />
                ))}
              </div>
            ) : null}

            {mapEmbedUrl ? (
              <div className="overflow-hidden rounded-sm">
                <iframe
                  src={mapEmbedUrl}
                  width="100%"
                  height="260"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[260px] w-full border-0"
                  title="Office Location"
                />
              </div>
            ) : null}
          </div>

          <div>
            {footerTaglineHtml ? (
              <div
                className="mb-8 text-[18px] leading-[29.25px] text-white [&_a]:text-white [&_p]:m-0 [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: footerTaglineHtml }}
              />
            ) : null}

            {phoneDisplay && phoneHref ? (
              <div className="mb-6 flex items-center gap-4">
                <div className="flex w-8 items-center justify-center text-[#e6446d]">
                  <Phone className="h-6 w-6" strokeWidth={2} />
                </div>
                <a
                  href={phoneHref}
                  className="text-[28px] font-bold leading-[42px] text-white transition-opacity hover:opacity-80"
                >
                  {phoneDisplay}
                </a>
              </div>
            ) : null}

            {addressLines.length > 0 ? (
              <div className="mb-6 flex items-start gap-4">
                <div className="flex w-8 items-center justify-center pt-1 text-[#e6446d]">
                  <MapPin className="h-6 w-6" strokeWidth={2} />
                </div>
                <p className="text-[28px] font-bold leading-[35px] text-white">
                  {addressLines.map((line, index) => (
                    <span key={`${line}-${index}`}>
                      {line}
                      {index < addressLines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              </div>
            ) : null}

            <SocialLinksSection socialLinks={enabledSocialLinks} />
          </div>
        </div>

        {copyrightText ? (
          <div className="mt-12 border-t border-white/20 pt-8 text-center text-[18px] leading-[29.25px] text-white">
            <p>{copyrightText}</p>
          </div>
        ) : null}
      </div>
    </footer>
  );
}

interface SocialLinksSectionProps {
  socialLinks: { platform: string; url: string; enabled: boolean }[];
}

function SocialLinksSection({ socialLinks }: SocialLinksSectionProps) {
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <ul className="flex gap-2">
      {socialLinks.map((social, index) => {
        const Icon = SOCIAL_ICON_MAP[social.platform];
        const label = SOCIAL_LABEL_MAP[social.platform] || social.platform;

        if (!Icon) {
          return null;
        }

        return (
          <li key={`${social.platform}-${index}`}>
            <a
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow on ${label}`}
              href={social.url}
              className="inline-flex h-8 w-8 items-center justify-center rounded bg-[#e6446d] transition-opacity hover:opacity-80"
            >
              <Icon className="h-4 w-4 text-white" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

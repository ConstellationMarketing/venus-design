import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Calendar, Phone } from "lucide-react";
import CallBox from "@site/components/shared/CallBox";
import { useGlobalPhone } from "@site/contexts/SiteSettingsContext";
import {
  DEFAULT_BLOG_SIDEBAR,
  loadBlogSidebarData,
  type BlogSidebarAwardImage,
} from "@site/lib/cms/publicLoaders";
import { getPreloadedBlogSidebar } from "@site/lib/preloadState";

let cachedSidebar = DEFAULT_BLOG_SIDEBAR;
let hasCachedSidebar = false;

export default function BlogSidebar() {
  const { pathname } = useLocation();
  const { phoneDisplay, phoneNumber, phoneLabel } = useGlobalPhone();
  const preloadedSidebar = getPreloadedBlogSidebar(pathname);
  const initialSidebar = preloadedSidebar || (hasCachedSidebar ? cachedSidebar : DEFAULT_BLOG_SIDEBAR);

  if (preloadedSidebar && !hasCachedSidebar) {
    cachedSidebar = preloadedSidebar;
    hasCachedSidebar = true;
  }

  const [attorneyImage, setAttorneyImage] = useState(initialSidebar.attorneyImage);
  const [awardImages, setAwardImages] = useState<BlogSidebarAwardImage[]>(initialSidebar.awardImages);

  useEffect(() => {
    let isMounted = true;

    async function fetchSidebarSettings() {
      if (hasCachedSidebar) {
        if (isMounted) {
          setAttorneyImage(cachedSidebar.attorneyImage);
          setAwardImages(cachedSidebar.awardImages);
        }
        return;
      }

      try {
        const sidebar = await loadBlogSidebarData();
        cachedSidebar = sidebar;
        hasCachedSidebar = true;

        if (isMounted) {
          setAttorneyImage(sidebar.attorneyImage);
          setAwardImages(sidebar.awardImages);
        }
      } catch (err) {
        console.error("Error fetching sidebar settings:", err);
      }
    }

    fetchSidebarSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside className="space-y-6">
      {attorneyImage && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <img
            src={attorneyImage}
            alt="Attorney"
            className="w-full h-auto object-cover"
            width={400}
            height={500}
          />
        </div>
      )}

      <CallBox
        icon={Phone}
        title={phoneLabel}
        subtitle={phoneDisplay}
        phone={phoneNumber}
        className="w-full md:w-full"
      />

      <CallBox
        icon={Calendar}
        title="Schedule Today"
        subtitle="Book a Consultation"
        link="/contact/"
        className="w-full md:w-full"
      />

      {awardImages.length > 0 && (
        <div className="space-y-4 pt-2">
          <h3
            className="text-lg font-semibold text-gray-900"
            style={{ fontFamily: "Playfair Display, serif" }}
          >
            Awards & Recognition
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {awardImages.map((award, index) => (
              <div
                key={award.src || index}
                className="bg-white border border-gray-100 rounded-md p-3 flex items-center justify-center"
              >
                <img
                  src={award.src}
                  alt={award.alt}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, ArrowRight, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";
import NavDropdown from "./NavDropdown";

export default function Header() {
  const { settings } = useSiteSettings();

  const logoUrl = settings.logoUrl?.trim() || "";
  const logoAlt =
    settings.logoAlt?.trim() || settings.siteName?.trim() || "Logo";

  const ctaText = settings.headerCtaText?.trim() || "";
  const ctaUrl = settings.headerCtaUrl?.trim() || "/contact";

  const navItems = [...(settings.navigationItems ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  return (
    <>
      {/* Top padding that scrolls away */}
      <div className="h-[30px]"></div>

      {/* Sticky header wrapper */}
      <div className="sticky top-0 z-50 pb-[30px]">
        <div className="max-w-[2560px] mx-auto w-[95%]">
          <div className="bg-brand-card border border-brand-border px-[30px] py-[10px] flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center w-[300px]">
              <Link to="/" className="mr-[30px]">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={logoAlt}
                    className="w-[306px] max-w-full"
                    width={306}
                    height={50}
                  />
                ) : (
                  <span className="font-outfit text-white text-[22px] leading-none">
                    {settings.siteName || " "}
                  </span>
                )}
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center flex-1 justify-end">
              <ul className="flex flex-wrap justify-end items-center -mx-[11px]">
                {navItems.map((item) => {
                  const hasChildren =
                    item.children && item.children.length > 0;

                  return (
                    <li key={item.href} className="px-[11px] flex items-center">
                      {hasChildren ? (
                        <NavDropdown item={item} />
                      ) : (
                        <Link
                          to={item.href}
                          target={
                            item.openInNewTab ? "_blank" : undefined
                          }
                          rel={
                            item.openInNewTab
                              ? "noopener noreferrer"
                              : undefined
                          }
                          className="font-outfit text-[20px] text-white py-[31px] mr-[20px] whitespace-nowrap hover:opacity-80 transition-opacity duration-400"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Contact CTA Button - Desktop */}
            <div className="hidden lg:block w-[280px]">
              {ctaText ? (
                <Button asChild className="bg-white text-black font-outfit text-[22px] py-[25px] px-[15.4px] h-auto w-[200px] hover:bg-brand-accent hover:text-white transition-all duration-300 flex items-center justify-center gap-2">
                  <Link to={ctaUrl}>
                    {ctaText}
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
              ) : null}
            </div>

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-brand-card border-brand-border"
              >
                <nav className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => {
                    const hasChildren =
                      item.children && item.children.length > 0;

                    return (
                      <MobileNavItem key={item.href} item={item} hasChildren={hasChildren} />
                    );
                  })}
                  {ctaText ? (
                    <Button asChild className="bg-white text-black font-outfit text-[22px] py-[25px] w-full hover:bg-brand-accent hover:text-white transition-all duration-300 flex items-center justify-center gap-2 mt-4">
                      <Link to={ctaUrl}>
                        {ctaText}
                        <ArrowRight className="w-5 h-5" />
                      </Link>
                    </Button>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Mobile nav item with collapsible children ── */

interface MobileNavItemProps {
  item: {
    label: string;
    href: string;
    openInNewTab?: boolean;
    children?: MobileNavItemProps["item"][];
  };
  hasChildren?: boolean;
}

function MobileNavItem({
  item,
  hasChildren,
}: MobileNavItemProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hasChildren) {
    return (
      <Link
        to={item.href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className="font-outfit text-[20px] text-white py-[10px] px-[5%] border-b border-black/5 hover:opacity-80 transition-opacity"
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center border-b border-black/5">
        <Link
          to={item.href}
          className="font-outfit text-[20px] text-white py-[10px] px-[5%] hover:opacity-80 transition-opacity flex-1"
        >
          {item.label}
        </Link>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-white/70 hover:text-white p-2 mr-2 transition-colors"
          aria-label={expanded ? "Collapse submenu" : "Expand submenu"}
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div className={`pl-[10%] py-1 ${expanded ? "block" : "hidden"}`}>
        {item.children!.map((child, idx) => (
          <div key={idx}>
            <Link
              to={child.href}
              target={child.openInNewTab ? "_blank" : undefined}
              rel={child.openInNewTab ? "noopener noreferrer" : undefined}
              className="block font-outfit text-[17px] text-white/80 py-[8px] hover:text-white transition-colors"
            >
              {child.label}
            </Link>
            {child.children && child.children.length > 0 && (
              <div className="pl-4 pb-1">
                {child.children.map((grandchild, grandchildIdx) => (
                  <Link
                    key={grandchildIdx}
                    to={grandchild.href}
                    target={grandchild.openInNewTab ? "_blank" : undefined}
                    rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                    className="block font-outfit text-[15px] text-white/65 py-[6px] hover:text-white transition-colors"
                  >
                    {grandchild.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

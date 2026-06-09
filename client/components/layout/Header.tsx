import { useState } from "react";
import { Menu, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useSiteSettings } from "@site/contexts/SiteSettingsContext";
import NavDropdown from "./NavDropdown";
import SiteLink from "./SiteLink";

function getPhoneHref(phoneNumber: string, phoneDisplay: string) {
  const source = phoneNumber.trim() || phoneDisplay.trim();
  const digits = source.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export default function Header() {
  const { settings } = useSiteSettings();

  const logoUrl = settings.logoUrl?.trim() || "";
  const logoAlt =
    settings.logoAlt?.trim() || settings.siteName?.trim() || "Logo";
  const phoneDisplay = settings.phoneDisplay?.trim() || "";
  const phoneHref = getPhoneHref(settings.phoneNumber, phoneDisplay);

  const navItems = [...(settings.navigationItems ?? [])].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );

  return (
    <header className="sticky top-0 z-50 bg-white py-4 font-poppins text-black">
      <div className="mx-auto w-[98%] max-w-[2560px] px-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-center gap-8 lg:mr-8">
            <div className="shrink-0">
              <SiteLink href="/" className="inline-block">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={logoAlt}
                    className="max-h-[40px] w-auto max-w-full align-middle"
                  />
                ) : (
                  <span className="text-[24px] font-medium leading-none text-black">
                    {settings.siteName || " "}
                  </span>
                )}
              </SiteLink>
            </div>

            <nav className="hidden min-w-0 flex-1 items-center justify-end lg:flex">
              <ul className="flex flex-wrap items-center justify-end gap-6">
                {navItems.map((item) => {
                  const hasChildren = Boolean(item.children && item.children.length > 0);

                  return (
                    <li key={`${item.label}-${item.href}`} className="list-none">
                      {hasChildren ? (
                        <NavDropdown item={item} />
                      ) : (
                        <SiteLink
                          href={item.href}
                          target={item.openInNewTab ? "_blank" : undefined}
                          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                          className="inline-block py-5 text-[18px] leading-7 text-black transition-colors duration-150 hover:text-[#bb133e]"
                        >
                          {item.label}
                        </SiteLink>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <Sheet>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Toggle menu"
                  className="ml-auto inline-flex items-center justify-center bg-transparent p-2 text-slate-950 transition-colors hover:text-[#bb133e] lg:hidden"
                >
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="border-l border-black/10 bg-white px-0">
                <SheetTitle className="sr-only">Site navigation</SheetTitle>
                <SheetDescription className="sr-only">
                  Browse the main site navigation links.
                </SheetDescription>
                <nav className="mt-10 flex flex-col">
                  {navItems.map((item) => {
                    const hasChildren = Boolean(item.children && item.children.length > 0);

                    return (
                      <MobileNavItem
                        key={`${item.label}-${item.href}`}
                        item={item}
                        hasChildren={hasChildren}
                      />
                    );
                  })}
                  {phoneDisplay && phoneHref ? (
                    <a
                      href={phoneHref}
                      className="px-6 pt-6 font-sawarabi text-[28px] leading-[42px] text-[#bb133e]"
                    >
                      {phoneDisplay}
                    </a>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          {phoneDisplay && phoneHref ? (
            <div className="hidden shrink-0 text-center lg:block">
              <a
                href={phoneHref}
                className="font-sawarabi text-[24px] leading-[36px] text-[#bb133e] transition-colors duration-150 hover:text-[#8f0f31]"
              >
                {phoneDisplay}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

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
      <SiteLink
        href={item.href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className="border-b border-black/10 px-6 py-4 text-[18px] leading-7 text-black transition-colors duration-150 hover:text-[#bb133e]"
      >
        {item.label}
      </SiteLink>
    );
  }

  return (
    <div className="border-b border-black/10">
      <div className="flex items-center">
        <SiteLink
          href={item.href}
          target={item.openInNewTab ? "_blank" : undefined}
          rel={item.openInNewTab ? "noopener noreferrer" : undefined}
          className="flex-1 px-6 py-4 text-[18px] leading-7 text-black transition-colors duration-150 hover:text-[#bb133e]"
        >
          {item.label}
        </SiteLink>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="p-4 text-slate-950 transition-colors hover:text-[#bb133e]"
          aria-label={expanded ? "Collapse submenu" : "Expand submenu"}
        >
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      <div className={expanded ? "block bg-black/[0.03]" : "hidden"}>
        {item.children?.map((child) => (
          <div key={`${child.label}-${child.href}`}>
            <SiteLink
              href={child.href}
              target={child.openInNewTab ? "_blank" : undefined}
              rel={child.openInNewTab ? "noopener noreferrer" : undefined}
              className="block px-10 py-3 text-[16px] leading-6 text-black/80 transition-colors duration-150 hover:text-[#bb133e]"
            >
              {child.label}
            </SiteLink>
            {child.children?.length ? (
              <div className="pb-2">
                {child.children.map((grandchild) => (
                  <SiteLink
                    key={`${grandchild.label}-${grandchild.href}`}
                    href={grandchild.href}
                    target={grandchild.openInNewTab ? "_blank" : undefined}
                    rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                    className="block px-14 py-2 text-[15px] leading-6 text-black/65 transition-colors duration-150 hover:text-[#bb133e]"
                  >
                    {grandchild.label}
                  </SiteLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

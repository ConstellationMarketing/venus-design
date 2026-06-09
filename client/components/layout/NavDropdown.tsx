import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import SiteLink from "./SiteLink";

interface NavDropdownItem {
  label: string;
  href: string;
  openInNewTab?: boolean;
  children?: NavDropdownItem[];
}

interface NavDropdownProps {
  item: NavDropdownItem;
}

export default function NavDropdown({ item }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <SiteLink
        href={item.href}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
        className="inline-flex items-center gap-1 py-5 text-[18px] leading-7 text-black transition-colors duration-150 hover:text-[#bb133e]"
      >
        {item.label}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </SiteLink>

      <div
        className={`absolute left-0 top-full min-w-[220px] border border-black/10 bg-white py-2 shadow-xl transition-all duration-200 ${
          open
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {item.children?.map((child) => {
          const hasGrandchildren = Boolean(child.children && child.children.length > 0);

          return (
            <div key={`${child.label}-${child.href}`} className="group/item relative">
              <SiteLink
                href={child.href}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between gap-4 px-5 py-2.5 text-[16px] text-black/90 transition-colors hover:bg-black/[0.03] hover:text-[#bb133e] whitespace-nowrap"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  if (!hasGrandchildren) {
                    setOpen(false);
                  }
                }}
              >
                <span>{child.label}</span>
                {hasGrandchildren ? <span className="text-black/40">›</span> : null}
              </SiteLink>
              {hasGrandchildren ? (
                <div className="invisible absolute left-full top-0 min-w-[220px] border border-black/10 bg-white py-2 opacity-0 shadow-xl transition-all duration-200 group-hover/item:visible group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:opacity-100">
                  {child.children?.map((grandchild) => (
                    <SiteLink
                      key={`${grandchild.label}-${grandchild.href}`}
                      href={grandchild.href}
                      target={grandchild.openInNewTab ? "_blank" : undefined}
                      rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                      className="block px-5 py-2.5 text-[16px] text-black/90 transition-colors hover:bg-black/[0.03] hover:text-[#bb133e] whitespace-nowrap"
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpen(false)}
                    >
                      {grandchild.label}
                    </SiteLink>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

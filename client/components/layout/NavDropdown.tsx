import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";

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

  // Close on outside click (safety net)
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
      <Link
        to={item.href}
        className="font-outfit text-[20px] text-white py-[31px] mr-[20px] whitespace-nowrap hover:opacity-80 transition-opacity duration-400 inline-flex items-center gap-1"
      >
        {item.label}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </Link>

      <div
        className={`absolute top-full left-0 mt-0 min-w-[220px] bg-brand-card border border-brand-border rounded-md shadow-xl z-50 py-2 transition-all duration-200 ${
          open
            ? "visible opacity-100 pointer-events-auto"
            : "invisible opacity-0 pointer-events-none"
        }`}
      >
        {item.children!.map((child, idx) => {
          const hasGrandchildren = child.children && child.children.length > 0;

          return (
            <div key={idx} className="group/item relative">
              <Link
                to={child.href}
                target={child.openInNewTab ? "_blank" : undefined}
                rel={child.openInNewTab ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between gap-4 px-5 py-2.5 font-outfit text-[16px] text-white/90 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  if (!hasGrandchildren) {
                    setOpen(false);
                  }
                }}
              >
                <span>{child.label}</span>
                {hasGrandchildren && <span className="text-white/50">›</span>}
              </Link>
              {hasGrandchildren && (
                <div className="invisible absolute left-full top-0 min-w-[220px] rounded-md border border-brand-border bg-brand-card py-2 opacity-0 shadow-xl transition-all duration-200 group-hover/item:visible group-hover/item:opacity-100 group-focus-within/item:visible group-focus-within/item:opacity-100">
                  {child.children!.map((grandchild, grandchildIdx) => (
                    <Link
                      key={grandchildIdx}
                      to={grandchild.href}
                      target={grandchild.openInNewTab ? "_blank" : undefined}
                      rel={grandchild.openInNewTab ? "noopener noreferrer" : undefined}
                      className="block px-5 py-2.5 font-outfit text-[16px] text-white/90 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap"
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpen(false)}
                    >
                      {grandchild.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

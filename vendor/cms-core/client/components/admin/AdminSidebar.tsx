import { Link, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  FileText,
  ArrowRightLeft,
  FileCode,
  Settings,
  LogOut,
  ExternalLink,
  Replace,
  Image,
  Users,
  Newspaper,
  BarChart3,
  Upload,
  FileInput,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { useUserRole } from "../../hooks/useUserRole";
import { useSiteSettings } from "../../hooks/useSiteSettings";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Pages", href: "/admin/pages", icon: FileText },
  { label: "Posts", href: "/admin/posts", icon: Newspaper },
  { label: "Forms", href: "/admin/forms", icon: FileInput },
  { label: "Media Library", href: "/admin/media", icon: Image },
  { label: "Site Settings", href: "/admin/site-settings", icon: Settings },
  { label: "Redirects", href: "/admin/redirects", icon: ArrowRightLeft, adminOnly: true },
  { label: "Search & Replace", href: "/admin/search-replace", icon: Replace, adminOnly: true },
  { label: "QA Scans", href: "/admin/qa", icon: BarChart3, adminOnly: true },
  { label: "Bulk Import", href: "/admin/bulk-import", icon: Upload, adminOnly: true },
  { label: "Templates", href: "/admin/templates", icon: FileCode, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { settings } = useSiteSettings();

  // Filter nav items based on user role
  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location.pathname === "/admin";
    }
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="sticky top-0 h-screen w-64 shrink-0 overflow-y-auto bg-slate-900 text-white flex flex-col">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold">CMS Admin</h1>
        <p className="text-sm text-slate-400 mt-1">{settings.siteName}</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive(item.href)
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-2">
        <a
          href={settings.siteUrl || "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors"
        >
          <ExternalLink className="h-5 w-5" />
          View Site
        </a>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

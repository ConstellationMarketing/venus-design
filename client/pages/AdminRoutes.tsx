import { lazy, Suspense, Component, type ReactNode, type ErrorInfo } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";

// Lazy load admin components from cms-core submodule
// This prevents the route scanner from following these imports at build time
const AdminLayout = lazy(
  () => import("../../vendor/cms-core/client/components/admin/AdminLayout"),
);
const AdminLogin = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminLogin"),
);
const AdminResetPassword = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminResetPassword"),
);
const AdminDashboard = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminDashboard"),
);
const AdminPages = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPages"),
);
const AdminPageNew = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPageNew"),
);
const AdminPageEdit = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPageEdit"),
);
const AdminRedirects = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminRedirects"),
);
const AdminTemplates = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminTemplates"),
);
const AdminTemplateNew = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminTemplateNew"),
);
const AdminTemplateEdit = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminTemplateEdit"),
);
const AdminMediaLibrary = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminMediaLibrary"),
);
const AdminUsers = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminUsers"),
);
const AdminSiteSettings = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminSiteSettings"),
);
const AdminSearchReplace = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminSearchReplace"),
);
const AdminPosts = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPosts"),
);
const AdminPostNew = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPostNew"),
);
const AdminPostEdit = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminPostEdit"),
);
const AdminQA = lazy(
  () => import("../../vendor/cms-core/client/pages/admin/AdminQA"),
);
const AdminBulkImport = lazy(
  () => import("./AdminBulkImport"),
);
const AdminForms = lazy(
  () => import("./admin/AdminForms"),
);
const AdminFormEdit = lazy(
  () => import("./admin/AdminFormEdit"),
);

// Loading fallback for admin pages
function AdminLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
        <p className="text-gray-600 text-sm">Loading admin...</p>
      </div>
    </div>
  );
}

// Error boundary to catch and display runtime errors instead of blank screens
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AdminErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AdminErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="max-w-lg w-full bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
              <h2 className="text-lg font-semibold text-red-800">
                Something went wrong
              </h2>
            </div>
            <pre className="text-sm text-red-700 bg-red-100 p-3 rounded overflow-auto max-h-48 mb-4">
              {this.state.error?.message || "Unknown error"}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Admin Routes Configuration
 *
 * - Login page is rendered WITHOUT the AdminLayout (no sidebar)
 * - All other admin pages are wrapped in AdminLayout which provides:
 *   - Sidebar navigation
 *   - Authentication checking (redirects to login if not authenticated)
 *   - Consistent layout structure
 *
 * NOTE: All admin components are lazy-loaded to improve route detection
 * performance and reduce initial bundle size.
 */
export default function AdminRoutes() {
  return (
    <AdminErrorBoundary>
    <Suspense fallback={<AdminLoading />}>
      <Routes>
        {/* Login and reset-password stay OUTSIDE the layout - no sidebar */}
        <Route path="login" element={<AdminLogin />} />
        <Route path="reset-password" element={<AdminResetPassword />} />

        {/* All protected routes wrapped in AdminLayout */}
        <Route element={<AdminLayout />}>
          {/* Default /admin -> /admin/dashboard */}
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />

          {/* Page management */}
          <Route path="pages" element={<AdminPages />} />
          <Route path="pages/new" element={<AdminPageNew />} />
          <Route path="pages/:id" element={<AdminPageEdit />} />

          {/* Post management */}
          <Route path="posts" element={<AdminPosts />} />
          <Route path="posts/new" element={<AdminPostNew />} />
          <Route path="posts/:id" element={<AdminPostEdit />} />

          {/* Form management */}
          <Route path="forms" element={<AdminForms />} />
          <Route path="forms/new" element={<AdminFormEdit />} />
          <Route path="forms/:id" element={<AdminFormEdit />} />

          {/* Content & media */}
          <Route path="media" element={<AdminMediaLibrary />} />
          <Route path="search-replace" element={<AdminSearchReplace />} />

          {/* Site configuration */}
          <Route path="site-settings" element={<AdminSiteSettings />} />
          <Route path="redirects" element={<AdminRedirects />} />
          <Route path="templates" element={<AdminTemplates />} />
          <Route path="templates/new" element={<AdminTemplateNew />} />
          <Route path="templates/:id" element={<AdminTemplateEdit />} />

          {/* User management */}
          <Route path="users" element={<AdminUsers />} />

          {/* QA Scans */}
          <Route path="qa" element={<AdminQA />} />

          {/* Bulk Import */}
          <Route path="bulk-import" element={<AdminBulkImport />} />

          {/* Catch-all inside /admin */}
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </Suspense>
    </AdminErrorBoundary>
  );
}

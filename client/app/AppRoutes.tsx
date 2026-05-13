import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import Index from "../pages/Index";
import AboutUs from "../pages/AboutUs";
import PracticeAreas from "../pages/PracticeAreas";
import PracticeAreaPage from "../pages/PracticeAreaPage";
import ContactPage from "../pages/ContactPage";
import BlogIndex from "../pages/BlogIndex";
import BlogPost from "../pages/BlogPost";
import DynamicPage from "../pages/DynamicPage";

const AdminRoutes = lazy(() => import("../pages/AdminRoutes"));

export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/about/" element={<AboutUs />} />
        <Route path="/practice-areas/" element={<PracticeAreas />} />
        <Route path="/practice-areas/:slug/" element={<PracticeAreaPage />} />
        <Route path="/contact/" element={<ContactPage />} />
        <Route path="/blog/" element={<BlogIndex />} />
        <Route path="/blog/:slug/" element={<BlogPost />} />
        <Route path="/admin/*" element={<AdminRoutes />} />
        <Route path="*" element={<DynamicPage />} />
      </Routes>
    </Suspense>
  );
}

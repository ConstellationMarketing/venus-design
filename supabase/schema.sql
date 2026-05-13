-- =============================================
-- CMS Starter — Full Database Schema
-- Run this entire script in a new Supabase project
-- =============================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. TABLES
-- =============================================

CREATE SEQUENCE IF NOT EXISTS pages_page_id_seq;

CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  page_id integer NOT NULL UNIQUE DEFAULT nextval('pages_page_id_seq'),
  title text NOT NULL,
  url_path text NOT NULL UNIQUE,
  page_type text NOT NULL DEFAULT 'standard'
    CHECK (page_type IN ('standard', 'practice', 'landing')),
  content jsonb DEFAULT '[]'::jsonb,
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  noindex boolean DEFAULT false,
  schema_type text,
  schema_data jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  name text NOT NULL,
  page_type text NOT NULL
    CHECK (page_type IN ('standard', 'practice', 'landing', 'post')),
  default_content jsonb DEFAULT '[]'::jsonb,
  default_meta_title text,
  default_meta_description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.redirects (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  from_path text NOT NULL UNIQUE,
  to_path text NOT NULL,
  status_code integer NOT NULL DEFAULT 301
    CHECK (status_code IN (301, 302)),
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  settings_key text NOT NULL UNIQUE DEFAULT 'global',
  site_name text,
  logo_url text,
  logo_alt text,
  favicon_source_url text,
  favicon_assets jsonb,
  phone_number text,
  phone_display text,
  phone_availability text,
  apply_phone_globally boolean DEFAULT true,
  header_cta_text text,
  header_cta_url text,
  navigation_items jsonb DEFAULT '[]'::jsonb,
  footer_about_links jsonb DEFAULT '[]'::jsonb,
  footer_practice_links jsonb DEFAULT '[]'::jsonb,
  footer_resources_heading text,
  footer_practice_areas_heading text,
  address_line1 text,
  address_line2 text,
  map_embed_url text,
  social_links jsonb DEFAULT '[]'::jsonb,
  copyright_text text,
  footer_tagline_html text,
  site_noindex boolean DEFAULT false,
  ga4_measurement_id text,
  google_ads_id text,
  google_ads_conversion_label text,
  head_scripts text,
  footer_scripts text,
  site_url text DEFAULT '',
  global_schema text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid
);

CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  file_name text NOT NULL,
  file_path text NOT NULL,
  public_url text NOT NULL,
  file_size integer,
  mime_type text,
  alt_text text,
  uploaded_by uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cms_users (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'editor'
    CHECK (role IN ('admin', 'editor')),
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.page_revisions (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  page_id uuid NOT NULL REFERENCES public.pages(id),
  page_id_snapshot integer,
  title text NOT NULL,
  url_path text NOT NULL,
  page_type text NOT NULL,
  content jsonb DEFAULT '[]'::jsonb,
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  noindex boolean DEFAULT false,
  status text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.post_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  featured_image text,
  category_id uuid REFERENCES public.post_categories(id),
  content jsonb DEFAULT '[]'::jsonb,
  body text DEFAULT '',
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image text,
  noindex boolean DEFAULT false,
  status text DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.blog_sidebar_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attorney_image text NOT NULL DEFAULT '',
  award_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.search_replace_audit (
  id uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  operation_id uuid NOT NULL,
  table_name text NOT NULL,
  row_id uuid NOT NULL,
  field_path text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  user_id uuid NOT NULL,
  rolled_back boolean DEFAULT false,
  rolled_back_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.cms_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]',
  submit_button_text text NOT NULL DEFAULT 'SUBMIT',
  success_message text NOT NULL DEFAULT 'Thank you! We will contact you soon.',
  redirect_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. HELPER FUNCTIONS
-- =============================================

-- Returns true if the current user is an admin in cms_users.
-- SECURITY DEFINER so it can bypass RLS to check its own table.
CREATE OR REPLACE FUNCTION public.is_cms_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cms_users
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- =============================================
-- 3. TRIGGER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_blog_sidebar_settings_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- 3. TRIGGERS
-- =============================================

CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER posts_updated_at_trigger
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_posts_updated_at();

CREATE TRIGGER blog_sidebar_settings_updated_at
  BEFORE UPDATE ON public.blog_sidebar_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_blog_sidebar_settings_updated_at();

CREATE TRIGGER update_cms_forms_updated_at
  BEFORE UPDATE ON public.cms_forms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 4. VIEWS
-- =============================================

CREATE OR REPLACE VIEW public.site_settings_public AS
SELECT
  id, settings_key, site_name, logo_url, logo_alt,
  phone_number, phone_display, phone_availability, apply_phone_globally,
  header_cta_text, header_cta_url, navigation_items,
  footer_about_links, footer_practice_links,
  footer_resources_heading, footer_practice_areas_heading,
  address_line1, address_line2, map_embed_url,
  social_links, copyright_text, footer_tagline_html,
  site_noindex, ga4_measurement_id, google_ads_id,
  google_ads_conversion_label, head_scripts, footer_scripts,
  site_url, updated_at, favicon_source_url, favicon_assets, global_schema
FROM site_settings;

-- =============================================
-- 5. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_sidebar_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_replace_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_forms ENABLE ROW LEVEL SECURITY;

-- Pages
CREATE POLICY "Public read published pages" ON public.pages
  FOR SELECT USING (status = 'published');
CREATE POLICY "Authenticated users can read all pages" ON public.pages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pages" ON public.pages
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pages" ON public.pages
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete pages" ON public.pages
  FOR DELETE TO authenticated USING (true);

-- Templates
CREATE POLICY "Public read templates" ON public.templates
  FOR SELECT USING (true);
CREATE POLICY "Auth manage templates" ON public.templates
  FOR ALL USING (auth.role() = 'authenticated');

-- Redirects
CREATE POLICY "Public read enabled redirects" ON public.redirects
  FOR SELECT USING (enabled = true);
CREATE POLICY "Auth manage redirects" ON public.redirects
  FOR ALL USING (auth.role() = 'authenticated');

-- Site Settings
CREATE POLICY "Public read site settings" ON public.site_settings
  FOR SELECT USING (true);
CREATE POLICY "Auth manage site settings" ON public.site_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Media
CREATE POLICY "Public read media" ON public.media
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert media" ON public.media
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update media" ON public.media
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete media" ON public.media
  FOR DELETE TO authenticated USING (true);

-- CMS Users
-- All authenticated users may read (needed for the role-lookup hook)
CREATE POLICY "Auth read cms users" ON public.cms_users
  FOR SELECT USING (auth.role() = 'authenticated');
-- Only admins may insert / update / delete CMS user records
CREATE POLICY "Admin insert cms users" ON public.cms_users
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update cms users" ON public.cms_users
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete cms users" ON public.cms_users
  FOR DELETE USING (public.is_cms_admin());

-- Page Revisions
CREATE POLICY "Auth read page revisions" ON public.page_revisions
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth manage page revisions" ON public.page_revisions
  FOR ALL USING (auth.role() = 'authenticated');

-- Post Categories
CREATE POLICY "post_categories_public_read" ON public.post_categories
  FOR SELECT USING (true);
CREATE POLICY "post_categories_auth_all" ON public.post_categories
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Posts
CREATE POLICY "posts_public_read_published" ON public.posts
  FOR SELECT USING (status = 'published' OR auth.role() = 'authenticated');
CREATE POLICY "posts_auth_all" ON public.posts
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Blog Sidebar Settings
CREATE POLICY "Anyone can read blog_sidebar_settings" ON public.blog_sidebar_settings
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update blog_sidebar_settings" ON public.blog_sidebar_settings
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Search Replace Audit
CREATE POLICY "Auth read audit" ON public.search_replace_audit
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth full access audit" ON public.search_replace_audit
  FOR ALL USING (auth.role() = 'authenticated');

-- CMS Forms
CREATE POLICY "Public can read cms_forms" ON public.cms_forms
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cms_forms" ON public.cms_forms
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cms_forms" ON public.cms_forms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete cms_forms" ON public.cms_forms
  FOR DELETE TO authenticated USING (true);

-- =============================================
-- 6. STORAGE BUCKET
-- =============================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','image/svg+xml','application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read media files" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');
CREATE POLICY "Authenticated users can update media files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');
CREATE POLICY "Authenticated users can delete media files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'media');

-- =============================================
-- 7. SEED DATA (required for app to function)
-- =============================================

-- App expects exactly one global settings row
INSERT INTO public.site_settings (settings_key) VALUES ('global')
ON CONFLICT (settings_key) DO NOTHING;

-- App expects exactly one blog sidebar settings row
INSERT INTO public.blog_sidebar_settings
  SELECT gen_random_uuid(), '', '[]'::jsonb, now()
  WHERE NOT EXISTS (SELECT 1 FROM public.blog_sidebar_settings);

-- -----------------------------------------
-- 7a. SEED PAGES (9 pages, all published)
-- -----------------------------------------
-- Structured pages store a JSON object; block-array pages store a JSON array.
-- The admin editor uses page_id (not url_path) to determine which editor to show.

-- page_id=1 : Home (structured — content filled by code-level defaults on first edit)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (1, 'Home', '/', 'standard', '{}'::jsonb, 'published', now(), 'Home', 'Welcome to our website.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=2 : About Us (structured)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (2, 'About Us', '/about/', 'standard', '{}'::jsonb, 'published', now(), 'About Us', 'Learn more about our firm and team.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=3 : Contact (structured)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (3, 'Contact', '/contact/', 'standard', '{}'::jsonb, 'published', now(), 'Contact Us', 'Get in touch with our team.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=4 : Practice Areas listing (structured)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (4, 'Practice Areas', '/practice-areas/', 'standard', '{}'::jsonb, 'published', now(), 'Practice Areas', 'Explore our areas of practice.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=6 : Blog (block array)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (6, 'Blog', '/blog/', 'standard',
  '[{"type":"hero","sectionLabel":"– Blog","tagline":"Latest News & Insights","description":"Stay informed with the latest articles, case studies, and legal insights from our team."},{"type":"recent-posts","sectionLabel":"– Recent Articles","heading":"Recent Articles","postCount":6}]'::jsonb,
  'published', now(), 'Blog', 'Read our latest articles and legal insights.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=7 : Privacy Policy (block array)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (7, 'Privacy Policy', '/privacy-policy/', 'standard',
  '[{"type":"hero","sectionLabel":"– Privacy Policy","tagline":"Your Privacy Matters","description":"Learn how we collect, use, and protect your personal information."},{"type":"content-section","body":"<h2>Information We Collect</h2><p>We collect information you provide directly to us, such as when you fill out a contact form, request a consultation, or communicate with us via email or phone.</p><h2>How We Use Your Information</h2><p>We use the information we collect to provide and improve our services, communicate with you, and comply with legal obligations.</p><h2>Information Sharing</h2><p>We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist us in operating our website and conducting our business.</p><h2>Data Security</h2><p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p><h2>Contact Us</h2><p>If you have any questions about this Privacy Policy, please contact us using the information on our Contact page.</p>","image":"","imageAlt":"","imagePosition":"left"}]'::jsonb,
  'published', now(), 'Privacy Policy', 'Our privacy policy and data protection practices.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=8 : Terms of Service (block array)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (8, 'Terms of Service', '/terms-of-service/', 'standard',
  '[{"type":"hero","sectionLabel":"– Terms of Service","tagline":"Terms & Conditions","description":"Please read these terms carefully before using our website and services."},{"type":"content-section","body":"<h2>Acceptance of Terms</h2><p>By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement.</p><h2>Use of Website</h2><p>This website is provided for informational purposes only. Nothing on this site constitutes legal advice or creates an attorney-client relationship.</p><h2>Intellectual Property</h2><p>All content on this website, including text, graphics, logos, and images, is the property of our firm and is protected by applicable intellectual property laws.</p><h2>Limitation of Liability</h2><p>We shall not be liable for any damages arising from the use or inability to use this website or the information contained herein.</p><h2>Governing Law</h2><p>These terms shall be governed by and construed in accordance with applicable laws.</p><h2>Changes to Terms</h2><p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting to this website.</p>","image":"","imageAlt":"","imagePosition":"left"}]'::jsonb,
  'published', now(), 'Terms of Service', 'Terms and conditions for using our website and services.')
ON CONFLICT (url_path) DO NOTHING;

-- page_id=9 : Thank You (block array)
INSERT INTO public.pages (page_id, title, url_path, page_type, content, status, published_at, meta_title, meta_description)
VALUES (9, 'Thank You', '/thank-you/', 'standard',
  '[{"type":"hero","sectionLabel":"– Thank You","tagline":"Thank You for Contacting Us","description":"We have received your message and will get back to you shortly."},{"type":"content-section","body":"<h2>What Happens Next?</h2><p>A member of our team will review your inquiry and respond within one business day. If your matter is urgent, please call us directly.</p><p>We appreciate your trust in our firm and look forward to assisting you.</p>","image":"","imageAlt":"","imagePosition":"left"}]'::jsonb,
  'published', now(), 'Thank You', 'Thank you for reaching out to us.')
ON CONFLICT (url_path) DO NOTHING;

-- Reset the page_id sequence so the next auto-generated page_id starts at 10
SELECT setval(pg_get_serial_sequence('public.pages', 'page_id'), 9);

-- -----------------------------------------
-- 7b. SEED POST CATEGORIES
-- -----------------------------------------
INSERT INTO public.post_categories (name, slug)
VALUES ('Sample Category 1', 'sample-category-1')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.post_categories (name, slug)
VALUES ('Sample Category 2', 'sample-category-2')
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------
-- 7c. SEED BLOG POSTS (3 posts, all published)
-- -----------------------------------------
INSERT INTO public.posts (title, slug, excerpt, featured_image, category_id, content, body, meta_title, meta_description, status, published_at)
VALUES (
  'Sample Post 1',
  'sample-post-1/',
  'This is a sample blog post that demonstrates the structure and formatting options available for your content.',
  '/placeholder.svg',
  (SELECT id FROM public.post_categories WHERE slug = 'sample-category-1' LIMIT 1),
  '[]'::jsonb,
  '<h2>Introduction</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p><h2>Key Points to Consider</h2><p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.</p><blockquote>The pursuit of justice requires dedication, expertise, and unwavering commitment to our clients.</blockquote><ul><li>First important consideration for your case</li><li>Second critical factor to evaluate</li><li>Third element that may impact the outcome</li></ul><h2>Moving Forward</h2><p>Sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.</p>',
  'Sample Post 1 | Blog',
  'This is a sample blog post demonstrating the content structure available for your articles.',
  'published',
  now()
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.posts (title, slug, excerpt, featured_image, category_id, content, body, meta_title, meta_description, status, published_at)
VALUES (
  'Sample Post 2',
  'sample-post-2/',
  'Explore the latest developments and insights in this informative article covering important topics relevant to our practice.',
  '/placeholder.svg',
  (SELECT id FROM public.post_categories WHERE slug = 'sample-category-1' LIMIT 1),
  '[]'::jsonb,
  '<h2>Understanding the Landscape</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent vehicula, eros vel tincidunt feugiat, sapien lectus blandit nulla, vel fermentum libero turpis a ligula.</p><h2>Critical Analysis</h2><p>Nullam eget enim vitae tortor ullamcorper ornare. Donec vel sapien auctor, efficitur lectus in, tincidunt dolor. Suspendisse potenti. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae.</p><blockquote>Knowledge is the foundation upon which successful outcomes are built.</blockquote><h2>Practical Applications</h2><p>Maecenas accumsan lacus vel facilisis volutpat. Sed cursus ante dapibus diam. Integer in cursus turpis. Ut elit tellus, luctus nec ullamcorper mattis, pulvinar dapibus leo.</p>',
  'Sample Post 2 | Blog',
  'Explore the latest developments and insights in this informative article.',
  'published',
  now()
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.posts (title, slug, excerpt, featured_image, category_id, content, body, meta_title, meta_description, status, published_at)
VALUES (
  'Sample Post 3',
  'sample-post-3/',
  'A comprehensive overview of essential strategies and best practices that can help guide you through complex situations.',
  '/placeholder.svg',
  (SELECT id FROM public.post_categories WHERE slug = 'sample-category-2' LIMIT 1),
  '[]'::jsonb,
  '<h2>Setting the Stage</h2><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras pretium, massa id interdum volutpat, erat risus viverra quam, in luctus mauris mi et arcu.</p><h2>Expert Perspectives</h2><p>Aliquam erat volutpat. Nunc fermentum tortor ac porta dapibus. In lacinia risus at urna fringilla facilisis. Phasellus sollicitudin feugiat accumsan.</p><blockquote>Every challenge presents an opportunity for growth and improvement.</blockquote><ul><li>Strategy one: thorough preparation and research</li><li>Strategy two: clear communication and documentation</li><li>Strategy three: proactive problem-solving approach</li><li>Strategy four: continuous evaluation and adjustment</li></ul><h2>Conclusion</h2><p>Vivamus magna justo, lacinia eget consectetur sed, convallis at tellus. Curabitur non nulla sit amet nisl tempus convallis quis ac lectus.</p>',
  'Sample Post 3 | Blog',
  'A comprehensive overview of essential strategies and best practices.',
  'published',
  now()
)
ON CONFLICT (slug) DO NOTHING;

-- -----------------------------------------
-- 7d. SEED TEMPLATES (3 templates)
-- -----------------------------------------
INSERT INTO public.templates (name, page_type, default_content, default_meta_title, default_meta_description)
SELECT 'Standard Page Template', 'standard',
  '[{"type":"hero","sectionLabel":"– Page Title","tagline":"Page Headline","description":"A brief description of this page and its purpose."},{"type":"content-section","body":"<h2>Section Heading</h2><p>Add your content here. This section supports rich text including headings, paragraphs, lists, and images.</p>","image":"","imageAlt":"","imagePosition":"right"},{"type":"cta","heading":"Ready to Get Started?","description":"Contact us today for a free consultation.","secondaryButton":{"label":"Contact Us","sublabel":"Free Consultation","link":"/contact"}}]'::jsonb,
  'Page Title | Your Site Name',
  'A brief description of this page.'
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Standard Page Template');

INSERT INTO public.templates (name, page_type, default_content, default_meta_title, default_meta_description)
SELECT 'Practice Page Template', 'practice',
  '{"hero":{"sectionLabel":"– Practice Area","tagline":"Experienced Legal Representation","description":"Our dedicated team of attorneys brings years of experience and a proven track record of success.","backgroundImage":""},"socialProof":{"mode":"awards","testimonials":[],"awards":{"logos":[]}},"contentSections":[{"body":"<p>Our attorneys have extensive experience handling cases in this practice area. We understand the complexities of the law and work diligently to build a strong case on your behalf.</p>","image":"","imageAlt":"","imagePosition":"right"}],"faq":{"enabled":true,"heading":"Frequently Asked Questions","description":"Find answers to common questions below.","items":[{"question":"How much does a consultation cost?","answer":"We offer free initial consultations with no obligation."},{"question":"How long will my case take?","answer":"Every case is unique. During your consultation, we will provide a realistic timeline."},{"question":"What if I cannot afford an attorney?","answer":"We work on a contingency fee basis for most cases — you pay nothing unless we win."}]}}'::jsonb,
  'Practice Area | Your Site Name',
  'Learn how our experienced attorneys can help with your case.'
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Practice Page Template');

INSERT INTO public.templates (name, page_type, default_content, default_meta_title, default_meta_description)
SELECT 'Landing Page Template', 'landing',
  '[{"type":"hero","sectionLabel":"– Landing Page","tagline":"Compelling Headline Here","description":"A persuasive description that encourages visitors to take action."},{"type":"content-section","body":"<h2>Why Choose Us</h2><p>Highlight your key value propositions and what sets you apart from the competition.</p><ul><li>Benefit one</li><li>Benefit two</li><li>Benefit three</li></ul>","image":"","imageAlt":"","imagePosition":"right"},{"type":"cta","heading":"Take Action Today","description":"Do not wait — contact us now for a free consultation.","secondaryButton":{"label":"Get Started","sublabel":"No Obligation","link":"/contact"}}]'::jsonb,
  'Landing Page | Your Site Name',
  'Take action today — contact us for a free consultation.'
WHERE NOT EXISTS (SELECT 1 FROM public.templates WHERE name = 'Landing Page Template');

-- -----------------------------------------
-- 7e. SEED CMS FORMS
-- -----------------------------------------
INSERT INTO public.cms_forms (name, display_name, fields, submit_button_text, success_message)
VALUES (
  'contact',
  'Contact Form',
  '[
    {"id":"f1","type":"text","name":"firstName","label":"First Name *","required":true},
    {"id":"f2","type":"text","name":"lastName","label":"Last Name *","required":true},
    {"id":"f3","type":"email","name":"email","label":"Email Address *","required":true},
    {"id":"f4","type":"phone","name":"phone","label":"Phone Number","required":false},
    {"id":"f5","type":"textarea","name":"message","label":"Message *","required":true}
  ]'::jsonb,
  'SUBMIT',
  'Thank you! We will contact you soon.'
)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- 8. BULK CONTENT IMPORTER TABLES
-- =============================================

CREATE TABLE public.import_mapping_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('practice', 'post')),
  mapping_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  source_type text,
  mapping_preset_id uuid REFERENCES public.import_mapping_presets(id) ON DELETE SET NULL,
  recipe_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_settings_json jsonb,
  confidence_threshold numeric DEFAULT 0.8,
  version integer NOT NULL DEFAULT 1,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

CREATE TABLE public.import_migration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  template_type text NOT NULL,
  source_type text NOT NULL,
  recipe_id uuid REFERENCES public.import_recipes(id) ON DELETE SET NULL,
  current_step text NOT NULL DEFAULT 'source',
  records_count integer DEFAULT 0,
  approved_count integer DEFAULT 0,
  exception_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  source_summary_json jsonb,
  source_data_json jsonb,
  source_snapshot_json jsonb,
  mapping_json jsonb,
  recipe_json jsonb,
  transformed_records_json jsonb,
  exception_indices jsonb DEFAULT '[]'::jsonb,
  review_state_json jsonb,
  validation_result_json jsonb,
  status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (source_type IN ('csv', 'api', 'json')),
  template_type text NOT NULL CHECK (template_type IN ('practice', 'post')),
  mode text NOT NULL DEFAULT 'create' CHECK (mode IN ('create', 'update', 'upsert', 'skip_duplicates')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_records integer DEFAULT 0,
  created_count integer DEFAULT 0,
  updated_count integer DEFAULT 0,
  skipped_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  config_json jsonb DEFAULT '{}'::jsonb,
  recipe_id uuid REFERENCES public.import_recipes(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.import_migration_sessions(id) ON DELETE SET NULL,
  recipe_snapshot_json jsonb,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE public.import_job_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id uuid NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  row_index integer NOT NULL,
  source_data jsonb,
  target_slug text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'created', 'updated', 'skipped', 'failed')),
  error_message text,
  created_entity_id uuid,
  transformation_log jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TRIGGER update_import_recipes_updated_at
  BEFORE UPDATE ON public.import_recipes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_migration_sessions_updated_at
  BEFORE UPDATE ON public.import_migration_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS for import tables (admin-only)
ALTER TABLE public.import_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_migration_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_mapping_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read import_recipes" ON public.import_recipes
  FOR SELECT USING (public.is_cms_admin());
CREATE POLICY "Admin insert import_recipes" ON public.import_recipes
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update import_recipes" ON public.import_recipes
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete import_recipes" ON public.import_recipes
  FOR DELETE USING (public.is_cms_admin());

CREATE POLICY "Admin read import_migration_sessions" ON public.import_migration_sessions
  FOR SELECT USING (public.is_cms_admin());
CREATE POLICY "Admin insert import_migration_sessions" ON public.import_migration_sessions
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update import_migration_sessions" ON public.import_migration_sessions
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete import_migration_sessions" ON public.import_migration_sessions
  FOR DELETE USING (public.is_cms_admin());

CREATE POLICY "Admin read import_jobs" ON public.import_jobs
  FOR SELECT USING (public.is_cms_admin());
CREATE POLICY "Admin insert import_jobs" ON public.import_jobs
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update import_jobs" ON public.import_jobs
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete import_jobs" ON public.import_jobs
  FOR DELETE USING (public.is_cms_admin());

CREATE POLICY "Admin read import_job_items" ON public.import_job_items
  FOR SELECT USING (public.is_cms_admin());
CREATE POLICY "Admin insert import_job_items" ON public.import_job_items
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update import_job_items" ON public.import_job_items
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete import_job_items" ON public.import_job_items
  FOR DELETE USING (public.is_cms_admin());

CREATE POLICY "Admin read import_mapping_presets" ON public.import_mapping_presets
  FOR SELECT USING (public.is_cms_admin());
CREATE POLICY "Admin insert import_mapping_presets" ON public.import_mapping_presets
  FOR INSERT WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin update import_mapping_presets" ON public.import_mapping_presets
  FOR UPDATE USING (public.is_cms_admin()) WITH CHECK (public.is_cms_admin());
CREATE POLICY "Admin delete import_mapping_presets" ON public.import_mapping_presets
  FOR DELETE USING (public.is_cms_admin());

# New Project Setup Checklist

Quick-start guide for spinning up a new website from this template.

---

## 1. Create Repository

- [ ] Use this repo as a template (or duplicate/fork)
- [ ] Pull into Builder.io as a new project
- [ ] Run `pnpm install`

## 2. Create Supabase Project

- [ ] Create a new project at [supabase.com](https://supabase.com)
- [ ] Note down: **Project URL**, **Anon key**, **Service Role key**

## 3. Run Database Schema

- [ ] Open Supabase **SQL Editor**
- [ ] Paste and run the contents of `supabase/schema.sql`

## 4. Create First Admin User

- [ ] In Supabase Dashboard: **Authentication** > **Users** > **Add user** (email + password)
- [ ] Copy the user's UUID, then run in SQL Editor:

```sql
INSERT INTO public.cms_users (user_id, email, role)
VALUES ('THE-AUTH-USER-UUID', 'admin@example.com', 'admin');
```

## 5. Set Environment Variables

Set these in Builder.io project settings **and** your hosting platform (Netlify/Vercel):

| Variable                   | Where Used         | Purpose                          |
| -------------------------- | ------------------ | -------------------------------- |
| `VITE_SUPABASE_URL`        | Frontend + Build   | Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY`   | Frontend + Build   | Supabase public key              |
| `SUPABASE_SERVICE_ROLE_KEY` | Build only         | SSG build + server functions     |
| `SITE_URL`                 | Build only         | Sitemap generation               |
| `VITE_SITE_URL`            | Frontend           | Canonical URL fallback for SEO   |
| `NETLIFY_BUILD_HOOK_URL`   | Functions only     | Required for CMS "Publish" button to trigger Netlify rebuild |

> **Security:** `VITE_` vars are exposed to the browser. Never put secrets in `VITE_` variables.

See `.env.example` for the full list.

## 6. Running QA Scans

Automated QA scans verify your site's health by testing published pages and blog posts for SEO, accessibility, and broken links.

### Prerequisites

QA scans require the same Supabase credentials as your frontend:
- `VITE_SUPABASE_URL` — Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Your Supabase public key

**Important:** URLs are **dynamically discovered** from your CMS. The scanner automatically fetches all published pages and blog posts at scan time, so you don't need to maintain a static URL list.

### Running Scans

```bash
# Run headless scan (default, generates report)
pnpm qa

# Run with browser visible (useful for debugging)
pnpm qa:headed

# View the HTML report after scanning
pnpm qa:report
```

### What Gets Scanned

- **All published pages** — From the `pages` table (status = 'published')
- **All published blog posts** — From the `posts` table (status = 'published')
- **Excludes** — Admin routes (starting with `/admin`), draft content, noindex pages

### What's Checked

Each page is validated for:
- ✅ **HTTP Status** — Page returns 200-299
- ✅ **SEO** — Title, meta description, canonical URL, og:title, og:description, og:image
- ✅ **Accessibility** — H1 present, images have alt text
- ✅ **Content** — No Lorem Ipsum, proper heading hierarchy
- ✅ **Conversion** — Phone numbers present and consistent
- ✅ **Links** — No broken internal links
- ✅ **Screenshots** — Full-page screenshots for visual regression detection

### Reports

Scan results are saved to:
- **JSON Report**: `tools/qa/reports/qa-report.json` — Machine-readable results
- **Screenshots**: `tools/qa/screenshots/` — Visual regression reference

### Troubleshooting

**Error: "Missing Supabase env vars"**
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- In development: Add to `.env.local`
- In CI/CD: Set as environment variables in your platform

**Error: "No published URLs found in CMS"**
- The scanner found no published content
- Publish at least one page or blog post in the CMS admin
- Verify the page/post status is "published" (not draft)

**Playwright installation issues**
- Run: `pnpm install`
- Or manually: `pnpm exec playwright install`

---

## 7. Customize Branding

### Colors
- [ ] `client/global.css` — Change CSS variables in `:root` (HSL values)
- [ ] `tailwind.config.ts` — Change `brand-*` color values (rgb)

### Fonts
- [ ] `index.html` — Update the Google Fonts `<link>` tag
- [ ] `tailwind.config.ts` — Update `fontFamily` definitions
- [ ] Search for `font-playfair` and `font-outfit` in components to update class names

### Logo & Site Name
- [ ] Done through the CMS admin: **Site Settings** > **Branding** tab

### Layout
- [ ] `client/components/layout/Header.tsx` — Nav structure and CTA
- [ ] `client/components/layout/Footer.tsx` — Footer layout
- [ ] `client/components/layout/Layout.tsx` — Page wrapper

## 8. Customize Content (if needed)

### Adding a new block type
1. Add the type to `ContentBlock` union in `vendor/cms-core/client/lib/database.types.ts`
2. Create a renderer in `client/components/blocks/[BlockName]Block.tsx`
3. Register it in `client/components/BlockRenderer.tsx`
4. Add editor fields in `vendor/cms-core/client/components/admin/BlockEditor.tsx`

### Key file locations

| What                        | Where                                                      |
| --------------------------- | ---------------------------------------------------------- |
| Block type definitions      | `vendor/cms-core/client/lib/database.types.ts`             |
| Block renderers (public)    | `client/components/blocks/`                                |
| Block editor (admin)        | `vendor/cms-core/client/components/admin/BlockEditor.tsx`  |
| Practice page editor        | `client/components/admin/editors/PracticeAreaPageEditor.tsx`|
| Page content types          | `client/lib/cms/*.ts`                                      |

---

## Common Pitfalls

1. **Missing `site_settings` row** — The app crashes without a row where `settings_key = 'global'`. The schema SQL seeds this automatically.
2. **Missing `blog_sidebar_settings` row** — Same issue. Seeded automatically.
3. **Forgetting storage bucket** — Image uploads fail without the `media` bucket + policies.
4. **RLS blocking public reads** — The frontend reads pages/settings as anonymous. The public SELECT policies are critical.
5. **Content shape mismatch** — Practice pages use an object `{hero, socialProof, contentSections, faq}`, standard/landing pages use an array `[]`. Mixing them breaks the editor.
6. **Netlify Forms in `index.html`** — Hidden `<form>` elements with `netlify` attributes exist for SPA bot detection. Remove them if you are NOT using Netlify Forms; keep them if you are.
7. **WhatConverts DNI** — `client/lib/whatconvertsRefresh.ts` integrates WhatConverts call tracking (Dynamic Number Insertion). It is a silent no-op when WhatConverts is not installed. Safe to ignore if not using WhatConverts.

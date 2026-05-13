# CMS Starter — Developer Playbook

> **Purpose**: Everything a developer needs to clone this template and launch a new client website.  
> **Audience**: Developers working inside Builder.io Fusion or locally.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Path Aliases](#3-path-aliases)
4. [New Project Creation](#4-new-project-creation)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [CMS Content Model](#7-cms-content-model)
8. [Block System](#8-block-system)
9. [Page Types & Data Shapes](#9-page-types--data-shapes)
10. [Admin Panel](#10-admin-panel)
11. [Styling & Theming](#11-styling--theming)
12. [Deployment (Netlify)](#12-deployment-netlify)
13. [SSG Build](#13-ssg-build)
14. [Common Pitfalls](#14-common-pitfalls)
15. [Key File Reference](#15-key-file-reference)

---

## 1. Architecture Overview

```
client/                        # Site-specific React components & pages
├── pages/                     # Route components
├── components/                # Site-specific UI (blocks, layout, home, etc.)
├── hooks/                     # Site-specific data hooks
├── lib/cms/                   # Site-specific CMS type definitions
├── contexts/                  # React contexts (SiteSettings, etc.)
├── App.tsx                    # App entry + SPA routing
└── global.css                 # TailwindCSS 3 theme variables

vendor/cms-core/               # Reusable CMS engine (shared across projects)
├── client/
│   ├── components/admin/      # Admin panel UI (BlockEditor, ImagePicker, etc.)
│   ├── pages/admin/           # Admin route pages (Dashboard, Pages, Posts, etc.)
│   ├── hooks/                 # CMS data hooks (usePageContent, useSiteSettings)
│   └── lib/                   # Core types (database.types.ts, supabase.ts)
├── netlify/functions/         # Serverless functions (api, publish, sitemap, etc.)
├── scripts/                   # SSG generation script
└── shared/                    # Shared types

server/                        # Express API backend (dev only)
├── index.ts                   # Express server setup
└── routes/                    # API route handlers

shared/                        # Types shared between client & server
└── api.ts

supabase/
└── schema.sql                 # Full database schema (already exists)
```

### Vite Alias Differences (Client vs Server)

The `@` alias resolves differently depending on the build target. This is intentional:

| Build Config           | `@` resolves to              | `@shared` resolves to            |
| ---------------------- | ---------------------------- | -------------------------------- |
| `vite.config.ts`       | `vendor/cms-core/client/`    | `vendor/cms-core/shared/`        |
| `vite.config.server.ts`| `./client`                   | `./shared`                       |

The client build needs `@` to point at the CMS engine's components, while the server build uses site-specific client code. The `@site` alias (client build only) always points to `./client`.

---

## 2. Tech Stack

| Layer       | Technology                                                  |
| ----------- | ----------------------------------------------------------- |
| Package Mgr | **pnpm** (declared in `packageManager` field)               |
| Frontend    | React 18 + React Router 6 (SPA) + TypeScript + Vite         |
| Styling     | TailwindCSS 3 + Radix UI + Lucide React icons               |
| Rich Text   | TipTap 3                                                     |
| Backend     | Express (dev server), Netlify Functions (production)         |
| Database    | Supabase (PostgreSQL + Auth + Storage)                       |
| Testing     | Vitest                                                       |
| SSG         | Custom script (`vendor/cms-core/scripts/ssg-generate.ts`)    |

---

## 3. Path Aliases

Defined in both `vite.config.ts` and `tsconfig.json`:

| Alias      | Resolves To                     | Usage                                  |
| ---------- | ------------------------------- | -------------------------------------- |
| `@`        | `vendor/cms-core/client/`       | CMS engine components, hooks, lib      |
| `@site`    | `client/`                       | Site-specific components & pages       |
| `@shared`  | `vendor/cms-core/shared/`       | Shared types between client & server   |

```typescript
// Example imports
import { supabase } from "@/lib/supabase";          // CMS core
import { Hero } from "@site/components/home/Hero";   // Site-specific
import type { ApiResponse } from "@shared/api";       // Shared types
```

---

## 4. New Project Creation

### Step-by-step

1. **Clone / template** this repository into a new project
2. **Delete `package-lock.json`** — only `pnpm-lock.yaml` should exist
   ```bash
   rm package-lock.json
   ```
3. **Update `package.json`** — change `"name": "fusion-starter"` to your project name
4. **Install dependencies**
   ```bash
   pnpm install
   ```
5. **Create a Supabase project** at [supabase.com](https://supabase.com)
6. **Run the database schema** — open the Supabase SQL Editor and paste the contents of `supabase/schema.sql` (the file already exists in the repo)
7. **Create the first admin user**:
   - In Supabase Dashboard: **Authentication → Users → Add user** (email + password)
   - Copy the user's UUID, then run in SQL Editor:
     ```sql
     INSERT INTO public.cms_users (user_id, email, role)
     VALUES ('THE-AUTH-USER-UUID', 'admin@example.com', 'admin');
     ```
8. **Set environment variables** (see [Section 5](#5-environment-variables))
9. **Clean up `netlify.toml`** — remove the test redirect:
   ```toml
   # DELETE this block if present:
   [[redirects]]
     from = "/test-page"
     to = "/"
     status = 301
   ```
   Also remove the duplicate SPA fallback at the bottom (keep only one `/* → /index.html` redirect).
10. **Customize branding** (see [Section 11](#11-styling--theming))
11. **Run locally**
    ```bash
    pnpm dev
    ```

### Existing files — do NOT recreate

These files already exist in the repo. Reference and update them as needed:

| File              | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `.env.example`    | Template for all environment variables   |
| `SETUP.md`        | Quick-start checklist for new projects   |
| `supabase/schema.sql` | Complete database schema + seed data |

---

## 5. Environment Variables

Set these in your hosting platform (Netlify/Vercel) and in Builder.io project settings.

See `.env.example` for the full annotated template.

| Variable                    | Required | Where Used       | Purpose                                           |
| --------------------------- | -------- | ---------------- | ------------------------------------------------- |
| `VITE_SUPABASE_URL`         | ✅       | Frontend + Build | Supabase project URL                              |
| `VITE_SUPABASE_ANON_KEY`    | ✅       | Frontend + Build | Supabase public (anon) key                        |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅       | Build only       | SSG generation + server functions (KEEP SECRET)   |
| `SITE_URL`                  | ✅       | Build only       | Sitemap generation base URL                       |
| `VITE_SITE_URL`             | ✅       | Frontend         | Canonical URL fallback in SEO component           |
| `NETLIFY_BUILD_HOOK_URL`    | ⚠️       | Functions only   | Required for the CMS "Publish" button to trigger a Netlify rebuild. Create at: Netlify Dashboard → Site Settings → Build & deploy → Build hooks |

> **Security**: `VITE_` variables are exposed to the browser. Never put secrets in `VITE_` prefixed variables.

### Legacy / Unused Variables

| Variable          | Status  | Notes                                                        |
| ----------------- | ------- | ------------------------------------------------------------ |
| `ADMIN_PASSWORD`  | Unused  | Referenced in `vendor/cms-core/netlify/functions/_shared.cjs` by a legacy `requireAdmin` helper. No active function calls it. Do NOT set unless you write a custom function that explicitly uses it. |

---

## 6. Database Schema

The full schema lives at `supabase/schema.sql`. Run it in the Supabase SQL Editor for new projects.

### Tables

| Table                    | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `pages`                  | CMS-managed pages (standard, practice, landing) |
| `templates`              | Reusable page templates                      |
| `posts`                  | Blog posts                                   |
| `post_categories`        | Blog categories                              |
| `redirects`              | URL redirects (301/302)                      |
| `site_settings`          | Global site configuration (single row, key=`global`) |
| `blog_sidebar_settings`  | Blog sidebar config (single row)             |
| `media`                  | Media library metadata                       |
| `cms_users`              | CMS user roles (admin/editor)                |
| `page_revisions`         | Page revision history                        |
| `search_replace_audit`   | Audit trail for search & replace operations  |

### Views

| View                     | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `site_settings_public`   | Public-safe projection of `site_settings`. Includes `head_scripts` and `footer_scripts`. Excludes `global_schema` and `updated_by`. |

### Storage

| Bucket | Public | Max Size | Allowed Types                                      |
| ------ | ------ | -------- | -------------------------------------------------- |
| `media`| Yes    | 50 MB    | JPEG, PNG, GIF, WebP, SVG                          |

### Seed Data

The schema SQL automatically inserts:
- One `site_settings` row with `settings_key = 'global'` (app crashes without it)
- One `blog_sidebar_settings` row (app crashes without it)

---

## 7. CMS Content Model

### Page Types

⚠️ **Important: PageType vs Database Constraint Mismatch**

The TypeScript `PageType` union is:
```typescript
type PageType = "standard" | "practice" | "landing" | "post";
```

However, the database `pages` table CHECK constraint only allows:
```sql
CHECK (page_type IN ('standard', 'practice', 'landing'))
```

**The `'post'` value is NOT valid for the `pages` table.** Blog posts are stored in the separate `posts` table, not in `pages`. The `'post'` value in `PageType` is only valid for the `templates` table (which allows all four values), enabling post templates.

### Data Shape by Page Type

| Page Type   | `content` Column Shape | Description                          |
| ----------- | ---------------------- | ------------------------------------ |
| `standard`  | `ContentBlock[]`       | Array of content blocks              |
| `landing`   | `ContentBlock[]`       | Array of content blocks              |
| `practice`  | `{ hero, socialProof, contentSections, faq }` | Structured object |

> ⚠️ Mixing these shapes (e.g., passing an array to a practice page) will break the editor.

---

## 8. Block System

### Available Block Types

Defined in `vendor/cms-core/client/lib/database.types.ts` as the `ContentBlock` union:

| Block Type             | Key Fields                                          |
| ---------------------- | --------------------------------------------------- |
| `hero`                 | `sectionLabel`, `tagline`, `description`, `backgroundImage` |
| `heading`              | `level` (1-3), `text`                               |
| `content-section`      | `body` (HTML), `image`, `imagePosition` (left/right) |
| `cta`                  | `heading`, `description`, `secondaryButton`         |
| `team-members`         | `members[]` with name, title, bio, image, specialties |
| `testimonials`         | `items[]` with text, author, ratingImage            |
| `contact-section`      | `sectionLabel`, `heading`, `description`, `formHeading` |
| `map`                  | `mapEmbedUrl`, optional heading/subtext             |
| `practice-areas-grid`  | `areas[]` with icon, title, description, image, link |
| `recent-posts`         | `sectionLabel`, `heading`, `postCount`              |

### Adding a New Block Type

1. Add the type to the `ContentBlock` union in `vendor/cms-core/client/lib/database.types.ts`
2. Create a renderer component in `client/components/blocks/[BlockName]Block.tsx`
3. Register it in `client/components/BlockRenderer.tsx`
4. Add editor fields in `vendor/cms-core/client/components/admin/BlockEditor.tsx`

---

## 9. Page Types & Data Shapes

### Standard / Landing Pages

Content is a flat array of `ContentBlock[]` rendered by `BlockRenderer.tsx`:

```typescript
const blocks = page.content as ContentBlock[];
blocks.map(block => <BlockRenderer key={index} block={block} />);
```

### Practice Area Pages

Content is a structured object:

```typescript
interface PracticeAreaContent {
  hero: { ... };
  socialProof: { ... };
  contentSections: Array<{ ... }>;
  faq: { ... };
}
```

Edited via `client/components/admin/editors/PracticeAreaPageEditor.tsx`.

### Blog Posts

Stored in the `posts` table (NOT `pages`). Have their own fields:
- `title`, `slug`, `excerpt`, `featured_image`
- `category_id` → FK to `post_categories`
- `content` (blocks) + `body` (plain text)
- Full SEO fields (meta_title, og_image, etc.)

---

## 10. Admin Panel

Access at `/admin`. Login via Supabase Auth (email + password).

### Admin Navigation

| Label              | Route                    | Access   |
| ------------------ | ------------------------ | -------- |
| Dashboard          | `/admin`                 | All      |
| Pages              | `/admin/pages`           | All      |
| Posts              | `/admin/posts`           | All      |
| Media Library      | `/admin/media`           | All      |
| Site Settings      | `/admin/site-settings`   | All      |
| Redirects          | `/admin/redirects`       | Admin    |
| Search & Replace   | `/admin/search-replace`  | Admin    |
| Templates          | `/admin/templates`       | Admin    |
| Users              | `/admin/users`           | Admin    |

### User Roles

| Role     | Capabilities                                              |
| -------- | --------------------------------------------------------- |
| `admin`  | Full access: pages, posts, settings, redirects, templates, users, search & replace |
| `editor` | Pages, posts, media, site settings only                   |

---

## 11. Styling & Theming

### Color Tokens

Defined in `tailwind.config.ts` using `brand-*` naming:

| Token               | Default Value          | Usage                    |
| -------------------- | ---------------------- | ------------------------ |
| `brand-dark`         | `rgb(6, 29, 27)`       | Dark backgrounds         |
| `brand-card`         | `rgb(20, 41, 40)`      | Card backgrounds         |
| `brand-border`       | `rgb(97, 111, 111)`    | Borders                  |
| `brand-accent`       | `rgb(186, 234, 160)`   | Accent / highlight color |
| `brand-accent-dark`  | `rgb(45, 70, 58)`      | Dark accent variant      |

Additional theming via CSS variables in `client/global.css` (standard shadcn/ui HSL variables: `--background`, `--foreground`, `--primary`, etc.).

### Fonts

| Tailwind Class   | Font Family      | Fallbacks                          |
| ---------------- | ---------------- | ---------------------------------- |
| `font-playfair`  | Playfair Display | Georgia, Times New Roman, serif    |
| `font-outfit`    | Outfit           | Helvetica, Arial, Lucida, sans-serif |

Font imports are in `index.html` via Google Fonts `<link>` tags. Update both `index.html` and `tailwind.config.ts` when changing fonts.

### Customizing for a New Project

1. **Colors**: Update `brand-*` values in `tailwind.config.ts` and CSS variables in `client/global.css`
2. **Fonts**: Update `index.html` Google Fonts link + `tailwind.config.ts` `fontFamily`
3. **Logo & Site Name**: Set through admin panel at `/admin/site-settings`
4. **Header/Footer**: Edit `client/components/layout/Header.tsx` and `Footer.tsx`

---

## 12. Deployment (Netlify)

### Configuration (`netlify.toml`)

```
Build command:  npm run build:ssg
Publish dir:    dist/spa
Functions dir:  vendor/cms-core/netlify/functions
```

### Serverless Functions

All functions are in `vendor/cms-core/netlify/functions/`:

| Function          | Purpose                                       |
| ----------------- | --------------------------------------------- |
| `api.ts`          | Express-based API handler                     |
| `publish.ts`      | Triggers Netlify rebuild via build hook        |
| `sitemap.ts`      | Generates XML sitemap                         |
| `invite-user.ts`  | Invites new CMS users                         |
| `delete-user.ts`  | Removes CMS users                             |
| `search-replace.ts` | Global search & replace across content      |

> ⚠️ There is also a `netlify/functions/api.ts` at the project root — this is **redundant and unused**. The `netlify.toml` points to `vendor/cms-core/netlify/functions/` as the functions directory. Ignore (or delete) the root-level copy.

### Redirects

The `netlify.toml` defines these redirects:
- `/sitemap.xml` → sitemap function
- `/api/*` → API function
- `/*` → `/index.html` (SPA fallback)

---

## 13. SSG Build

The SSG (Static Site Generation) script pre-renders pages at build time:

```bash
pnpm build:ssg
# Equivalent to: vite build && tsx vendor/cms-core/scripts/ssg-generate.ts
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `SITE_URL` environment variables.

Output goes to `dist/spa/` with pre-rendered HTML files for each published page.

---

## 14. Common Pitfalls

| #  | Pitfall                                | Solution                                                    |
| -- | -------------------------------------- | ----------------------------------------------------------- |
| 1  | **Missing `site_settings` row**        | The schema SQL seeds this automatically. If you get a crash on load, check that a row with `settings_key = 'global'` exists. |
| 2  | **Missing `blog_sidebar_settings` row**| Also seeded automatically. Insert a default row if missing.  |
| 3  | **Missing `media` storage bucket**     | The schema SQL creates it. If image uploads fail, verify the bucket exists with public access. |
| 4  | **RLS blocking public reads**          | The frontend reads pages/settings as anonymous (anon key). Public SELECT policies are critical. |
| 5  | **Content shape mismatch**             | Practice pages expect an object `{hero, socialProof, contentSections, faq}`. Standard/landing pages expect an array `[]`. Mixing them breaks the editor. |
| 6  | **Inserting `page_type = 'post'` into `pages`** | The DB rejects it. Posts go in the `posts` table. `'post'` is only valid in `templates`. |
| 7  | **Dual lockfiles**                     | Delete `package-lock.json` if it exists. Only `pnpm-lock.yaml` should be present. Always use `pnpm`. |
| 8  | **Duplicate SPA fallback in netlify.toml** | The `/* → /index.html` redirect may appear twice. Remove the duplicate. |
| 9  | **Test redirects in netlify.toml**     | Remove any sample redirects (e.g., `/test-page → /`) for new projects. |
| 10 | **Redundant `netlify/functions/` at root** | The authoritative functions directory is `vendor/cms-core/netlify/functions/`. The root `netlify/functions/` is not used by Netlify. |
| 11 | **Missing `NETLIFY_BUILD_HOOK_URL`**   | The CMS "Publish" button silently fails without this. Set it in your hosting environment. |
| 12 | **Missing `VITE_SITE_URL`**            | SEO canonical URLs may be empty. Set to your production domain. |
| 13 | **`@` alias confusion in server build**| `vite.config.server.ts` maps `@` → `./client` (not vendor). This is intentional. See [Section 1](#1-architecture-overview). |

---

## 15. Key File Reference

### Site-Specific (edit per project)

| File / Directory                              | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `client/App.tsx`                              | SPA routing setup                          |
| `client/global.css`                           | CSS theme variables (HSL)                  |
| `client/pages/`                               | Route page components                      |
| `client/components/layout/Header.tsx`         | Site header & navigation                   |
| `client/components/layout/Footer.tsx`         | Site footer                                |
| `client/components/blocks/`                   | Block renderer components                  |
| `client/components/BlockRenderer.tsx`         | Block type → component mapping             |
| `client/components/admin/editors/`            | Page-type-specific admin editors           |
| `client/hooks/`                               | Site-specific data fetching hooks          |
| `client/lib/cms/`                             | Site-specific CMS type definitions         |
| `tailwind.config.ts`                          | Tailwind theme (colors, fonts)             |
| `index.html`                                  | Google Fonts, meta tags                    |
| `netlify.toml`                                | Deploy config, redirects, headers          |
| `package.json`                                | Dependencies, scripts, project name        |

### CMS Engine (shared — avoid editing)

| File / Directory                                          | Purpose                              |
| --------------------------------------------------------- | ------------------------------------ |
| `vendor/cms-core/client/lib/database.types.ts`            | Core types (ContentBlock, Page, etc.)|
| `vendor/cms-core/client/lib/supabase.ts`                  | Supabase client init                 |
| `vendor/cms-core/client/components/admin/BlockEditor.tsx` | Block editing UI                     |
| `vendor/cms-core/client/components/admin/AdminSidebar.tsx`| Admin navigation sidebar             |
| `vendor/cms-core/client/pages/admin/`                     | Admin route pages                    |
| `vendor/cms-core/client/hooks/`                           | CMS data hooks                       |
| `vendor/cms-core/netlify/functions/`                      | Serverless functions (prod)          |
| `vendor/cms-core/scripts/ssg-generate.ts`                 | SSG build script                     |

### Config & Schema

| File                  | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `.env.example`        | Environment variable template            |
| `SETUP.md`            | Quick-start checklist                    |
| `supabase/schema.sql` | Full database schema + RLS + seed data   |
| `AGENTS.md`           | AI agent instructions                    |
| `vite.config.ts`      | Client build config + dev server         |
| `vite.config.server.ts` | Server/binary build config             |
| `tsconfig.json`       | TypeScript config + path aliases         |

---

## Development Commands

```bash
pnpm dev          # Start dev server (client + Express on port 8080)
pnpm build        # Production build (client + server)
pnpm build:ssg    # SSG build for Netlify (client + pre-render)
pnpm start        # Start production server
pnpm typecheck    # TypeScript validation
pnpm test         # Run Vitest tests
```

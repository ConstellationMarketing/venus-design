import type { Database, Page, PageType } from '@/lib/database.types';

export function generatePageSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function generatePageUrlPath(title: string, _type: PageType) {
  const slug = generatePageSlug(title);
  return '/' + slug + '/';
}

export function generateDuplicatePageTitle(title: string) {
  return `${title} (Copy)`;
}

export function generateUniqueDuplicatePageUrlPath(
  title: string,
  type: PageType,
  existingPaths: Iterable<string>,
) {
  const duplicateTitle = generateDuplicatePageTitle(title);
  const basePath = generatePageUrlPath(duplicateTitle, type);
  const pathSet = new Set(existingPaths);

  if (!pathSet.has(basePath)) {
    return basePath;
  }

  const trimmedBasePath = basePath.replace(/\/$/, '');
  let suffix = 2;

  while (pathSet.has(`${trimmedBasePath}-${suffix}/`)) {
    suffix += 1;
  }

  return `${trimmedBasePath}-${suffix}/`;
}

export function buildDuplicatePageInsertPayload(
  sourcePage: Page,
  existingPaths: Iterable<string>,
): Database['public']['Tables']['pages']['Insert'] {
  return {
    title: generateDuplicatePageTitle(sourcePage.title),
    url_path: generateUniqueDuplicatePageUrlPath(sourcePage.title, sourcePage.page_type, existingPaths),
    page_type: sourcePage.page_type,
    content: sourcePage.content,
    meta_title: sourcePage.meta_title,
    meta_description: sourcePage.meta_description,
    canonical_url: null,
    og_title: sourcePage.og_title,
    og_description: sourcePage.og_description,
    og_image: sourcePage.og_image,
    noindex: sourcePage.noindex,
    schema_type: sourcePage.schema_type,
    schema_data: sourcePage.schema_data,
    status: 'draft',
    published_at: null,
  };
}

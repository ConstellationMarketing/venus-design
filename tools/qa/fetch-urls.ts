/**
 * Utility to fetch published URLs from Supabase for QA scanning.
 *
 * Queries the `pages` and `posts` tables to build a complete list of
 * publicly accessible URLs that should be QA scanned.
 */

interface PageRow {
  url_path: string;
}

interface PostRow {
  slug: string;
}

/**
 * Fetches all published URLs from Supabase (pages + blog posts).
 *
 * @param supabaseUrl - Supabase project URL (e.g., https://xyz.supabase.co)
 * @param supabaseAnonKey - Supabase anonymous key for REST API access
 * @returns Sorted array of unique public URLs to scan
 * @throws Error if Supabase env vars are missing or API calls fail
 */
export async function fetchPublishedUrls(
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<string[]> {
  // Validate inputs
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
  }

  const urls = new Set<string>();

  console.log('[QA] Fetching published URLs from Supabase...');

  // 1. Fetch published pages
  try {
    console.log('[QA] Fetching published pages...');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/pages?status=eq.published&select=url_path&order=url_path.asc`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const pages: PageRow[] = await response.json();

    for (const page of pages) {
      // Filter out admin routes and internal paths
      if (page.url_path.startsWith('/admin')) {
        continue;
      }

      urls.add(page.url_path);
    }

    console.log(`[QA] Found ${pages.length} published page(s)`);
  } catch (error) {
    throw new Error(
      `Failed to fetch pages from Supabase: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // 2. Fetch published blog posts
  try {
    console.log('[QA] Fetching published blog posts...');
    const response = await fetch(
      `${supabaseUrl}/rest/v1/posts?status=eq.published&select=slug&order=slug.asc`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const posts: PostRow[] = await response.json();

    for (const post of posts) {
      urls.add(`/blog/${post.slug}`);
    }

    console.log(`[QA] Found ${posts.length} published post(s)`);
  } catch (error) {
    throw new Error(
      `Failed to fetch posts from Supabase: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // 3. Convert to sorted array and deduplicate
  const sortedUrls = Array.from(urls).sort();

  if (sortedUrls.length === 0) {
    throw new Error(
      'No published URLs found in CMS. Ensure there are published pages or posts.'
    );
  }

  console.log(
    `[QA] Total unique URLs to scan: ${sortedUrls.length} (${Array.from(urls).length} including duplicates)`
  );

  return sortedUrls;
}

import { supabase } from "@/lib/supabase";

/**
 * Calls the Netlify publish function to trigger a site rebuild.
 * Used when noindex settings change and the SSG output needs to be regenerated.
 * Returns { ok: true } on success, { ok: false, error: string } on failure.
 */
export async function triggerRebuild(): Promise<{ ok: boolean; error?: string }> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { ok: false, error: "Not authenticated" };
    }

    const res = await fetch("/.netlify/functions/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        ok: false,
        error: body.error || `Rebuild request failed (${res.status})`,
      };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to trigger rebuild",
    };
  }
}

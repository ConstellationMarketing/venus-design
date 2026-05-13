import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type UserRole = "admin" | "editor" | null;

interface UseUserRoleResult {
  role: UserRole;
  isAdmin: boolean;
  isEditor: boolean;
  isLoading: boolean;
  error: Error | null;
  userId: string | null;
  userEmail: string | null;
}

// Cache to avoid repeated queries
let roleCache: { userId: string; role: UserRole } | null = null;

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserRole() {
      try {
        // Get current authenticated user
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          if (isMounted) {
            setRole(null);
            setUserId(null);
            setUserEmail(null);
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setUserId(user.id);
          setUserEmail(user.email || null);
        }

        // Check cache
        if (roleCache && roleCache.userId === user.id) {
          if (isMounted) {
            setRole(roleCache.role);
            setIsLoading(false);
          }
          return;
        }

        // Fetch role from cms_users table
        const { data, error: fetchError } = await supabase
          .from("cms_users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (fetchError) {
          // User might not be in cms_users table yet
          if (fetchError.code === "PGRST116") {
            // No rows returned
            if (isMounted) {
              setRole(null);
              setIsLoading(false);
            }
            return;
          }
          throw fetchError;
        }

        const userRole = data?.role as UserRole;

        // Update cache
        roleCache = { userId: user.id, role: userRole };

        if (isMounted) {
          setRole(userRole);
          setError(null);
        }
      } catch (err) {
        console.error("[useUserRole] Error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setRole(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchUserRole();

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      roleCache = null; // Clear cache on auth change
      fetchUserRole();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    isAdmin: role === "admin",
    isEditor: role === "editor",
    isLoading,
    error,
    userId,
    userEmail,
  };
}

// Helper to clear cache (call after role changes)
export function clearUserRoleCache() {
  roleCache = null;
}

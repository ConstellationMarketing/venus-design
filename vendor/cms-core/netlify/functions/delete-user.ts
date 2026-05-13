import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

export const handler: Handler = async (event: HandlerEvent) => {
  const headers = {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // Only allow POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  // Verify auth token
  const authHeader = event.headers.authorization;
  if (!authHeader) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Authorization header required" }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Verify the requesting user
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Invalid or expired token" }),
    };
  }

  // Check if the requesting user is an admin
  const { data: currentCmsUser } = await supabaseAdmin
    .from("cms_users")
    .select("role")
    .eq("email", user.email)
    .single();

  if (!currentCmsUser || currentCmsUser.role !== "admin") {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Only admins can delete users" }),
    };
  }

  // Parse request body
  let userId: string;
  try {
    const body = JSON.parse(event.body || "{}");
    userId = body.userId;

    if (!userId) {
      throw new Error("userId is required");
    }
  } catch (err) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: err instanceof Error ? err.message : "Invalid request body",
      }),
    };
  }

  try {
    // Look up the cms_user record to get user_id and email
    const { data: targetUser, error: lookupError } = await supabaseAdmin
      .from("cms_users")
      .select("id, user_id, email")
      .eq("id", userId)
      .single();

    if (lookupError || !targetUser) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    // Prevent self-deletion
    if (targetUser.email === user.email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "You cannot delete your own account" }),
      };
    }

    // Delete from cms_users table
    const { error: deleteError } = await supabaseAdmin
      .from("cms_users")
      .delete()
      .eq("id", userId);

    if (deleteError) {
      console.error("CMS user delete error:", deleteError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to delete CMS user record",
          details: deleteError.message,
        }),
      };
    }

    // If the user has a linked Supabase auth account, delete that too
    if (targetUser.user_id) {
      const { error: authDeleteError } =
        await supabaseAdmin.auth.admin.deleteUser(targetUser.user_id);

      if (authDeleteError) {
        // Log but don't fail — the CMS record is already removed
        console.error(
          "Auth user delete error (non-fatal):",
          authDeleteError.message,
        );
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "User deleted successfully",
        email: targetUser.email,
      }),
    };
  } catch (error) {
    console.error("Error deleting user:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to delete user",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

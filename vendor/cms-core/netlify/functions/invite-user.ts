import type { Handler, HandlerEvent } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || process.env.URL || "*";

export const handler: Handler = async (event: HandlerEvent) => {
  // CORS headers — locked to the production domain via ALLOWED_ORIGIN env var
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

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Check if Supabase is configured
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Supabase not configured" }),
    };
  }

  // Verify auth token from request
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

  // Verify the token with Supabase and get the user
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
      body: JSON.stringify({ error: "Only admins can invite users" }),
    };
  }

  // Parse request body
  let email: string;
  let role: "admin" | "editor";

  try {
    const body = JSON.parse(event.body || "{}");
    email = body.email?.trim().toLowerCase();
    role = body.role === "admin" ? "admin" : "editor";

    if (!email) {
      throw new Error("Email is required");
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email format");
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
    // Check if user already exists in cms_users
    const { data: existingCmsUser } = await supabaseAdmin
      .from("cms_users")
      .select("id")
      .eq("email", email)
      .single();

    if (existingCmsUser) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "User already exists in CMS" }),
      };
    }

    // Check if user already exists in auth.users
    const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingAuthUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    let authUserId: string | null = null;

    if (existingAuthUser) {
      // User already has an auth account, just link them
      authUserId = existingAuthUser.id;
    } else {
      // Invite new user via email
      const { data: inviteData, error: inviteError } =
        await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${event.headers.origin || process.env.URL}/admin`,
        });

      if (inviteError) {
        console.error("Invite error:", inviteError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: "Failed to send invitation email",
            details: inviteError.message,
          }),
        };
      }

      authUserId = inviteData?.user?.id || null;
    }

    // Create cms_users record
    const { error: insertError } = await supabaseAdmin.from("cms_users").insert({
      user_id: authUserId,
      email: email,
      role: role,
      created_by: user.id,
    });

    if (insertError) {
      console.error("Insert error:", insertError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: "Failed to create CMS user record",
          details: insertError.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: existingAuthUser
          ? "User linked to CMS successfully"
          : "Invitation sent successfully",
        email: email,
        role: role,
      }),
    };
  } catch (error) {
    console.error("Error inviting user:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to invite user",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

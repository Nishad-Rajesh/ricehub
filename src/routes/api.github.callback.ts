import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/github/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
        if (!clientId || !clientSecret) {
          return errorRedirect(request, "config");
        }

        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) return errorRedirect(request, "missing_params");

        const cookieHeader = request.headers.get("cookie") ?? "";
        const stateCookie = cookieHeader
          .split(";")
          .map((c) => c.trim())
          .find((c) => c.startsWith("gh_oauth_state="))
          ?.split("=")[1];

        const [stateRandom, userId] = state.split(".");
        if (!stateCookie || !stateRandom || !userId || stateCookie !== stateRandom) {
          return errorRedirect(request, "state_mismatch");
        }

        // Exchange code for token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: `${url.origin}/api/github/callback`,
          }),
        });

        const tokenJson = (await tokenRes.json()) as {
          access_token?: string;
          scope?: string;
          error?: string;
        };

        if (!tokenJson.access_token) {
          console.error("GitHub token exchange failed:", tokenJson);
          return errorRedirect(request, "token_exchange");
        }

        // Fetch GitHub user
        const ghUserRes = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokenJson.access_token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "ricehub",
          },
        });

        if (!ghUserRes.ok) {
          console.error("GitHub /user failed:", ghUserRes.status);
          return errorRedirect(request, "user_fetch");
        }

        const ghUser = (await ghUserRes.json()) as {
          id: number;
          login: string;
          avatar_url?: string;
        };

        // Verify the user actually exists in our system
        const { data: { user: authUser }, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authErr || !authUser) {
          return errorRedirect(request, "user_not_found");
        }

        // Upsert connection (admin client bypasses RLS — safe because we verified user)
        const { error: upsertErr } = await supabaseAdmin
          .from("github_connections")
          .upsert(
            {
              user_id: userId,
              github_user_id: ghUser.id,
              github_username: ghUser.login,
              github_avatar_url: ghUser.avatar_url ?? null,
              access_token: tokenJson.access_token,
              scope: tokenJson.scope ?? null,
            },
            { onConflict: "user_id" },
          );

        if (upsertErr) {
          console.error("Upsert failed:", upsertErr);
          return errorRedirect(request, "db_error");
        }

        return new Response(null, {
          status: 302,
          headers: {
            Location: `${url.origin}/upload?gh=connected`,
            "Set-Cookie": `gh_oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
          },
        });
      },
    },
  },
});

function errorRedirect(request: Request, reason: string) {
  const origin = new URL(request.url).origin;
  return new Response(null, {
    status: 302,
    headers: { Location: `${origin}/upload?gh_error=${encodeURIComponent(reason)}` },
  });
}

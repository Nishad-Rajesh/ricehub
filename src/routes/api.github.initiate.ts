import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/api/github/initiate")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
        if (!clientId) {
          return new Response("GITHUB_OAUTH_CLIENT_ID not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const userId = url.searchParams.get("user_id");
        if (!userId) {
          return new Response("Missing user_id", { status: 400 });
        }

        // CSRF state token: random + user id (server validates user matches session on callback)
        const stateRandom = crypto.randomUUID();
        const state = `${stateRandom}.${userId}`;

        const redirectUri = `${url.origin}/api/github/callback`;
        const ghUrl = new URL("https://github.com/login/oauth/authorize");
        ghUrl.searchParams.set("client_id", clientId);
        ghUrl.searchParams.set("redirect_uri", redirectUri);
        ghUrl.searchParams.set("scope", "read:user public_repo");
        ghUrl.searchParams.set("state", state);
        ghUrl.searchParams.set("allow_signup", "true");

        return new Response(null, {
          status: 302,
          headers: {
            Location: ghUrl.toString(),
            // Store state in httpOnly cookie for verification on callback
            "Set-Cookie": `gh_oauth_state=${stateRandom}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
          },
        });
      },
    },
  },
});

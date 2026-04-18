import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

export type GithubRepoSummary = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  private: boolean;
  default_branch: string;
};

export const getGithubConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data } = await supabaseAdmin
      .from("github_connections")
      .select("github_username, github_avatar_url, scope, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    return { connection: data };
  });

export const listUserRepos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: conn, error } = await supabaseAdmin
      .from("github_connections")
      .select("access_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !conn) {
      return { repos: [] as GithubRepoSummary[], error: "not_connected" };
    }

    // Fetch up to 100 owned/affiliated repos sorted by recently updated
    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${conn.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ricehub",
        },
      },
    );

    if (!res.ok) {
      console.error("GitHub repos fetch failed:", res.status);
      return { repos: [] as GithubRepoSummary[], error: `github_${res.status}` };
    }

    const raw = (await res.json()) as Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      html_url: string;
      stargazers_count: number;
      private: boolean;
      default_branch: string;
    }>;

    const repos: GithubRepoSummary[] = raw.map((r) => ({
      id: r.id,
      name: r.name,
      full_name: r.full_name,
      description: r.description,
      html_url: r.html_url,
      stargazers_count: r.stargazers_count,
      private: r.private,
      default_branch: r.default_branch,
    }));

    return { repos, error: null };
  });

const disconnectSchema = z.object({}).optional();

export const disconnectGithub = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => disconnectSchema.parse(input))
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin
      .from("github_connections")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error("Failed to disconnect");
    return { success: true };
  });

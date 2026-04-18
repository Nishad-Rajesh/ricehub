import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WM_MAP, type WmType } from "@/lib/wm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Comments } from "@/components/Comments";
import { ThumbsUp, ThumbsDown, Download, Trash2, ImageOff, Loader2, Github, Star, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type ConfigDetail = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  wm_type: WmType;
  other_wm_name: string | null;
  config_file_path: string;
  config_file_name: string;
  screenshot_url: string | null;
  like_count: number;
  dislike_count: number;
  download_count: number;
  created_at: string;
  github_repo_url: string | null;
  github_repo_full_name: string | null;
  github_repo_stars: number | null;
  github_repo_description: string | null;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type Vote = "like" | "dislike" | null;

export const Route = createFileRoute("/config/$id")({
  component: ConfigDetailPage,
});

function ConfigDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigDetail | null>(null);
  const [vote, setVote] = useState<Vote>(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("configs")
      .select("*,profiles(username,display_name,avatar_url)")
      .eq("id", id)
      .maybeSingle();
    setConfig(data as ConfigDetail | null);
    if (user && data) {
      const [{ data: l }, { data: d }] = await Promise.all([
        supabase.from("likes").select("id").eq("config_id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("dislikes").select("id").eq("config_id", id).eq("user_id", user.id).maybeSingle(),
      ]);
      setVote(l ? "like" : d ? "dislike" : null);
    } else {
      setVote(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  // Refresh counts (server-of-truth via triggers) without spinner
  const refreshCounts = async () => {
    const { data } = await supabase
      .from("configs")
      .select("like_count,dislike_count")
      .eq("id", id)
      .maybeSingle();
    if (data && config) {
      setConfig({ ...config, like_count: data.like_count, dislike_count: data.dislike_count });
    }
  };

  const castVote = async (next: Exclude<Vote, null>) => {
    if (!user) return navigate({ to: "/auth" });
    if (!config || voting) return;
    setVoting(true);
    const prev = vote;

    try {
      // Toggling off the current vote
      if (prev === next) {
        const table = next === "like" ? "likes" : "dislikes";
        const { error } = await supabase.from(table).delete().eq("config_id", config.id).eq("user_id", user.id);
        if (error) throw error;
        setVote(null);
      } else {
        // Switching: remove the opposite first if present
        if (prev) {
          const oppTable = prev === "like" ? "likes" : "dislikes";
          const { error: delErr } = await supabase.from(oppTable).delete().eq("config_id", config.id).eq("user_id", user.id);
          if (delErr) throw delErr;
        }
        const table = next === "like" ? "likes" : "dislikes";
        const { error: insErr } = await supabase.from(table).insert({ config_id: config.id, user_id: user.id });
        // Ignore unique-violation (means we already voted — race)
        if (insErr && insErr.code !== "23505") throw insErr;
        setVote(next);
      }
      await refreshCounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vote failed");
      setVote(prev);
    } finally {
      setVoting(false);
    }
  };

  const hasFile = config && !config.config_file_path.startsWith("_repo:");

  const onDownload = async () => {
    if (!config || !hasFile) return;
    const { data, error } = await supabase.storage.from("configs").createSignedUrl(config.config_file_path, 60, { download: config.config_file_name });
    if (error || !data) return toast.error("Download failed");
    window.location.href = data.signedUrl;
    await supabase.from("configs").update({ download_count: config.download_count + 1 }).eq("id", config.id);
    setConfig({ ...config, download_count: config.download_count + 1 });
  };

  const onDelete = async () => {
    if (!config || !user || user.id !== config.user_id) return;
    if (!confirm("Delete this config?")) return;
    if (hasFile) await supabase.storage.from("configs").remove([config.config_file_path]);
    await supabase.from("configs").delete().eq("id", config.id);
    toast.success("Deleted");
    navigate({ to: "/" });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!config) return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Config not found.</div>;

  const wm = WM_MAP[config.wm_type];
  const wmLabel = config.wm_type === "other" && config.other_wm_name ? config.other_wm_name : wm.name;
  const isOwner = user?.id === config.user_id;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link to="/wm/$type" params={{ type: config.wm_type }} className="text-xs text-muted-foreground hover:text-foreground">
        ← Back to {wm.name}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="rounded-md border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider" style={{ color: wm.accent }}>
            {wmLabel}
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{config.title}</h1>
          {config.profiles && (
            <Link to="/u/$username" params={{ username: config.profiles.username }} className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Avatar className="h-6 w-6">
                <AvatarImage src={config.profiles.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">{config.profiles.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-mono">@{config.profiles.username}</span>
              <span>· {formatDistanceToNow(new Date(config.created_at), { addSuffix: true })}</span>
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center overflow-hidden rounded-md border border-border">
            <button
              onClick={() => castVote("like")}
              disabled={voting}
              aria-pressed={vote === "like"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${vote === "like" ? "bg-primary/15 text-primary" : "hover:bg-muted"}`}
            >
              <ThumbsUp className={`h-4 w-4 ${vote === "like" ? "fill-current" : ""}`} />
              {config.like_count}
            </button>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => castVote("dislike")}
              disabled={voting}
              aria-pressed={vote === "dislike"}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${vote === "dislike" ? "bg-destructive/15 text-destructive" : "hover:bg-muted"}`}
            >
              <ThumbsDown className={`h-4 w-4 ${vote === "dislike" ? "fill-current" : ""}`} />
              {config.dislike_count}
            </button>
          </div>
          {hasFile && (
            <Button onClick={onDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
          )}
          {config.github_repo_url && (
            <Button asChild variant={hasFile ? "outline" : "default"}>
              <a href={config.github_repo_url} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                View repo
              </a>
            </Button>
          )}
          {isOwner && (
            <Button variant="outline" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        {config.screenshot_url ? (
          <img src={config.screenshot_url} alt={config.title} className="w-full" />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
      </div>

      {config.description && (
        <div className="mt-6 whitespace-pre-wrap rounded-xl border border-border bg-card p-6 text-sm leading-relaxed text-foreground/90">
          {config.description}
        </div>
      )}

      {config.github_repo_url && (
        <a
          href={config.github_repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
        >
          <Github className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-foreground">{config.github_repo_full_name}</span>
              {config.github_repo_stars != null && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <Star className="h-3 w-3" />{config.github_repo_stars}
                </span>
              )}
            </div>
            {config.github_repo_description && (
              <p className="mt-1 text-xs text-muted-foreground">{config.github_repo_description}</p>
            )}
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </a>
      )}

      <div className="mt-6 rounded-xl border border-border bg-card p-4 font-mono text-xs text-muted-foreground">
        {hasFile && <div>file: <span className="text-foreground">{config.config_file_name}</span></div>}
        <div>downloads: <span className="text-foreground">{config.download_count}</span></div>
      </div>

      <Comments configId={config.id} ownerId={config.user_id} />
    </main>
  );
}

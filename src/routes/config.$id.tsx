import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WM_MAP, type WmType } from "@/lib/wm";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Heart, Download, Trash2, ImageOff, Loader2 } from "lucide-react";
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
  download_count: number;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export const Route = createFileRoute("/config/$id")({
  component: ConfigDetailPage,
});

function ConfigDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigDetail | null>(null);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("configs")
      .select("*,profiles(username,display_name,avatar_url)")
      .eq("id", id)
      .maybeSingle();
    setConfig(data as ConfigDetail | null);
    if (user && data) {
      const { data: l } = await supabase.from("likes").select("id").eq("config_id", id).eq("user_id", user.id).maybeSingle();
      setLiked(!!l);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user?.id]);

  const toggleLike = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!config) return;
    if (liked) {
      await supabase.from("likes").delete().eq("config_id", config.id).eq("user_id", user.id);
      setLiked(false);
      setConfig({ ...config, like_count: Math.max(0, config.like_count - 1) });
    } else {
      await supabase.from("likes").insert({ config_id: config.id, user_id: user.id });
      setLiked(true);
      setConfig({ ...config, like_count: config.like_count + 1 });
    }
  };

  const onDownload = async () => {
    if (!config) return;
    const { data, error } = await supabase.storage.from("configs").createSignedUrl(config.config_file_path, 60, { download: config.config_file_name });
    if (error || !data) return toast.error("Download failed");
    window.location.href = data.signedUrl;
    await supabase.from("configs").update({ download_count: config.download_count + 1 }).eq("id", config.id);
    setConfig({ ...config, download_count: config.download_count + 1 });
  };

  const onDelete = async () => {
    if (!config || !user || user.id !== config.user_id) return;
    if (!confirm("Delete this config?")) return;
    await supabase.storage.from("configs").remove([config.config_file_path]);
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
        <div className="flex gap-2">
          <Button variant={liked ? "default" : "outline"} onClick={toggleLike}>
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {config.like_count}
          </Button>
          <Button onClick={onDownload}>
            <Download className="h-4 w-4" />
            Download
          </Button>
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

      <div className="mt-6 rounded-xl border border-border bg-card p-4 font-mono text-xs text-muted-foreground">
        <div>file: <span className="text-foreground">{config.config_file_name}</span></div>
        <div>downloads: <span className="text-foreground">{config.download_count}</span></div>
      </div>
    </main>
  );
}

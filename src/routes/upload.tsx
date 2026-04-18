import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WM_LIST, type WmType } from "@/lib/wm";
import { Upload as UploadIcon, FileCode, Image as ImageIcon, Github, Star, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { getGithubConnection, listUserRepos, disconnectGithub, type GithubRepoSummary } from "@/server/github.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a config — ricehub" },
      { name: "description", content: "Share your Linux window manager configuration with the community." },
    ],
  }),
  component: UploadPage,
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(2000).optional(),
  wm_type: z.enum(["hyprland", "i3", "sway", "awesome", "bspwm", "other"]),
  other_wm_name: z.string().trim().max(60).optional(),
});

function UploadPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [wmType, setWmType] = useState<WmType>("hyprland");
  const [otherName, setOtherName] = useState("");
  const [configFile, setConfigFile] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  // GitHub connection state
  const [ghConnection, setGhConnection] = useState<{ github_username: string; github_avatar_url: string | null } | null>(null);
  const [ghLoading, setGhLoading] = useState(true);
  const [repos, setRepos] = useState<GithubRepoSummary[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepoSummary | null>(null);
  const [repoSearch, setRepoSearch] = useState("");

  const getConn = useServerFn(getGithubConnection);
  const listRepos = useServerFn(listUserRepos);
  const disconnect = useServerFn(disconnectGithub);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Show toast on OAuth callback redirect
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected") {
      toast.success("GitHub connected!");
      window.history.replaceState({}, "", "/upload");
    } else if (params.get("gh_error")) {
      toast.error(`GitHub connection failed: ${params.get("gh_error")}`);
      window.history.replaceState({}, "", "/upload");
    }
  }, []);

  const loadConnection = async () => {
    if (!user) return;
    setGhLoading(true);
    try {
      const { connection } = await getConn();
      setGhConnection(connection);
      if (connection) {
        setReposLoading(true);
        const { repos: r, error } = await listRepos();
        if (error) toast.error(`Couldn't load repos (${error})`);
        setRepos(r);
        setReposLoading(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGhLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleConnect = () => {
    if (!user) return;
    window.location.href = `/api/github/initiate?user_id=${encodeURIComponent(user.id)}`;
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect GitHub account?")) return;
    try {
      await disconnect({ data: {} });
      setGhConnection(null);
      setRepos([]);
      setSelectedRepo(null);
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!configFile && !selectedRepo) {
      return toast.error("Attach a config file, link a GitHub repo, or both");
    }
    if (configFile && configFile.size > 15 * 1024 * 1024) return toast.error("Config file must be under 15MB");
    if (screenshot && screenshot.size > 5 * 1024 * 1024) return toast.error("Screenshot must be under 5MB");

    const parsed = schema.safeParse({ title, description: description || undefined, wm_type: wmType, other_wm_name: otherName || undefined });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    try {
      let cfgPath = "";
      let cfgName = "";
      if (configFile) {
        cfgPath = `${user.id}/${Date.now()}-${configFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        cfgName = configFile.name;
        const { error: cfgErr } = await supabase.storage.from("configs").upload(cfgPath, configFile);
        if (cfgErr) throw cfgErr;
      } else if (selectedRepo) {
        // Use repo full_name as a virtual "file name" placeholder when no file is uploaded
        cfgPath = `_repo:${selectedRepo.full_name}`;
        cfgName = selectedRepo.full_name;
      }

      let screenshotUrl: string | null = null;
      if (screenshot) {
        const shotPath = `${user.id}/${Date.now()}-${screenshot.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: shotErr } = await supabase.storage.from("screenshots").upload(shotPath, screenshot);
        if (shotErr) throw shotErr;
        screenshotUrl = supabase.storage.from("screenshots").getPublicUrl(shotPath).data.publicUrl;
      }

      const { data: inserted, error: insErr } = await supabase.from("configs").insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        wm_type: parsed.data.wm_type,
        other_wm_name: parsed.data.wm_type === "other" ? parsed.data.other_wm_name ?? null : null,
        config_file_path: cfgPath,
        config_file_name: cfgName,
        screenshot_url: screenshotUrl,
        github_repo_url: selectedRepo?.html_url ?? null,
        github_repo_full_name: selectedRepo?.full_name ?? null,
        github_repo_stars: selectedRepo?.stargazers_count ?? null,
        github_repo_description: selectedRepo?.description ?? null,
      }).select("id").single();
      if (insErr) throw insErr;

      toast.success("Config uploaded!");
      navigate({ to: "/config/$id", params: { id: inserted.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !user) return null;

  const filteredRepos = repoSearch
    ? repos.filter((r) => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
    : repos;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Share your config</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload a dotfile, link a GitHub repo, or both.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
        <div>
          <Label className="text-xs">Window manager</Label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {WM_LIST.map((wm) => (
              <button
                type="button"
                key={wm.value}
                onClick={() => setWmType(wm.value)}
                className={`rounded-md border px-3 py-2 text-xs font-mono transition-colors ${wmType === wm.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground"}`}
              >
                {wm.name}
              </button>
            ))}
          </div>
          {wmType === "other" && (
            <Input className="mt-2" placeholder="Which WM? (e.g. dwm, Qtile)" value={otherName} onChange={(e) => setOtherName(e.target.value)} />
          )}
        </div>

        <div>
          <Label htmlFor="title" className="text-xs">Title</Label>
          <Input id="title" placeholder="My minimal Catppuccin setup" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
        </div>

        <div>
          <Label htmlFor="desc" className="text-xs">Description</Label>
          <Textarea id="desc" placeholder="What's special about this config? Dependencies, fonts, theme..." value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-1" />
        </div>

        {/* GitHub repo section */}
        <div>
          <Label className="text-xs">GitHub repository (optional)</Label>
          <div className="mt-1 rounded-md border border-border bg-background p-4">
            {ghLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking GitHub connection...
              </div>
            ) : !ghConnection ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Link your GitHub to attach a repo to this config.</span>
                <Button type="button" variant="outline" size="sm" onClick={handleConnect}>
                  <Github className="h-3.5 w-3.5" />
                  Connect GitHub
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    {ghConnection.github_avatar_url && (
                      <img src={ghConnection.github_avatar_url} alt="" className="h-5 w-5 rounded-full" />
                    )}
                    <span className="font-mono">@{ghConnection.github_username}</span>
                  </div>
                  <button type="button" onClick={handleDisconnect} className="text-[11px] text-muted-foreground hover:text-foreground">
                    Disconnect
                  </button>
                </div>

                {selectedRepo ? (
                  <div className="flex items-start justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        <span className="truncate font-mono text-xs">{selectedRepo.full_name}</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                          <Star className="h-3 w-3" />{selectedRepo.stargazers_count}
                        </span>
                      </div>
                      {selectedRepo.description && (
                        <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{selectedRepo.description}</p>
                      )}
                    </div>
                    <button type="button" onClick={() => setSelectedRepo(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : reposLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading repos...
                  </div>
                ) : repos.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No repos found.</p>
                ) : (
                  <>
                    <Input
                      placeholder="Search your repos..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border bg-card">
                      {filteredRepos.slice(0, 50).map((r) => (
                        <button
                          type="button"
                          key={r.id}
                          onClick={() => setSelectedRepo(r)}
                          className="flex w-full items-center justify-between gap-2 border-b border-border/50 px-3 py-2 text-left text-xs last:border-0 hover:bg-muted"
                        >
                          <span className="min-w-0 flex-1 truncate font-mono">
                            {r.full_name}
                            {r.private && <span className="ml-1 text-[9px] text-muted-foreground">private</span>}
                          </span>
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Star className="h-3 w-3" />{r.stargazers_count}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div>
          <Label className="text-xs">Config file (optional if repo linked)</Label>
          <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary/50">
            <FileCode className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-muted-foreground">
              {configFile ? configFile.name : "Click to attach .conf, .lua, .tar.gz, .zip, etc."}
            </span>
            <input type="file" className="hidden" onChange={(e) => setConfigFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <div>
          <Label className="text-xs">Screenshot (optional)</Label>
          <label className="mt-1 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-border bg-background px-4 py-3 text-sm transition-colors hover:border-primary/50">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-1 truncate text-muted-foreground">
              {screenshot ? screenshot.name : "Add a screenshot of your rice"}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)} />
          </label>
        </div>

        <Button type="submit" disabled={busy} className="w-full">
          <UploadIcon className="h-4 w-4" />
          {busy ? "Uploading..." : "Publish config"}
        </Button>
      </form>
    </main>
  );
}

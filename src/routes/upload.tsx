import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WM_LIST, type WmType } from "@/lib/wm";
import { Upload as UploadIcon, FileCode, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!configFile) return toast.error("Please attach a config file or archive");
    if (configFile.size > 15 * 1024 * 1024) return toast.error("Config file must be under 15MB");
    if (screenshot && screenshot.size > 5 * 1024 * 1024) return toast.error("Screenshot must be under 5MB");

    const parsed = schema.safeParse({ title, description: description || undefined, wm_type: wmType, other_wm_name: otherName || undefined });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);

    setBusy(true);
    try {
      const cfgPath = `${user.id}/${Date.now()}-${configFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: cfgErr } = await supabase.storage.from("configs").upload(cfgPath, configFile);
      if (cfgErr) throw cfgErr;

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
        config_file_name: configFile.name,
        screenshot_url: screenshotUrl,
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

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back</Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Share your config</h1>
      <p className="mt-1 text-sm text-muted-foreground">Upload a single dotfile or a tarball of your full setup.</p>

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

        <div>
          <Label className="text-xs">Config file</Label>
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

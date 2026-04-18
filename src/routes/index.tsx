import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WM_LIST } from "@/lib/wm";
import { ConfigCard, type ConfigCardData } from "@/components/ConfigCard";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [recent, setRecent] = useState<ConfigCardData[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("configs")
        .select("id,title,description,wm_type,other_wm_name,screenshot_url,like_count,download_count,created_at,profiles(username,avatar_url)")
        .order("created_at", { ascending: false })
        .limit(8);
      setRecent((data ?? []) as unknown as ConfigCardData[]);

      const { data: countData } = await supabase.from("configs").select("wm_type");
      const map: Record<string, number> = {};
      (countData ?? []).forEach((c: { wm_type: string }) => {
        map[c.wm_type] = (map[c.wm_type] ?? 0) + 1;
      });
      setCounts(map);
    })();
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24">
      {/* Hero */}
      <section className="relative py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 font-mono text-xs text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            A library of community window manager configs
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Share your <span className="font-mono text-primary">~/.config</span>
            <br />with the world.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground">
            Browse, upload, and download dotfile-grade configurations for the most popular Linux window managers. From Hyprland eye-candy to bspwm minimalism.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/upload">Upload your config</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#browse">Browse configs</a>
            </Button>
          </div>
        </div>
      </section>

      {/* WM sections */}
      <section id="browse" className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Browse by window manager</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick your flavor.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WM_LIST.map((wm) => (
            <Link
              key={wm.value}
              to="/wm/$type"
              params={{ type: wm.value }}
              className="group relative overflow-hidden rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card)]"
            >
              <div
                className="absolute inset-x-0 top-0 h-px opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, ${wm.accent}, transparent)` }}
              />
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-mono text-lg font-semibold" style={{ color: wm.accent }}>
                    {wm.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{wm.tagline}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
              </div>
              <div className="mt-4 font-mono text-xs text-muted-foreground">
                {counts[wm.value] ?? 0} {(counts[wm.value] ?? 0) === 1 ? "config" : "configs"}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="mt-16 space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Recently shared</h2>
        </div>

        {recent.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/30 p-12 text-center">
            <p className="text-sm text-muted-foreground">No configs yet. Be the first to share!</p>
            <Button asChild className="mt-4">
              <Link to="/upload">Upload a config</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recent.map((c) => <ConfigCard key={c.id} config={c} />)}
          </div>
        )}
      </section>
    </main>
  );
}

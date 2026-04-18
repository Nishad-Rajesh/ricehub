import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WM_MAP, type WmType } from "@/lib/wm";
import { ConfigCard, type ConfigCardData } from "@/components/ConfigCard";
import { ArrowLeft, Loader2 } from "lucide-react";

const VALID: WmType[] = ["hyprland", "i3", "sway", "awesome", "bspwm", "other"];

export const Route = createFileRoute("/wm/$type")({
  beforeLoad: ({ params }) => {
    if (!VALID.includes(params.type as WmType)) throw notFound();
  },
  head: ({ params }) => {
    const wm = WM_MAP[params.type as WmType];
    return {
      meta: [
        { title: `${wm?.name ?? "Configs"} configurations — ricehub` },
        { name: "description", content: `${wm?.name} window manager configs shared by the community.` },
        { property: "og:title", content: `${wm?.name ?? "Configs"} configurations — ricehub` },
        { property: "og:description", content: `${wm?.name} window manager configs shared by the community.` },
      ],
    };
  },
  component: WmPage,
});

function WmPage() {
  const { type } = Route.useParams();
  const wm = WM_MAP[type as WmType];
  const [configs, setConfigs] = useState<ConfigCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"new" | "top">("new");

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("configs")
        .select("id,title,description,wm_type,other_wm_name,screenshot_url,like_count,download_count,created_at,profiles(username,avatar_url)")
        .eq("wm_type", type as WmType)
        .order(sort === "top" ? "like_count" : "created_at", { ascending: false })
        .limit(60);
      setConfigs((data ?? []) as unknown as ConfigCardData[]);
      setLoading(false);
    })();
  }, [type, sort]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3 w-3" /> Back
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="font-mono text-3xl font-bold" style={{ color: wm.accent }}>
            {wm.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{wm.tagline}</p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {(["new", "top"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${sort === s ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {s === "new" ? "Newest" : "Top"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : configs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/30 p-12 text-center text-sm text-muted-foreground">
            No {wm.name} configs yet — be the first.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {configs.map((c) => <ConfigCard key={c.id} config={c} />)}
          </div>
        )}
      </div>
    </main>
  );
}

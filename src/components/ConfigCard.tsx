import { Link } from "@tanstack/react-router";
import { Heart, Download, ImageOff } from "lucide-react";
import { WM_MAP, type WmType } from "@/lib/wm";
import { formatDistanceToNow } from "date-fns";

export type ConfigCardData = {
  id: string;
  title: string;
  description: string | null;
  wm_type: WmType;
  other_wm_name: string | null;
  screenshot_url: string | null;
  like_count: number;
  download_count: number;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export function ConfigCard({ config }: { config: ConfigCardData }) {
  const wm = WM_MAP[config.wm_type];
  const wmLabel = config.wm_type === "other" && config.other_wm_name ? config.other_wm_name : wm.name;

  return (
    <Link
      to="/config/$id"
      params={{ id: config.id }}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-primary/50 hover:shadow-[var(--shadow-card)]"
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        {config.screenshot_url ? (
          <img
            src={config.screenshot_url}
            alt={config.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <span
          className="absolute left-2 top-2 rounded-md border border-border/60 bg-background/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider backdrop-blur"
          style={{ color: wm.accent }}
        >
          {wmLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground">{config.title}</h3>
        {config.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{config.description}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span className="font-mono">@{config.profiles?.username ?? "unknown"}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {config.like_count}
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              {config.download_count}
            </span>
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(config.created_at), { addSuffix: true })}
        </div>
      </div>
    </Link>
  );
}

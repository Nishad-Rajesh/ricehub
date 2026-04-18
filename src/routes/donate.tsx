import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DONATION_LINKS } from "@/lib/donations";

export const Route = createFileRoute("/donate")({
  head: () => ({
    meta: [
      { title: "Support ricehub — Donate" },
      { name: "description", content: "ricehub is free and ad-free. If it's helped you, consider supporting development via PayPal, Ko-fi, Buy Me a Coffee, or GitHub Sponsors." },
      { property: "og:title", content: "Support ricehub — Donate" },
      { property: "og:description", content: "Support ricehub via PayPal, Ko-fi, Buy Me a Coffee, or GitHub Sponsors." },
    ],
  }),
  component: DonatePage,
});

function DonatePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Button asChild variant="ghost" size="sm" className="mb-6">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to browse
        </Link>
      </Button>

      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Heart className="h-7 w-7 text-primary" />
        </div>
        <h1 className="font-mono text-3xl font-bold tracking-tight">Support ricehub</h1>
        <p className="mt-3 text-muted-foreground">
          ricehub is free, open, and ad-free. Donations help cover hosting, storage, and the time spent improving the platform.
        </p>
      </div>

      <div className="grid gap-3">
        {DONATION_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-background">
                <Icon className={`h-5 w-5 ${link.color}`} />
              </div>
              <div className="flex-1">
                <div className="font-medium">{link.name}</div>
                <div className="text-sm text-muted-foreground">{link.description}</div>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </a>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Every contribution, no matter the size, is genuinely appreciated. Thank you 💜
      </p>
    </main>
  );
}

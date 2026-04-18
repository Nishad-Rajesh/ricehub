import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Heart, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DONATION_LINKS,
  shouldShowDonationPopup,
  markDonationPopupShown,
  dismissDonationForever,
} from "@/lib/donations";

export function DonationPopup() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (shouldShowDonationPopup()) {
        setOpen(true);
        markDonationPopupShown();
      }
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Heart className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Enjoying ricehub?</DialogTitle>
          <DialogDescription className="text-center">
            ricehub is free and ad-free. If it's been useful to you, consider chipping in to help keep it running.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          {DONATION_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted"
              >
                <Icon className={`h-5 w-5 shrink-0 ${link.color}`} />
                <div className="flex-1 text-left">
                  <div className="font-medium">{link.name}</div>
                  <div className="text-xs text-muted-foreground">{link.description}</div>
                </div>
              </a>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              dismissDonationForever();
              setOpen(false);
            }}
          >
            <X className="h-4 w-4" />
            Don't show again
          </Button>
          <Button asChild variant="outline" size="sm" onClick={() => setOpen(false)}>
            <Link to="/donate">See all options</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { DonationPopup } from "@/components/DonationPopup";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-mono text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ricehub — share your Linux WM configs" },
      { name: "description", content: "Discover, upload, and download window manager configurations for Hyprland, i3, Sway, AwesomeWM, bspwm and more." },
      { name: "author", content: "ricehub" },
      { property: "og:title", content: "ricehub — share your Linux WM configs" },
      { property: "og:description", content: "Discover, upload, and download window manager configurations for Hyprland, i3, Sway, AwesomeWM, bspwm and more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "ricehub — share your Linux WM configs" },
      { name: "twitter:description", content: "Discover, upload, and download window manager configurations for Hyprland, i3, Sway, AwesomeWM, bspwm and more." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/22adf81e-3ea9-4aaf-88c3-9ddf41c54667/id-preview-0df4d783--7e736b91-a601-4239-b2bc-2e45ec06d482.lovable.app-1776539787130.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/22adf81e-3ea9-4aaf-88c3-9ddf41c54667/id-preview-0df4d783--7e736b91-a601-4239-b2bc-2e45ec06d482.lovable.app-1776539787130.png" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[500px]" style={{ background: "var(--gradient-glow)" }} />
        <Header />
        <Outlet />
      </div>
      <Toaster />
      <DonationPopup />
    </AuthProvider>
  );
}

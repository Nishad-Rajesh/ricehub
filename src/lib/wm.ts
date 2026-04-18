export type WmType = "hyprland" | "i3" | "sway" | "awesome" | "bspwm" | "other";

export const WM_LIST: { value: WmType; name: string; tagline: string; accent: string }[] = [
  { value: "hyprland", name: "Hyprland", tagline: "Dynamic Wayland compositor with eye candy", accent: "oklch(0.75 0.15 220)" },
  { value: "i3", name: "i3", tagline: "The classic tiling X11 window manager", accent: "oklch(0.78 0.16 145)" },
  { value: "sway", name: "Sway", tagline: "i3-compatible Wayland compositor", accent: "oklch(0.75 0.14 280)" },
  { value: "awesome", name: "AwesomeWM", tagline: "Highly configurable Lua-powered WM", accent: "oklch(0.78 0.15 60)" },
  { value: "bspwm", name: "bspwm", tagline: "Binary space partitioning tiling WM", accent: "oklch(0.72 0.16 30)" },
  { value: "other", name: "Other", tagline: "dwm, Qtile, XMonad, river, and more", accent: "oklch(0.7 0.05 250)" },
];

export const WM_MAP: Record<WmType, (typeof WM_LIST)[number]> = WM_LIST.reduce(
  (acc, w) => ({ ...acc, [w.value]: w }),
  {} as Record<WmType, (typeof WM_LIST)[number]>,
);

import { Heart, Coffee, Github } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DonationLink = {
  name: string;
  url: string;
  description: string;
  icon: LucideIcon;
  color: string;
};

// TODO: Replace these placeholder URLs with your actual donation handles.
export const DONATION_LINKS: DonationLink[] = [
  {
    name: "PayPal",
    url: "https://paypal.me/your-handle",
    description: "One-time donation via PayPal",
    icon: Heart,
    color: "text-[#0070ba]",
  },
  {
    name: "Ko-fi",
    url: "https://ko-fi.com/your-handle",
    description: "Buy me a coffee on Ko-fi",
    icon: Coffee,
    color: "text-[#ff5e5b]",
  },
  {
    name: "Buy Me a Coffee",
    url: "https://buymeacoffee.com/your-handle",
    description: "Support with a small tip",
    icon: Coffee,
    color: "text-[#ffdd00]",
  },
  {
    name: "GitHub Sponsors",
    url: "https://github.com/sponsors/your-handle",
    description: "Recurring sponsorship via GitHub",
    icon: Github,
    color: "text-foreground",
  },
];

const STORAGE_KEY = "ricehub:donation-popup";
const DISMISS_KEY = "ricehub:donation-dismissed-forever";

type State = { sessionsSinceShown: number; lastShownAt: number };

function readState(): State {
  if (typeof window === "undefined") return { sessionsSinceShown: 0, lastShownAt: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessionsSinceShown: 0, lastShownAt: 0 };
    return JSON.parse(raw);
  } catch {
    return { sessionsSinceShown: 0, lastShownAt: 0 };
  }
}

function writeState(s: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

const SESSION_FLAG = "ricehub:donation-session-counted";

/**
 * Should the donation popup show this session?
 * Strategy: increment a session counter on first call per tab session,
 * then show roughly every 2-3 sessions (random within range).
 */
export function shouldShowDonationPopup(): boolean {
  if (typeof window === "undefined") return false;
  if (localStorage.getItem(DISMISS_KEY) === "1") return false;

  const state = readState();
  const alreadyCounted = sessionStorage.getItem(SESSION_FLAG) === "1";

  let sessions = state.sessionsSinceShown;
  if (!alreadyCounted) {
    sessions += 1;
    sessionStorage.setItem(SESSION_FLAG, "1");
    writeState({ ...state, sessionsSinceShown: sessions });
  }

  // Threshold: 2 or 3, randomly chosen and stored on first session post-show
  const threshold = 2 + Math.floor(Math.random() * 2); // 2 or 3
  return sessions >= threshold;
}

export function markDonationPopupShown() {
  writeState({ sessionsSinceShown: 0, lastShownAt: Date.now() });
}

export function dismissDonationForever() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignore
  }
}

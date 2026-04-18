import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Terminal } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ricehub" },
      { name: "description", content: "Sign in or create an account on ricehub." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email({ message: "Invalid email" }).max(255);
const passwordSchema = z.string().min(6, { message: "Password must be at least 6 characters" }).max(128);

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) {
    navigate({ to: "/" });
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(email);
    const pv = passwordSchema.safeParse(password);
    if (!ev.success) return toast.error(ev.error.issues[0].message);
    if (!pv.success) return toast.error(pv.error.issues[0].message);

    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: ev.data,
        password: pv.data,
        options: { emailRedirectTo: `${window.location.origin}/` },
      });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Account created! You're signed in.");
      navigate({ to: "/" });
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: ev.data, password: pv.data });
      setBusy(false);
      if (error) return toast.error(error.message);
      navigate({ to: "/" });
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md items-center px-4">
      <div className="w-full">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-mono text-sm">
          <Terminal className="h-4 w-4 text-primary" /> ricehub
        </Link>
        <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-semibold">{mode === "signin" ? "Welcome back" : "Create account"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signin" ? "Sign in to upload and like configs" : "Join the community"}
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <div>
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input id="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "..." : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "Don't have an account?" : "Already have one?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

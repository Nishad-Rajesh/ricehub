import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfigCard, type ConfigCardData } from "@/components/ConfigCard";
import { Loader2 } from "lucide-react";

type Profile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export const Route = createFileRoute("/u/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — ricehub` },
      { name: "description", content: `Configs shared by @${params.username}` },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [configs, setConfigs] = useState<ConfigCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      setProfile(p as Profile | null);
      if (p) {
        const { data: c } = await supabase
          .from("configs")
          .select("id,title,description,wm_type,other_wm_name,screenshot_url,like_count,download_count,created_at,profiles(username,avatar_url)")
          .eq("user_id", p.user_id)
          .order("created_at", { ascending: false });
        setConfigs((c ?? []) as unknown as ConfigCardData[]);
      }
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">User not found.</div>;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Home</Link>
      <div className="mt-4 flex items-center gap-4 border-b border-border pb-6">
        <Avatar className="h-16 w-16 border border-border">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="font-mono">{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name || profile.username}</h1>
          <div className="font-mono text-sm text-muted-foreground">@{profile.username}</div>
          {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold">Configs ({configs.length})</h2>
      {configs.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No configs yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {configs.map((c) => <ConfigCard key={c.id} config={c} />)}
        </div>
      )}
    </main>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { moderateContent } from "@/server/moderation.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Trash2, Loader2, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type CommentRow = {
  id: string;
  config_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

type ThreadedComment = CommentRow & { replies: CommentRow[] };

export function Comments({ configId, ownerId }: { configId: string; ownerId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const moderate = useServerFn(moderateContent);
  const [comments, setComments] = useState<ThreadedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("comments")
      .select("id,config_id,user_id,parent_id,content,created_at,profiles(username,display_name,avatar_url)")
      .eq("config_id", configId)
      .order("created_at", { ascending: true });
    const rows = (data ?? []) as unknown as CommentRow[];
    const roots = rows.filter((r) => !r.parent_id);
    const repliesByParent = new Map<string, CommentRow[]>();
    for (const r of rows) {
      if (r.parent_id) {
        const arr = repliesByParent.get(r.parent_id) ?? [];
        arr.push(r);
        repliesByParent.set(r.parent_id, arr);
      }
    }
    setComments(roots.map((r) => ({ ...r, replies: repliesByParent.get(r.id) ?? [] })));
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configId]);

  const submit = async (content: string, parentId: string | null) => {
    if (!user) return navigate({ to: "/auth" });
    const trimmed = content.trim();
    if (trimmed.length < 1) return toast.error("Comment can't be empty");
    if (trimmed.length > 2000) return toast.error("Comment is too long (max 2000 chars)");

    setPosting(true);
    try {
      const result = await moderate({ data: { text: trimmed } });
      if (!result.ok) {
        toast.error(result.reason ?? "Comment was rejected by moderation.");
        return;
      }
      const { error } = await supabase.from("comments").insert({
        config_id: configId,
        user_id: user.id,
        parent_id: parentId,
        content: trimmed,
      });
      if (error) throw error;
      if (parentId) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setText("");
      }
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error("Failed to delete");
    await load();
  };

  const canDelete = (c: CommentRow) => user && (user.id === c.user_id || user.id === ownerId);

  const total = comments.reduce((acc, c) => acc + 1 + c.replies.length, 0);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Comments {total > 0 && <span className="text-muted-foreground">· {total}</span>}</h2>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {user ? (
          <div className="space-y-2">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share your thoughts on this rice…"
              rows={3}
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{text.length}/2000</span>
              <Button size="sm" disabled={posting || text.trim().length === 0} onClick={() => submit(text, null)}>
                {posting && <Loader2 className="h-3 w-3 animate-spin" />}
                Post comment
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a comment.
          </p>
        )}
      </div>

      <div className="mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No comments yet. Be the first.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <CommentHeader c={c} canDelete={!!canDelete(c)} onDelete={() => remove(c.id)} />
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground/90">{c.content}</p>

              <div className="mt-2">
                {user && (
                  <button
                    onClick={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyText(""); }}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    {replyTo === c.id ? "Cancel" : "Reply"}
                  </button>
                )}
              </div>

              {replyTo === c.id && (
                <div className="mt-3 space-y-2 border-l-2 border-primary/30 pl-3">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to @${c.profiles?.username ?? "user"}…`}
                    rows={2}
                    maxLength={2000}
                  />
                  <div className="flex justify-end">
                    <Button size="sm" disabled={posting || replyText.trim().length === 0} onClick={() => submit(replyText, c.id)}>
                      {posting && <Loader2 className="h-3 w-3 animate-spin" />}
                      Reply
                    </Button>
                  </div>
                </div>
              )}

              {c.replies.length > 0 && (
                <div className="mt-3 space-y-3 border-l-2 border-border pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="rounded-lg bg-background/50 p-3">
                      <div className="flex items-start gap-1">
                        <CornerDownRight className="mt-1 h-3 w-3 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <CommentHeader c={r} canDelete={!!canDelete(r)} onDelete={() => remove(r.id)} small />
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">{r.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function CommentHeader({ c, canDelete, onDelete, small }: { c: CommentRow; canDelete: boolean; onDelete: () => void; small?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        to="/u/$username"
        params={{ username: c.profiles?.username ?? "" }}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <Avatar className={small ? "h-4 w-4" : "h-5 w-5"}>
          <AvatarImage src={c.profiles?.avatar_url ?? undefined} />
          <AvatarFallback className="text-[9px]">{(c.profiles?.username ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-mono">@{c.profiles?.username ?? "unknown"}</span>
        <span>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
      </Link>
      {canDelete && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Delete comment">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

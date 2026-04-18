-- Table to store per-user GitHub OAuth connections
CREATE TABLE public.github_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  github_user_id BIGINT NOT NULL,
  github_username TEXT NOT NULL,
  github_avatar_url TEXT,
  access_token TEXT NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.github_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own github connection"
  ON public.github_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own github connection"
  ON public.github_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own github connection"
  ON public.github_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own github connection"
  ON public.github_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_github_connections_updated_at
  BEFORE UPDATE ON public.github_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add GitHub repo fields to configs
ALTER TABLE public.configs
  ADD COLUMN github_repo_url TEXT,
  ADD COLUMN github_repo_full_name TEXT,
  ADD COLUMN github_repo_stars INTEGER,
  ADD COLUMN github_repo_description TEXT;
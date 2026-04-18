
-- DISLIKES
CREATE TABLE public.dislikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  config_id uuid NOT NULL REFERENCES public.configs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, config_id)
);
ALTER TABLE public.dislikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dislikes viewable by everyone" ON public.dislikes FOR SELECT USING (true);
CREATE POLICY "Users insert own dislikes" ON public.dislikes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own dislikes" ON public.dislikes FOR DELETE USING (auth.uid() = user_id);

-- COMMENTS
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id uuid NOT NULL REFERENCES public.configs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_config ON public.comments(config_id, created_at DESC);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments viewable by everyone (visible)" ON public.comments
  FOR SELECT USING (is_hidden = false OR auth.uid() = user_id);
CREATE POLICY "Users insert own comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own or owned-config comments" ON public.comments
  FOR DELETE USING (
    auth.uid() = user_id
    OR auth.uid() IN (SELECT user_id FROM public.configs WHERE id = comments.config_id)
  );

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CONFIG COUNTERS
ALTER TABLE public.configs
  ADD COLUMN dislike_count integer NOT NULL DEFAULT 0,
  ADD COLUMN score integer NOT NULL DEFAULT 0,
  ADD COLUMN comment_count integer NOT NULL DEFAULT 0;

-- Recompute score when like_count changes (replace existing function to also update score)
CREATE OR REPLACE FUNCTION public.update_config_like_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.configs
      SET like_count = like_count + 1,
          score = like_count + 1 - dislike_count
    WHERE id = NEW.config_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.configs
      SET like_count = GREATEST(like_count - 1, 0),
          score = GREATEST(like_count - 1, 0) - dislike_count
    WHERE id = OLD.config_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_config_dislike_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.configs
      SET dislike_count = dislike_count + 1,
          score = like_count - (dislike_count + 1)
    WHERE id = NEW.config_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.configs
      SET dislike_count = GREATEST(dislike_count - 1, 0),
          score = like_count - GREATEST(dislike_count - 1, 0)
    WHERE id = OLD.config_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER dislikes_count_trigger
  AFTER INSERT OR DELETE ON public.dislikes
  FOR EACH ROW EXECUTE FUNCTION public.update_config_dislike_count();

CREATE OR REPLACE FUNCTION public.update_config_comment_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.configs SET comment_count = comment_count + 1 WHERE id = NEW.config_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.configs SET comment_count = GREATEST(comment_count - 1, 0) WHERE id = OLD.config_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_config_comment_count();

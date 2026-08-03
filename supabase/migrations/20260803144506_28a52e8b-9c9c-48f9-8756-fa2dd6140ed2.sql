-- 1) Prevent users from writing popularity counters directly
REVOKE UPDATE (like_count, dislike_count, download_count, score, comment_count)
  ON public.configs FROM authenticated, anon;

-- 2) Safe download counting for everyone
CREATE OR REPLACE FUNCTION public.increment_download_count(_config_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.configs
    SET download_count = download_count + 1
  WHERE id = _config_id
  RETURNING download_count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO anon, authenticated;

-- 3) Never expose the GitHub OAuth token through the Data API
REVOKE SELECT (access_token) ON public.github_connections FROM authenticated, anon;
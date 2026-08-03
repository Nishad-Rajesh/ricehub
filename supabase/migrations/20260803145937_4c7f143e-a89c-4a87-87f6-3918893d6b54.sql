-- configs
GRANT SELECT ON public.configs TO anon, authenticated;
GRANT INSERT, DELETE ON public.configs TO authenticated;
GRANT UPDATE (title, description, wm_type, other_wm_name, config_file_path, config_file_name, screenshot_url, github_repo_url, github_repo_full_name, github_repo_stars, github_repo_description, updated_at) ON public.configs TO authenticated;
GRANT ALL ON public.configs TO service_role;

-- profiles
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- comments
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.comments TO authenticated;
GRANT UPDATE (content, is_hidden, updated_at) ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;

-- likes / dislikes
GRANT SELECT ON public.likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.likes TO authenticated;
GRANT ALL ON public.likes TO service_role;
GRANT SELECT ON public.dislikes TO anon, authenticated;
GRANT INSERT, DELETE ON public.dislikes TO authenticated;
GRANT ALL ON public.dislikes TO service_role;

-- github connections (access_token intentionally excluded from SELECT)
GRANT SELECT (id, user_id, github_user_id, github_username, github_avatar_url, scope, created_at, updated_at) ON public.github_connections TO authenticated;
GRANT INSERT, DELETE ON public.github_connections TO authenticated;
GRANT UPDATE (github_username, github_avatar_url, updated_at) ON public.github_connections TO authenticated;
GRANT ALL ON public.github_connections TO service_role;

GRANT EXECUTE ON FUNCTION public.increment_download_count(uuid) TO anon, authenticated, service_role;

-- Create post_likes table
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view likes
CREATE POLICY "Anyone can view likes" ON public.post_likes
  FOR SELECT TO authenticated USING (true);

-- Users can like posts
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can unlike their own likes
CREATE POLICY "Users can unlike" ON public.post_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- XP reward function for post engagement
CREATE OR REPLACE FUNCTION public.award_engagement_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award XP for liking a post (2 XP)
  IF TG_TABLE_NAME = 'post_likes' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.xp_transactions (user_id, action, xp_amount, description)
    VALUES (NEW.user_id, 'post_like', 2, 'Liked a post');
  END IF;

  -- Award XP for commenting (5 XP)
  IF TG_TABLE_NAME = 'comments' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.xp_transactions (user_id, action, xp_amount, description)
    VALUES (NEW.user_id, 'post_comment', 5, 'Commented on a post');
  END IF;

  -- Award XP for creating a post (10 XP)
  IF TG_TABLE_NAME = 'posts' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.xp_transactions (user_id, action, xp_amount, description)
    VALUES (NEW.user_id, 'create_post', 10, 'Created a post');
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers for XP
CREATE TRIGGER trg_like_xp
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.award_engagement_xp();

CREATE TRIGGER trg_comment_xp
  AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.award_engagement_xp();

CREATE TRIGGER trg_post_xp
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.award_engagement_xp();

-- Enable realtime for post_likes
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;

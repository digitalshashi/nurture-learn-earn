-- Per-chapter discussion, shown under the Resources tab on the Watch page.
CREATE TABLE public.chapter_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.chapter_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON public.chapter_comments (chapter_id, created_at);

ALTER TABLE public.chapter_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view chapter comments" ON public.chapter_comments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can post chapter comments" ON public.chapter_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own chapter comments" ON public.chapter_comments
  FOR DELETE TO authenticated USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.chapter_comments;

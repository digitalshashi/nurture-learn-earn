
-- Channel members table for access control
CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channel members" ON public.channel_members
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Coaches can manage members" ON public.channel_members
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can join public channels" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave channels" ON public.channel_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Channel messages table
CREATE TABLE public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  parent_id uuid REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  file_url text,
  file_name text,
  file_type text,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view channel messages" ON public.channel_messages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can send messages" ON public.channel_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can edit own messages" ON public.channel_messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.channel_messages
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'coach') OR has_role(auth.uid(), 'admin'));

-- Message reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can add reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Add description to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;

-- Create channel-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('channel-files', 'channel-files', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Authenticated can upload channel files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'channel-files');
CREATE POLICY "Anyone can view channel files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'channel-files');

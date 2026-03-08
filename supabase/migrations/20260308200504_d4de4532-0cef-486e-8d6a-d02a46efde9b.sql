
-- CRM Pipelines
CREATE TABLE public.crm_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  coach_id uuid NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own pipelines" ON public.crm_pipelines FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- CRM Pipeline Stages
CREATE TABLE public.crm_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#6366f1',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage pipeline stages" ON public.crm_pipeline_stages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND p.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_pipelines p WHERE p.id = crm_pipeline_stages.pipeline_id AND p.coach_id = auth.uid()));

-- CRM Leads
CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  city text,
  source text DEFAULT 'manual',
  pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  coach_id uuid NOT NULL,
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  pipeline_value numeric DEFAULT 0,
  assigned_to uuid,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own leads" ON public.crm_leads FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- CRM Lead Notes
CREATE TABLE public.crm_lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  note_type text DEFAULT 'note',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage lead notes" ON public.crm_lead_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_notes.lead_id AND l.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_leads l WHERE l.id = crm_lead_notes.lead_id AND l.coach_id = auth.uid()));

-- CRM Follow-ups
CREATE TABLE public.crm_follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  task text NOT NULL,
  due_date timestamptz NOT NULL,
  assigned_to uuid,
  status text NOT NULL DEFAULT 'pending',
  follow_up_type text DEFAULT 'call',
  coach_id uuid NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_follow_ups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own follow-ups" ON public.crm_follow_ups FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- CRM Contact Groups
CREATE TABLE public.crm_contact_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  coach_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_contact_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own contact groups" ON public.crm_contact_groups FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- CRM Contact Group Members
CREATE TABLE public.crm_contact_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.crm_contact_groups(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, lead_id)
);
ALTER TABLE public.crm_contact_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage group members" ON public.crm_contact_group_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.crm_contact_groups g WHERE g.id = crm_contact_group_members.group_id AND g.coach_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.crm_contact_groups g WHERE g.id = crm_contact_group_members.group_id AND g.coach_id = auth.uid()));

-- CRM Meta Lead Config
CREATE TABLE public.crm_meta_lead_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL,
  page_name text,
  page_id text,
  webhook_url text,
  webhook_secret text,
  default_pipeline_id uuid REFERENCES public.crm_pipelines(id) ON DELETE SET NULL,
  default_stage_id uuid REFERENCES public.crm_pipeline_stages(id) ON DELETE SET NULL,
  field_mapping jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_meta_lead_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Coaches manage own meta config" ON public.crm_meta_lead_config FOR ALL TO authenticated
  USING (coach_id = auth.uid()) WITH CHECK (coach_id = auth.uid());

-- Course blueprints: the plan behind a course, kept separately from the course.
--
-- A blueprint is not a course. It is the structured plan a coach works on
-- before any video exists — six transformation steps, fifteen foundation
-- slots, six bonuses, a live schedule — and it stays editable long after the
-- course has been published from it. Storing it inside courses/sections/
-- chapters would mean losing the structure the moment it was published: there
-- is nowhere in a chapter row to record that it is Day 2 slot 3, teaching step
-- 2, and no way to regenerate one section of it without re-deriving all that
-- from prose.
--
-- So the blueprint is stored as one JSON document — the canonical shape in
-- src/lib/courseEngine/types.ts — and publishing is a one-way render of it
-- into real course rows. The same document is what the markdown export renders,
-- which is why re-exporting never costs a model call.

-- --------------------------------------------------------------- blueprints

CREATE TABLE IF NOT EXISTS public.course_blueprints (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                text NOT NULL,

  -- How it was filled in. Kept on the row as well as inside the payload
  -- because the list screen filters on it and should not have to open a
  -- jsonb document to draw a badge.
  mode                text NOT NULL DEFAULT 'formula'
                        CHECK (mode IN ('formula', 'manual', 'ai')),

  -- The five inputs. Denormalised out of the payload for the same reason:
  -- the list screen shows the topic, and search runs over it.
  topic               text NOT NULL,
  audience            text NOT NULL DEFAULT '',
  starting_pain       text NOT NULL DEFAULT '',
  desired_result      text NOT NULL DEFAULT '',
  coach_name          text NOT NULL DEFAULT '',
  language            text NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'te', 'tinglish')),

  -- steps_pending is the human checkpoint: the six steps exist but nobody has
  -- approved them, and nothing downstream is generated until someone does.
  -- Regenerating six steps is cheap; regenerating a whole course is not.
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'steps_pending', 'steps_approved',
                                          'generating', 'complete', 'failed')),

  payload             jsonb,
  version             int NOT NULL DEFAULT 1,

  -- Set once the blueprint has been turned into a real course. Nulled rather
  -- than cascaded if that course is later deleted: the plan outlives the
  -- course built from it, and a coach who deletes a course to rebuild it
  -- should still have the blueprint that describes it.
  published_course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- The list screen is "my blueprints, newest first" and nothing else.
CREATE INDEX IF NOT EXISTS course_blueprints_coach_idx
  ON public.course_blueprints (coach_id, created_at DESC);

DROP TRIGGER IF EXISTS course_blueprints_updated_at ON public.course_blueprints;
CREATE TRIGGER course_blueprints_updated_at
  BEFORE UPDATE ON public.course_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.course_blueprints ENABLE ROW LEVEL SECURITY;

-- Without this, any authenticated user reads every coach's unreleased course
-- plans — which on a white-label install means reading a competitor's.
DROP POLICY IF EXISTS "Coaches own their blueprints" ON public.course_blueprints;
CREATE POLICY "Coaches own their blueprints"
  ON public.course_blueprints FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS "Admins read every blueprint" ON public.course_blueprints;
CREATE POLICY "Admins read every blueprint"
  ON public.course_blueprints FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ----------------------------------------------------------------- versions

-- Every approved generation snapshots here before it overwrites anything.
--
-- Regenerating a section is the destructive operation in this feature: a coach
-- who has hand-edited Day 2 and then asks for new bonuses must not lose Day 2
-- because one call came back rewriting the whole payload. The snapshot is
-- taken before the write, so the previous state is always one restore away.
CREATE TABLE IF NOT EXISTS public.course_blueprint_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id uuid NOT NULL REFERENCES public.course_blueprints(id) ON DELETE CASCADE,
  version      int NOT NULL,
  payload      jsonb NOT NULL,
  -- What changed, in the coach's terms: "generated with AI", "regenerated
  -- bonuses", "filled from formula".
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blueprint_id, version)
);

CREATE INDEX IF NOT EXISTS course_blueprint_versions_blueprint_idx
  ON public.course_blueprint_versions (blueprint_id, version DESC);

ALTER TABLE public.course_blueprint_versions ENABLE ROW LEVEL SECURITY;

-- Ownership lives on the parent row, so the policy asks the parent. Writes go
-- through the same check, which stops a version being attached to somebody
-- else's blueprint.
DROP POLICY IF EXISTS "Coaches own their blueprint versions" ON public.course_blueprint_versions;
CREATE POLICY "Coaches own their blueprint versions"
  ON public.course_blueprint_versions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.course_blueprints b
    WHERE b.id = blueprint_id AND b.coach_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.course_blueprints b
    WHERE b.id = blueprint_id AND b.coach_id = auth.uid()
  ));

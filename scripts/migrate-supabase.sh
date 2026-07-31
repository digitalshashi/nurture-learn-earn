#!/usr/bin/env bash
# Complete Supabase project migration: schema, data, auth users, storage,
# edge functions, and secrets — from OLD_PROJECT_REF to NEW_PROJECT_REF.
#
# Prerequisites:
#   1. cp scripts/.env.migration.example scripts/.env.migration
#      and fill in every value (never commit this file, never paste it to anyone).
#   2. A NEW, empty Supabase project already created.
#   3. Run this from the repo root: bash scripts/migrate-supabase.sh
#
# Safe to re-run: schema push and function deploys are idempotent; data
# restore steps are guarded with `ON CONFLICT DO NOTHING`-safe pg_dump flags
# and will simply fail loudly (not silently duplicate) if run twice — read
# the output.

set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE="scripts/.env.migration"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy scripts/.env.migration.example and fill it in first."
  exit 1
fi
set -a
source "$ENV_FILE"
set +a

for var in SUPABASE_ACCESS_TOKEN OLD_PROJECT_REF OLD_DB_URL NEW_PROJECT_REF NEW_DB_URL NEW_SERVICE_ROLE_KEY; do
  if [ -z "${!var:-}" ]; then
    echo "Missing required value: $var (check $ENV_FILE)"
    exit 1
  fi
done

export SUPABASE_ACCESS_TOKEN

echo "=============================================="
echo " 1/6  Link CLI to the NEW project and push schema"
echo "=============================================="
npx supabase link --project-ref "$NEW_PROJECT_REF"
npx supabase db push

echo "=============================================="
echo " 2/6  Copy table data (public schema, data-only)"
echo "=============================================="
# --data-only + --disable-triggers avoids re-firing triggers (e.g. the
# handle_new_user profile-creation trigger) since we restore auth.users
# separately in step 3 and public-schema rows should just land as-is.
pg_dump "$OLD_DB_URL" \
  --schema=public --data-only --disable-triggers --no-owner --no-privileges \
  -f /tmp/supabase-migration-public-data.sql
psql "$NEW_DB_URL" -f /tmp/supabase-migration-public-data.sql

echo "=============================================="
echo " 3/6  Copy auth users (passwords, identities)"
echo "=============================================="
pg_dump "$OLD_DB_URL" \
  --schema=auth --data-only --disable-triggers --no-owner --no-privileges \
  --exclude-table=auth.schema_migrations \
  -f /tmp/supabase-migration-auth-data.sql
psql "$NEW_DB_URL" -f /tmp/supabase-migration-auth-data.sql

echo "=============================================="
echo " 4/6  Deploy all edge functions to the new project"
echo "=============================================="
for fn_dir in supabase/functions/*/; do
  fn_name=$(basename "$fn_dir")
  if [ "$fn_name" = "_shared" ]; then continue; fi
  echo "--- deploying $fn_name ---"
  npx supabase functions deploy "$fn_name" --project-ref "$NEW_PROJECT_REF"
done

echo "=============================================="
echo " 5/6  Set edge function secrets on the new project"
echo "=============================================="
if [ -n "${LOVABLE_API_KEY:-}" ]; then
  npx supabase secrets set --project-ref "$NEW_PROJECT_REF" LOVABLE_API_KEY="$LOVABLE_API_KEY"
else
  echo "LOVABLE_API_KEY not set in $ENV_FILE — skipping (AI features will fail until you set it manually)."
fi
# Note: SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
# auto-injected by Supabase for every project's edge functions — no need
# to set them manually.

echo "=============================================="
echo " 6/6  Migrate storage bucket files"
echo "=============================================="
node scripts/migrate-storage.mjs

echo ""
echo "=============================================="
echo " DONE — remaining MANUAL steps (can't be scripted):"
echo "=============================================="
cat <<'EOF'
1. In the NEW project's dashboard -> Authentication -> URL Configuration:
   set Site URL and Redirect URLs to match your app's domain.
2. Authentication -> Providers: re-enable/reconfigure any OAuth providers
   (Google, etc.) if this app uses them — provider secrets don't migrate.
3. Authentication -> Emails: Supabase's own auth email templates (password
   reset, invite, etc.) are dashboard-only and don't migrate via SQL —
   reconfigure if customized.
4. Update this repo's .env:
     VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (new anon key),
     VITE_SUPABASE_PROJECT_ID
   and supabase/config.toml's project_id, to point at NEW_PROJECT_REF.
5. In-app: Email Settings -> re-verify/re-test each sender account (test
   sends aren't data — the "is_verified" flag copied over, but do a live
   Test to be sure the new project's egress isn't blocked by the provider).
6. Once verified working end-to-end, redeploy the frontend:
     npm run deploy
7. Only after confirming everything works on the new project, consider
   pausing/deleting the OLD project.
EOF

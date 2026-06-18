-- Migration: Harden anon-exposed RLS policies
-- Date: 2026-06-17
--
-- CONTEXT: A live probe (public/anon key only) confirmed that anonymous internet
-- visitors could READ and even INSERT/DELETE rows in several tables, because their
-- RLS policies used USING(true)/WITH CHECK(true) with NO "TO" role clause (= PUBLIC,
-- which includes the anon role). Combined with Supabase's default GRANT ALL TO anon,
-- this exposed internal data to the world.
--
-- VERIFIED EXPLOITABLE 2026-06-17:
--   * inventory_snapshots  -> anon INSERT (201) + DELETE (200)
--   * label_templates      -> anon INSERT (201) + DELETE (200)
--   * tipz                 -> anon SELECT returned 18 rows incl. user_email
--   * custom_builder_presets -> anon SELECT returned 4 rows incl. user_id
--
-- SAFETY: These tables are used only by the authenticated main app
-- (inventory-module.js, label-designer.js, system-tools-module.js, index.html).
-- The remote tools (tools/remote-*.html) authenticate via auth.setSession(), so they
-- run as "authenticated" and are unaffected. This migration re-scopes the policies to
-- TO authenticated while preserving identical in-app behavior for logged-in users.
--
-- NOT touched here (need a decision first — see notes at bottom):
--   feature_flags, daemon_status, discovered_devices_telemetry,
--   remote_debug_logs, telemetry_errors

BEGIN;

-- ============================================================
-- inventory_snapshots  (anon could read / insert / DELETE)
-- ============================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."inventory_snapshots";
CREATE POLICY "Enable read access for all users" ON "public"."inventory_snapshots"
  FOR SELECT TO "authenticated" USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."inventory_snapshots";
CREATE POLICY "Enable insert for all users" ON "public"."inventory_snapshots"
  FOR INSERT TO "authenticated" WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."inventory_snapshots";
CREATE POLICY "Enable delete for all users" ON "public"."inventory_snapshots"
  FOR DELETE TO "authenticated" USING (true);

-- ============================================================
-- label_templates  (anon could read / insert / update / DELETE)
-- ============================================================
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."label_templates";
CREATE POLICY "Enable read access for all users" ON "public"."label_templates"
  FOR SELECT TO "authenticated" USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."label_templates";
CREATE POLICY "Enable insert for all users" ON "public"."label_templates"
  FOR INSERT TO "authenticated" WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON "public"."label_templates";
CREATE POLICY "Enable update for all users" ON "public"."label_templates"
  FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."label_templates";
CREATE POLICY "Enable delete for all users" ON "public"."label_templates"
  FOR DELETE TO "authenticated" USING (true);

-- ============================================================
-- tipz  (anon could read internal user emails + insert)
-- An "authenticated_full_access" policy already exists on tipz, so we simply
-- remove the redundant public policies (no replacement needed).
-- ============================================================
DROP POLICY IF EXISTS "Allow public reads of tipz" ON "public"."tipz";
DROP POLICY IF EXISTS "Allow public inserts to tipz" ON "public"."tipz";

-- ============================================================
-- custom_builder_presets  (anon could read presets incl. user_id)
-- Keep all-authenticated read (preserves any in-app "browse presets" behavior),
-- just remove anon. Per-user write policy ("Users can manage their own builder
-- presets") is unchanged.
-- ============================================================
DROP POLICY IF EXISTS "Anyone can select custom_builder_presets" ON "public"."custom_builder_presets";
CREATE POLICY "Anyone can select custom_builder_presets" ON "public"."custom_builder_presets"
  FOR SELECT TO "authenticated" USING (true);

COMMIT;

-- ============================================================
-- DEFERRED (decide before hardening — may have legitimate anon clients):
--
--   feature_flags        "Anyone can view feature flags" FOR SELECT USING (true)
--       -> Restrict only if the login screen does NOT read flags before sign-in.
--
--   daemon_status        "Allow public read access to daemon_status" FOR SELECT USING (true)
--       -> Restrict only if the background daemon does not read its status as anon.
--          (Its anon INSERT/UPDATE are already constrained to a fixed UUID.)
--
--   discovered_devices_telemetry / remote_debug_logs / telemetry_errors
--       -> Public INSERT policies. Insert-only = no data disclosure, but allows
--          anonymous spam/storage abuse. Restrict to authenticated only if no
--          unauthenticated daemon writes telemetry. Otherwise add a rate/size guard.
-- ============================================================

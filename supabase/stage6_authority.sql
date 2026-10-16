-- ==========================================
-- SAFARSATHI STAGE 6: AUTHORITY DASHBOARD
-- ==========================================
-- Run this in your Supabase SQL editor.
-- Safe to run multiple times (uses IF NOT EXISTS / DROP IF EXISTS).

-- ── 1. Add new SOS lifecycle columns (idempotent) ────────────────────────────
ALTER TABLE public.sos_alerts
  ADD COLUMN IF NOT EXISTS guide_resolved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS closed_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at         TIMESTAMP WITH TIME ZONE;

-- ── 2. Expand the status CHECK constraint to include 'guide_resolved' ─────────
-- PostgreSQL does not support altering a check constraint in place;
-- drop the old one and recreate with the new value set.
ALTER TABLE public.sos_alerts
  DROP CONSTRAINT IF EXISTS sos_alerts_status_check;

ALTER TABLE public.sos_alerts
  ADD CONSTRAINT sos_alerts_status_check
  CHECK (status IN ('active', 'acknowledged', 'guide_resolved', 'resolved'));

-- ── 3. Fix RLS policies that used the non-existent trips.guide_id ────────────
--    (The correct column is trips.created_by)

DROP POLICY IF EXISTS "Allow scoped read of SOS alerts"                ON public.sos_alerts;
DROP POLICY IF EXISTS "Allow guide and authority to update SOS status" ON public.sos_alerts;

-- SELECT: owner | trip guide (created_by) | authority
CREATE POLICY "Allow scoped read of SOS alerts" ON public.sos_alerts
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id
        OR (
            trip_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.trips
                WHERE trips.id = sos_alerts.trip_id
                  AND trips.created_by = auth.uid()   -- ← was guide_id
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'authority'
        )
    );

-- UPDATE: trip guide (created_by) or authority
CREATE POLICY "Allow guide and authority to update SOS status" ON public.sos_alerts
    FOR UPDATE TO authenticated
    USING (
        (
            trip_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.trips
                WHERE trips.id = sos_alerts.trip_id
                  AND trips.created_by = auth.uid()   -- ← was guide_id
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'authority'
        )
    )
    WITH CHECK (
        user_id    = sos_alerts.user_id
        AND trip_id IS NOT DISTINCT FROM sos_alerts.trip_id
        AND lat     IS NOT DISTINCT FROM sos_alerts.lat
        AND lng     IS NOT DISTINCT FROM sos_alerts.lng
        AND created_at = sos_alerts.created_at
    );

-- ── 4. Enable Supabase Realtime for all relevant tables ──────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

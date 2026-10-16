-- ==========================================
-- SAFARSATHI STAGE 4: SOS ALERTS
-- ==========================================

-- 1. Create SOS Alerts Table
CREATE TABLE IF NOT EXISTS public.sos_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_sos_alerts_user ON public.sos_alerts (user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_trip ON public.sos_alerts (trip_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON public.sos_alerts (status);

-- 2. Enable Row Level Security
ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies

-- Authenticated users can insert their own SOS alerts
CREATE POLICY "Allow users to create own SOS alert" ON public.sos_alerts
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Alert owner, the trip's guide, or an authority can read the alert
CREATE POLICY "Allow scoped read of SOS alerts" ON public.sos_alerts
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id
        OR (
            trip_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.trips
                WHERE trips.id = sos_alerts.trip_id
                  AND trips.guide_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'authority'
        )
    );

-- Only the trip's guide or an authority can update the status field
CREATE POLICY "Allow guide and authority to update SOS status" ON public.sos_alerts
    FOR UPDATE TO authenticated
    USING (
        (
            trip_id IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM public.trips
                WHERE trips.id = sos_alerts.trip_id
                  AND trips.guide_id = auth.uid()
            )
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND profiles.role = 'authority'
        )
    )
    WITH CHECK (
        -- Prevent changing any field other than status
        user_id = sos_alerts.user_id
        AND trip_id IS NOT DISTINCT FROM sos_alerts.trip_id
        AND lat IS NOT DISTINCT FROM sos_alerts.lat
        AND lng IS NOT DISTINCT FROM sos_alerts.lng
        AND created_at = sos_alerts.created_at
    );

-- 4. Enable Supabase Realtime for sos_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

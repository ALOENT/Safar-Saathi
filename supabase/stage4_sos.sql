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

-- Authenticated users can read all SOS alerts (guides filter client-side by trip_id)
CREATE POLICY "Allow authenticated to read all SOS alerts" ON public.sos_alerts
    FOR SELECT TO authenticated USING (true);

-- Authenticated users can update status (prototype: any authenticated user can resolve)
CREATE POLICY "Allow authenticated to update SOS status" ON public.sos_alerts
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 4. Enable Supabase Realtime for sos_alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;

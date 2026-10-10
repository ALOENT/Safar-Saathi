-- ==========================================
-- SAFARSATHI STAGE 3: LIVE TRACKING LOCATIONS
-- ==========================================

-- 1. Create Locations Table
CREATE TABLE IF NOT EXISTS public.locations (
    user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on trip_id for fast realtime and select queries
CREATE INDEX IF NOT EXISTS idx_locations_trip_id ON public.locations (trip_id);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for LOCATIONS
-- Authenticated users can insert their own location row
CREATE POLICY "Users can insert their own location" ON public.locations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own location row
CREATE POLICY "Users can update their own location" ON public.locations
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Authenticated users can select all rows (prototype requirement)
CREATE POLICY "Authenticated users can select all locations" ON public.locations
    FOR SELECT TO authenticated USING (true);

-- 4. Enable Supabase Realtime for locations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;

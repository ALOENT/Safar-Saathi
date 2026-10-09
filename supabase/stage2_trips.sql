-- ==========================================
-- SAFARSATHI STAGE 2: TRIPS & TRIP_MEMBERS
-- ==========================================

-- 1. Create Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(6) UNIQUE NOT NULL,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Index on code for fast lookup when travelers enter 6-digit code
CREATE INDEX IF NOT EXISTS idx_trips_code ON public.trips (UPPER(code));

-- 2. Create Trip Members Table
CREATE TABLE IF NOT EXISTS public.trip_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT CHECK (role IN ('guide', 'traveler')) DEFAULT 'traveler',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (trip_id, user_id)
);

-- Index for querying user's active trip
CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members (user_id);
CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON public.trip_members (trip_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for TRIPS
CREATE POLICY "Allow authenticated users to read trips" ON public.trips
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to create trips" ON public.trips
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Allow creator to update trip" ON public.trips
    FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- 5. RLS Policies for TRIP_MEMBERS
CREATE POLICY "Allow authenticated users to read trip members" ON public.trip_members
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow users to join trip" ON public.trip_members
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to leave trip" ON public.trip_members
    FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Enable Supabase Realtime for trip_members
-- REQUIRED for realtime join/leave updates without manual page refresh
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trips;

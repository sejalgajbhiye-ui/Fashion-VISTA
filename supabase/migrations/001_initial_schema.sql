-- ==============================================================================
-- Fashion VISTA — Initial Schema & Row Level Security (RLS) Migration
-- Target Database: Supabase PostgreSQL
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table (Linked to Supabase Auth Users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT DEFAULT 'Style Enthusiast',
    handle TEXT DEFAULT '@fashionista',
    bio TEXT DEFAULT 'Exploring AI-curated capsules and smart digital styling.',
    avatar_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    location TEXT DEFAULT 'Mumbai, IN',
    preferred_styles TEXT[] DEFAULT ARRAY['Casual', 'Minimal'],
    preferred_colours TEXT[] DEFAULT ARRAY['Navy', 'White', 'Black'],
    preferences JSONB DEFAULT '{"occasion": "Casual", "style": "Casual", "colour": "Black", "budget": "2500"}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Wardrobe Items Table (Replaces local SQLite wardrobe_items)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wardrobe_items (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_sample BOOLEAN DEFAULT FALSE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    colour TEXT,
    style TEXT,
    season TEXT,
    brand TEXT,
    description TEXT,
    image TEXT,
    predicted_category TEXT,
    confidence REAL,
    model_used TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy queries by user
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_user_id ON public.wardrobe_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wardrobe_items_is_sample ON public.wardrobe_items(is_sample);

-- ------------------------------------------------------------------------------
-- 3. Outfit History Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.outfit_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    outfit_name TEXT NOT NULL,
    occasion TEXT,
    style TEXT,
    wardrobe_match TEXT,
    owned_count INT DEFAULT 0,
    total_count INT DEFAULT 0,
    percentage INT DEFAULT 0,
    missing_items TEXT[] DEFAULT ARRAY[]::TEXT[],
    image TEXT,
    outfit_summary TEXT,
    decision TEXT,
    date_label TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outfit_history_user_id ON public.outfit_history(user_id);

-- ------------------------------------------------------------------------------
-- 4. Automatic Profile Creation Trigger on Auth Sign-Up
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, handle, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        '@' || split_part(NEW.email, '@', 1),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 5. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wardrobe_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Wardrobe Items Policies
-- Allows users to read their own items OR starter/sample items
DROP POLICY IF EXISTS "Users can read own and sample wardrobe items" ON public.wardrobe_items;
CREATE POLICY "Users can read own and sample wardrobe items"
    ON public.wardrobe_items FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid() OR is_sample = TRUE);

DROP POLICY IF EXISTS "Authenticated users can insert wardrobe items" ON public.wardrobe_items;
CREATE POLICY "Authenticated users can insert wardrobe items"
    ON public.wardrobe_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own wardrobe items" ON public.wardrobe_items;
CREATE POLICY "Users can update own wardrobe items"
    ON public.wardrobe_items FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wardrobe items" ON public.wardrobe_items;
CREATE POLICY "Users can delete own wardrobe items"
    ON public.wardrobe_items FOR DELETE
    USING (auth.uid() = user_id);

-- Outfit History Policies
DROP POLICY IF EXISTS "Users can read own outfit history" ON public.outfit_history;
CREATE POLICY "Users can read own outfit history"
    ON public.outfit_history FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outfit history" ON public.outfit_history;
CREATE POLICY "Users can insert own outfit history"
    ON public.outfit_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outfit history" ON public.outfit_history;
CREATE POLICY "Users can delete own outfit history"
    ON public.outfit_history FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- Fashion VISTA — Migration 003: Smart Weekly Outfit Planner Schema
-- Target Database: Supabase PostgreSQL
-- Row Level Security: Strictly Authenticated User Ownership Only
-- NOTE: Local migration proposal file. Do not run on remote DB without approval.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.outfit_plans (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    planned_date DATE NOT NULL,
    occasion TEXT NOT NULL DEFAULT 'Casual',
    outfit_name TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    wardrobe_item_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    note TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'worn')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient calendar range and user queries
CREATE INDEX IF NOT EXISTS idx_outfit_plans_user_date ON public.outfit_plans(user_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_outfit_plans_status ON public.outfit_plans(status);

-- Enable Row Level Security
ALTER TABLE public.outfit_plans ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Row Level Security Policies (Strict User Ownership: auth.uid() = user_id)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own outfit plans" ON public.outfit_plans;
CREATE POLICY "Users can read own outfit plans"
    ON public.outfit_plans FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own outfit plans" ON public.outfit_plans;
CREATE POLICY "Users can insert own outfit plans"
    ON public.outfit_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own outfit plans" ON public.outfit_plans;
CREATE POLICY "Users can update own outfit plans"
    ON public.outfit_plans FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own outfit plans" ON public.outfit_plans;
CREATE POLICY "Users can delete own outfit plans"
    ON public.outfit_plans FOR DELETE
    USING (auth.uid() = user_id);

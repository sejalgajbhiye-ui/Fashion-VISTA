import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseUrl !== 'your_supabase_project_url_here' &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseAnonKey !== 'your-supabase-publishable-or-anon-key-here' &&
  supabaseAnonKey !== 'your_publishable_key'
);

if (!isSupabaseConfigured) {
  console.info(
    '[Fashion VISTA] Supabase credentials not yet configured in .env. Running in offline/guest mode with local storage and SQLite.'
  );
}

// Fallback dummy client if credentials not set yet to avoid runtime crashes
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient(
      'https://placeholder-project.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'
    );

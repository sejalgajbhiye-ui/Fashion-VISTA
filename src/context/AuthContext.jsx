import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return sessionStorage.getItem('fashion_vista_guest') === 'true';
    } catch {
      return false;
    }
  });

  const continueAsGuest = () => {
    setIsGuest(true);
    try {
      sessionStorage.setItem('fashion_vista_guest', 'true');
    } catch (e) {
      // ignore
    }
  };

  // Fetch or create profile from Supabase
  const fetchProfile = async (userId) => {
    if (!isSupabaseConfigured || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching Supabase profile:', error.message);
      }
      if (data) {
        setProfile(data);
        return data;
      }
    } catch (err) {
      console.warn('Profile fetch exception:', err);
    }
    return null;
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign up
  const signUp = async (email, password, metadata = {}) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure your .env credentials.');
    }
    const redirectUrl =
      import.meta.env.VITE_SUPABASE_REDIRECT_URL ||
      `${window.location.origin}/auth/confirm`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      // Friendly, actionable handling for Supabase rate limit errors
      if (
        error.message?.toLowerCase().includes('rate limit') ||
        error.code === 'over_email_send_rate_limit' ||
        error.status === 429
      ) {
        const rateLimitErr = new Error(
          'Email rate limit exceeded (Supabase default is 3-4 emails/hour). If you already registered with this email, please switch to Sign In.'
        );
        rateLimitErr.code = 'rate_limit_exceeded';
        throw rateLimitErr;
      }
      throw error;
    }

    // Detect duplicate user registration (Supabase returns empty identities array when user already exists)
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const duplicateErr = new Error(
        'An account with this email address already exists. Please switch to Sign In.'
      );
      duplicateErr.code = 'user_already_exists';
      throw duplicateErr;
    }

    return data;
  };

  // Sign in
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure your .env credentials.');
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data?.user) {
      await fetchProfile(data.user.id);
    }
    return data;
  };

  // Sign out
  const signOut = async () => {
    setIsGuest(false);
    try {
      sessionStorage.removeItem('fashion_vista_guest');
    } catch (e) {
      // ignore
    }
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Sign out error:', error.message);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!isSupabaseConfigured || !user) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isGuest,
        continueAsGuest,
        isAuthenticated: Boolean(user || isGuest),
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        updateProfile,
        refreshProfile: () => user && fetchProfile(user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

import React, { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Laptop,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  LogIn
} from 'lucide-react';
import { Button } from '../components/Button';

export const ConfirmEmail = () => {
  const { user, continueAsGuest } = useAuth();
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const processConfirmation = async () => {
      // 1. Inspect URL search params and hash fragments
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      // Check for errors sent by Supabase
      const error = searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');
      const errorDescription =
        searchParams.get('error_description') || hashParams.get('error_description');

      if (error || errorCode) {
        setStatus('error');
        if (errorCode === 'otp_expired' || (errorDescription && errorDescription.includes('expired'))) {
          setErrorMessage(
            'This verification link has expired. Please return to Fashion VISTA on your computer and request a new confirmation email, or try logging in if you already verified.'
          );
        } else {
          setErrorMessage(
            errorDescription || 'The verification link is invalid or has already been used.'
          );
        }
        return;
      }

      // Check for PKCE auth code
      const code = searchParams.get('code');
      if (code && isSupabaseConfigured) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          if (data?.user) {
            setUserEmail(data.user.email || '');
            setStatus('success');
            return;
          }
        } catch (err) {
          console.warn('Code exchange error:', err);
          setStatus('error');
          setErrorMessage(err.message || 'Unable to complete verification code exchange.');
          return;
        }
      }

      // Check for implicit access token in hash
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type') || searchParams.get('type');

      if (accessToken || type === 'signup' || type === 'email_confirmation') {
        setStatus('success');
        return;
      }

      // Check if user is already authenticated
      if (user) {
        setUserEmail(user.email || '');
        setStatus('success');
        return;
      }

      // If Supabase client session is active
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserEmail(session.user.email || '');
          setStatus('success');
          return;
        }
      }

      // If no tokens present but page was opened directly
      // Fallback: If redirected without error, assume verification completed by Supabase server
      if (window.location.pathname.includes('/auth/confirm')) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage('No verification tokens found. Please use the confirmation link from your email.');
      }
    };

    processConfirmation();
  }, [user]);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal-900 flex flex-col justify-between selection:bg-[#EAE0D1] selection:text-[#191919] px-4 py-8">
      {/* Brand Header */}
      <header className="max-w-md mx-auto w-full text-center mb-6">
        <div className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-charcoal-900 flex items-center justify-center text-cream-50 shadow-sm">
            <Sparkles className="w-4 h-4 text-cream-100" />
          </div>
          <div className="flex flex-col text-left">
            <span className="editorial-heading text-lg font-bold tracking-widest text-charcoal-900 uppercase">
              Fashion VISTA
            </span>
            <span className="text-[9px] uppercase tracking-widest text-taupe-600 -mt-1 font-semibold">
              AI Wardrobe & Virtual Try-On
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="max-w-md mx-auto w-full flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-xl w-full text-center space-y-6">
          
          {/* 1. Verifying State */}
          {status === 'verifying' && (
            <div className="py-8 space-y-4">
              <div className="w-14 h-14 rounded-full bg-[#FAF8F5] border border-taupe-300 mx-auto flex items-center justify-center text-charcoal-700 animate-spin">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h2 className="editorial-heading text-xl font-bold text-charcoal-900">
                Verifying Your Email...
              </h2>
              <p className="text-xs text-charcoal-500">
                Please wait while we confirm your account with Supabase.
              </p>
            </div>
          )}

          {/* 2. Success State (Mobile & Cross-Device Friendly) */}
          {status === 'success' && (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 mx-auto flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Account Activated
                </span>
                <h1 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900 leading-tight">
                  Email Verified Successfully!
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-2 leading-relaxed">
                  Your email has been verified. You can now return to Fashion VISTA and log in.
                </p>
                {userEmail && (
                  <p className="text-xs font-semibold text-charcoal-800 mt-1">
                    {userEmail}
                  </p>
                )}
              </div>

              {/* Cross-Device / Local Development Callout */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-left space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal-800">
                  <Laptop className="w-4 h-4 text-charcoal-900" />
                  <span>Next Step: Return to Your Computer</span>
                </div>
                <p className="text-xs text-charcoal-600 leading-relaxed">
                  Since Fashion VISTA is running locally on your computer, switch back to the browser on your computer to log in and access your personal digital wardrobe.
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>Your account is ready for login on your computer</span>
                </div>
              </div>

              {/* Action for devices viewing directly */}
              <div className="pt-2 space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    // Navigate to root / home
                    window.location.href = '/';
                  }}
                  iconRight={<ArrowRight className="w-4 h-4" />}
                >
                  Go to Fashion VISTA Login
                </Button>
              </div>
            </div>
          )}

          {/* 3. Error / Expired State */}
          {status === 'error' && (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 border-2 border-amber-300 mx-auto flex items-center justify-center shadow-sm">
                <AlertCircle className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
                  Verification Notice
                </span>
                <h1 className="editorial-heading text-2xl font-bold text-charcoal-900 leading-tight">
                  Link Invalid or Expired
                </h1>
                <p className="text-xs sm:text-sm text-charcoal-600 mt-2 leading-relaxed">
                  {errorMessage || 'This email confirmation link has expired or has already been used.'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-left space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-charcoal-800">
                  What should you do?
                </div>
                <ul className="text-xs text-charcoal-600 space-y-1.5 list-disc pl-4">
                  <li>If you already confirmed earlier, you can log in directly on your computer.</li>
                  <li>If your account is still unconfirmed, return to the login screen on your computer to request a fresh email.</li>
                </ul>
              </div>

              <div className="pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    window.location.href = '/';
                  }}
                  iconLeft={<LogIn className="w-4 h-4" />}
                >
                  Return to Login
                </Button>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-charcoal-400 py-4 mt-6">
        Fashion VISTA © 2026 — AI Wardrobe & Virtual Try-On Studio.
      </footer>
    </div>
  );
};

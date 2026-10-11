import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFashion } from '../context/FashionContext';
import { Button } from './Button';
import { X, Lock, Mail, User, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose }) => {
  const { signIn, signUp, isConfigured } = useAuth();
  const { showToast } = useFashion();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfigured) {
      setErrorMsg('Supabase is not configured yet in .env. Enter your Project URL & Publishable Key to connect.');
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please fill in both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password should be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        showToast('Successfully signed in!', 'success');
        onClose();
      } else {
        const metadata = { full_name: fullName.trim() || undefined };
        const data = await signUp(email, password, metadata);
        if (data.session) {
          showToast('Account created and signed in!', 'success');
          onClose();
        } else {
          setSignupSuccess(true);
          showToast('Account created! Please check your email to confirm registration.', 'info');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 border border-taupe-200 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-charcoal-400 hover:text-charcoal-700 p-1.5 rounded-full hover:bg-taupe-100 transition-colors"
          aria-label="Close auth dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-charcoal-900 mx-auto flex items-center justify-center text-cream-50 shadow-md mb-3">
            <Sparkles className="w-6 h-6 text-cream-100" />
          </div>
          <h2 className="editorial-heading text-2xl font-bold text-charcoal-900">
            {mode === 'login' ? 'Welcome Back to Fashion VISTA' : 'Create Your Style Account'}
          </h2>
          <p className="text-xs text-charcoal-500 mt-1">
            {mode === 'login'
              ? 'Sign in to access your synchronized digital wardrobe and AI capsules.'
              : 'Sign up to sync your wardrobe across all your devices with Supabase.'}
          </p>
        </div>

        {/* Configuration Notice if credentials not set yet */}
        {!isConfigured && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <span className="font-semibold block">Supabase Setup Required</span>
              Enter your <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_URL</code> and{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">VITE_SUPABASE_ANON_KEY</code> in your root <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">.env</code> file.
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0" />
              <span>{errorMsg}</span>
            </div>
            {(errorMsg.toLowerCase().includes('sign in') || errorMsg.toLowerCase().includes('rate limit')) && mode === 'signup' && (
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className="text-xs font-bold text-red-800 underline hover:text-black shrink-0 cursor-pointer self-end sm:self-auto"
              >
                Sign In →
              </button>
            )}
          </div>
        )}

        {/* Confirmation message on confirmation email */}
        {signupSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-charcoal-900">Confirmation Sent</h3>
            <p className="text-xs text-charcoal-600 max-w-sm mx-auto">
              We have sent a verification email to <span className="font-semibold">{email}</span>. Click the link in the email to activate your account.
            </p>
            <Button variant="secondary" size="sm" onClick={() => setMode('login')}>
              Return to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Patel"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-charcoal-900"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-charcoal-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-charcoal-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-charcoal-900"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full mt-2"
              disabled={isLoading}
            >
              {isLoading
                ? 'Processing...'
                : mode === 'login'
                ? 'Sign In to Fashion VISTA'
                : 'Create Account'}
            </Button>
          </form>
        )}

        {/* Toggle between login and register */}
        <div className="mt-6 pt-4 border-t border-taupe-200 text-center">
          <p className="text-xs text-charcoal-600">
            {mode === 'login' ? "Don't have an account yet?" : 'Already registered?'}
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setSignupSuccess(false);
                setMode(mode === 'login' ? 'signup' : 'login');
              }}
              className="ml-1.5 font-semibold text-charcoal-900 underline hover:text-black cursor-pointer"
            >
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

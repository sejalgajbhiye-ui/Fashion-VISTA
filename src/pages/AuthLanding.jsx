import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFashion } from '../context/FashionContext';
import { Button } from '../components/Button';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  ArrowRight,
  Shirt,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Palette,
  Camera
} from 'lucide-react';

export const AuthLanding = () => {
  const { signIn, signUp, isConfigured, continueAsGuest } = useAuth();
  const { showToast } = useFashion();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isConfigured) {
      setErrorMsg(
        'Supabase credentials are not yet entered in .env. You can click "Explore as Guest" below to preview the dashboard right now!'
      );
      return;
    }

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
        showToast('Welcome back to Fashion VISTA!', 'success');
      } else {
        const metadata = { full_name: fullName.trim() || undefined };
        const data = await signUp(email, password, metadata);
        if (data.session) {
          showToast('Account created! Welcome to your digital wardrobe.', 'success');
        } else {
          setSignupSuccess(true);
          showToast('Verification email sent! Check your inbox to confirm.', 'info');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-charcoal-900 flex flex-col justify-between selection:bg-[#EAE0D1] selection:text-[#191919]">
      {/* Top Editorial Navbar */}
      <header className="border-b border-taupe-200/80 bg-white/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-charcoal-900 flex items-center justify-center text-cream-50 shadow-sm">
              <Sparkles className="w-4 h-4 text-cream-100" />
            </div>
            <div className="flex flex-col">
              <span className="editorial-heading text-xl sm:text-2xl font-bold tracking-widest text-charcoal-900 uppercase">
                Fashion VISTA
              </span>
              <span className="text-[9px] uppercase tracking-widest text-taupe-600 -mt-1 font-semibold">
                AI Wardrobe & Virtual Try-On
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={continueAsGuest}
              className="text-xs font-semibold text-charcoal-600 hover:text-charcoal-900 hover:underline px-3 py-1.5 transition-colors cursor-pointer"
            >
              Explore Demo →
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 flex-1 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center w-full">
          
          {/* Left Column: Visual Brand Story & Capabilities */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE0D1]/50 border border-taupe-300 text-[11px] font-bold uppercase tracking-wider text-charcoal-800">
              <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
              <span>Next-Generation Digital Wardrobe</span>
            </div>

            <h1 className="editorial-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal-900 leading-[1.1] tracking-tight">
              Wear everything you own. <br className="hidden sm:inline" />
              <span className="italic font-normal text-charcoal-700">Style with artificial intelligence.</span>
            </h1>

            <p className="text-sm sm:text-base text-charcoal-600 max-w-xl leading-relaxed">
              Digitize your closet, automatically classify garment types with computer vision, compose balanced color harmonies, and preview photorealistic virtual try-ons.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-white border border-taupe-200/80 shadow-subtle flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center justify-center shrink-0">
                  <Shirt className="w-4 h-4 text-charcoal-800" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    AI Garment Classifier
                  </h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5 leading-normal">
                    Instant clothing category and color identification using FashionCNN.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-taupe-200/80 shadow-subtle flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4 text-charcoal-800" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    Color Harmony Engine
                  </h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5 leading-normal">
                    Curated color palettes and styling directives calibrated to your occasion.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-taupe-200/80 shadow-subtle flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center justify-center shrink-0">
                  <Camera className="w-4 h-4 text-charcoal-800" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    Virtual Try-On
                  </h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5 leading-normal">
                    Test curated outfits directly against your photo before wearing.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-taupe-200/80 shadow-subtle flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-charcoal-800" />
                </div>
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal-900">
                    Supabase Cloud Sync
                  </h2>
                  <p className="text-[11px] text-charcoal-500 mt-0.5 leading-normal">
                    Secure private encryption and synchronized cross-device wardrobe vault.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login / Signup Form Card */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-taupe-300 shadow-xl relative overflow-hidden">
              
              {/* Card Header & Tab Switcher */}
              <div className="space-y-4 text-center pb-4 border-b border-taupe-200">
                <div className="w-12 h-12 rounded-2xl bg-charcoal-900 mx-auto flex items-center justify-center text-cream-50 shadow-md">
                  <Sparkles className="w-6 h-6 text-cream-100" />
                </div>

                <div>
                  <h2 className="editorial-heading text-2xl font-bold text-charcoal-900">
                    {mode === 'login' ? 'Sign In to Fashion VISTA' : 'Create Your Style Account'}
                  </h2>
                  <p className="text-xs text-charcoal-500 mt-1">
                    {mode === 'login'
                      ? 'Access your synchronized digital wardrobe and AI capsules.'
                      : 'Create your private cloud vault for wardrobe curations.'}
                  </p>
                </div>

                {/* Tab Pill */}
                <div className="flex bg-[#FAF8F5] p-1 rounded-xl border border-taupe-200">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      mode === 'login'
                        ? 'bg-white text-charcoal-900 shadow-sm'
                        : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup');
                      setErrorMsg('');
                    }}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      mode === 'signup'
                        ? 'bg-white text-charcoal-900 shadow-sm'
                        : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Informational Banner if Supabase .env is pending */}
              {!isConfigured && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-left text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Supabase credentials pending in .env</span>
                    Enter your Project URL and Publishable Key to connect cloud login, or use guest demo mode below.
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {errorMsg && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left">
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
                      Switch to Sign In →
                    </button>
                  )}
                </div>
              )}

              {/* Confirmation Email Notice */}
              {signupSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-charcoal-900">Verification Sent</h3>
                  <p className="text-xs text-charcoal-600">
                    A confirmation link was sent to <strong className="text-charcoal-900">{email}</strong>. Once confirmed, you can log in.
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => setMode('login')}>
                    Go to Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
                          placeholder="Maya Patel"
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
                        placeholder="fashionista@example.com"
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
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-charcoal-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-charcoal-400 hover:text-charcoal-700"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
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
                      ? 'Authenticating...'
                      : mode === 'login'
                      ? 'Enter Digital Wardrobe'
                      : 'Create My Studio'}
                  </Button>
                </form>
              )}

              {/* Alternative Action: Continue as Guest */}
              <div className="mt-6 pt-5 border-t border-taupe-200 text-center space-y-2">
                <p className="text-xs text-charcoal-500">Want to test the platform first?</p>
                <button
                  type="button"
                  onClick={continueAsGuest}
                  className="w-full py-2.5 px-4 rounded-xl border border-taupe-300 bg-white hover:bg-taupe-100/50 text-xs font-semibold text-charcoal-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Explore Demo Dashboard as Guest</span>
                  <ArrowRight className="w-3.5 h-3.5 text-charcoal-600" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-taupe-200/80 bg-white/40 text-center text-xs text-charcoal-500">
        Fashion VISTA © 2026 — AI Wardrobe & Virtual Try-On Studio.
      </footer>
    </div>
  );
};

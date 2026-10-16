import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFashion } from '../context/FashionContext';
import { Button } from './Button';
import { X, Lock, Mail, User, Sparkles, AlertCircle, CheckCircle2, Camera } from 'lucide-react';

export const AuthModal = ({ isOpen, onClose }) => {
  const { signIn, signUp, isConfigured } = useAuth();
  const { showToast, setUserPhoto } = useFashion();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  // User portrait image state for account creation (.jpg / .png)
  const [userImagePreview, setUserImagePreview] = useState(null);
  const [userImageFileName, setUserImageFileName] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = /\.(jpe?g|png)$/i;
    const validMimes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validMimes.includes(file.type) && !validExtensions.test(file.name)) {
      setErrorMsg('Please upload a valid .jpg or .png image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 10MB limit.');
      return;
    }

    setUserImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      setUserImagePreview(dataUrl);
      if (dataUrl) {
        setUserPhoto(dataUrl);
        try {
          localStorage.setItem('fashion_vista_user_photo', dataUrl);
        } catch (storageErr) {
          console.warn('Storage notice:', storageErr);
        }
      }
      setErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setUserImagePreview(null);
    setUserImageFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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
        const photoData = userImagePreview;
        if (photoData) {
          setUserPhoto(photoData);
          try {
            localStorage.setItem('fashion_vista_user_photo', photoData);
          } catch (storageErr) {
            console.warn('Storage notice:', storageErr);
          }
        }
        const metadata = {
          full_name: fullName.trim() || undefined,
          user_photo: photoData || undefined,
          avatar_url: photoData || undefined
        };
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

            {mode === 'signup' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700">
                    Your Photo (.jpg, .png)
                  </label>
                  <span className="text-[10px] text-charcoal-500 font-semibold uppercase tracking-wider bg-taupe-100 px-2 py-0.5 rounded">
                    Virtual Try-On
                  </span>
                </div>

                {userImagePreview ? (
                  <div className="p-3 bg-[#FAF8F5] border border-taupe-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl overflow-hidden border border-taupe-300 shrink-0 bg-white shadow-xs">
                        <img
                          src={userImagePreview}
                          alt="Uploaded Portrait"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-charcoal-900 truncate block">
                          {userImageFileName || 'User Portrait'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          Ready for Try-On
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 text-[11px] font-semibold text-charcoal-700 hover:text-black bg-white border border-taupe-300 rounded-lg shadow-2xs hover:bg-taupe-50 transition-colors"
                      >
                        Change
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="p-1 text-charcoal-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-taupe-300 hover:border-charcoal-800 rounded-2xl p-3.5 text-center cursor-pointer bg-[#FAF8F5]/70 hover:bg-[#FAF8F5] transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-white border border-taupe-200 mx-auto flex items-center justify-center text-charcoal-600 group-hover:scale-105 group-hover:text-charcoal-900 transition-all shadow-2xs mb-1.5">
                      <Camera className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-charcoal-900">
                      Upload photo <span className="font-normal text-charcoal-500">(.jpg / .png)</span>
                    </p>
                    <p className="text-[10px] text-charcoal-500 mt-0.5">
                      Used to render how curated looks fit on your body
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            )}

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

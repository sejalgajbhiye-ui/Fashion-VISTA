import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Shirt,
  Sparkles,
  Sliders,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  LogIn,
  LogOut,
  Cloud
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from '../components/AuthModal';

export const Profile = () => {
  const navigate = useNavigate();
  const { wardrobe, userProfile, wardrobeStats, preferences, setPreferences, history, currentRecommendation, showToast } = useFashion();
  const { user, profile, signOut, updateProfile, isConfigured } = useAuth();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const displayName = profile?.name || user?.user_metadata?.full_name || userProfile.name;
  const userHandle = profile?.handle || (user?.email ? `@${user.email.split('@')[0]}` : userProfile.handle);
  const userBio = profile?.bio || userProfile.bio;
  const userAvatar = profile?.avatar_url || userProfile.avatar;
  const userLocation = profile?.location || userProfile.location;

  // Dynamic capsule tags derived strictly from actual wardrobe pieces + preferred style
  const wardrobeCategories = Array.from(new Set(wardrobe.map(i => (i.category || '').toUpperCase()).filter(Boolean)));
  const wardrobeColours = Array.from(new Set(wardrobe.map(i => (i.colour || i.color || '').toUpperCase()).filter(Boolean)));
  const preferredStyle = preferences?.style ? [preferences.style.toUpperCase()] : ['CASUAL'];
  const capsuleTags = Array.from(new Set([...preferredStyle, ...wardrobeCategories, ...wardrobeColours]));

  // Dynamic metrics: piece utilization & impulse savings
  const activelyWornCount = wardrobe.filter(w => {
    return (currentRecommendation?.items || []).some(
      i => i.inWardrobe && (i.matchedWardrobeId === w.id || i.name?.toLowerCase().includes(w.name?.toLowerCase()))
    );
  }).length;

  const closetUtilization = wardrobe.length > 0
    ? Math.round((activelyWornCount / wardrobe.length) * 100)
    : 0;

  const impulseSavings = activelyWornCount * 2200;

  const handleSavePreferences = async (e) => {
    e.preventDefault();
    setPreferences(localPrefs);
    if (user && isConfigured) {
      try {
        await updateProfile({ preferences: localPrefs });
        showToast("Styling preferences synced with Supabase cloud!", "success");
        return;
      } catch (err) {
        console.warn("Could not sync preferences to Supabase:", err);
      }
    }
    showToast("Styling preferences updated!", "success");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-taupe-200 shadow-card flex flex-col md:flex-row items-center md:items-start gap-8">
        
        {/* Avatar */}
        <div className="relative">
          <img
            src={userAvatar}
            alt={displayName}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-[#FAF8F5] shadow-md"
          />
          <span className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white ${user ? 'bg-emerald-500' : 'bg-taupe-400'}`} title={user ? "Supabase Cloud Account" : "Local Guest"}>
            <CheckCircle2 className="w-4 h-4" />
          </span>
        </div>

        {/* User Info */}
        <div className="flex-1 text-center md:text-left space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 justify-center md:justify-start">
                <h1 className="editorial-heading text-3xl sm:text-4xl font-bold text-charcoal-900">
                  {displayName}
                </h1>
                {user ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Cloud className="w-3 h-3" /> Supabase
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-taupe-100 text-taupe-700 border border-taupe-200">
                    Guest Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-500 font-medium">
                {userHandle} • {userLocation}
                {user?.email && <span className="ml-2 text-charcoal-400">({user.email})</span>}
              </p>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/wardrobe')}
                iconLeft={<Shirt className="w-3.5 h-3.5" />}
              >
                Manage Wardrobe
              </Button>

              {user ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  iconLeft={<LogOut className="w-3.5 h-3.5" />}
                >
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setAuthModalOpen(true)}
                  iconLeft={<LogIn className="w-3.5 h-3.5" />}
                >
                  Connect Supabase
                </Button>
              )}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-charcoal-600 max-w-xl leading-relaxed">
            {userBio}
          </p>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
            <span className="text-[11px] text-charcoal-400 uppercase tracking-wider font-semibold mr-1">
              Capsule Tags:
            </span>
            {capsuleTags.map((tag, idx) => (
              <Badge key={idx} variant="tag" size="xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

      </div>

      {/* METRICS & CAPSULE STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-taupe-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1 flex items-center justify-between">
            <span>Wardrobe Count</span>
            <Shirt className="w-4 h-4 text-taupe-500" />
          </div>
          <div className="editorial-heading text-3xl sm:text-4xl font-bold text-charcoal-900">
            {wardrobeStats.total}
          </div>
          <p className="text-xs text-charcoal-500 mt-1">Cataloged Garments</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-taupe-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1 flex items-center justify-between">
            <span>Saved Outfits</span>
            <Sparkles className="w-4 h-4 text-taupe-500" />
          </div>
          <div className="editorial-heading text-3xl sm:text-4xl font-bold text-charcoal-900">
            {history.length}
          </div>
          <p className="text-xs text-charcoal-500 mt-1">Curations Archived</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-taupe-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1 flex items-center justify-between">
            <span>Closet Utilization</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="editorial-heading text-3xl sm:text-4xl font-bold text-emerald-700">
            {closetUtilization}%
          </div>
          <p className="text-xs text-charcoal-500 mt-1">Pieces Actively Worn</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-taupe-200 shadow-subtle">
          <div className="text-xs font-bold uppercase tracking-wider text-charcoal-500 mb-1 flex items-center justify-between">
            <span>Impulse Savings</span>
            <ShieldCheck className="w-4 h-4 text-taupe-500" />
          </div>
          <div className="editorial-heading text-3xl sm:text-4xl font-bold text-charcoal-900">
            {impulseSavings > 0 ? `₹${impulseSavings.toLocaleString('en-IN')}` : '₹0'}
          </div>
          <p className="text-xs text-charcoal-500 mt-1">Saved via Re-wearing</p>
        </div>
      </div>

      {/* PREFERENCES SETTINGS FORM */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-taupe-200 shadow-card space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-taupe-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
              Style Tuning
            </span>
            <h3 className="editorial-heading text-2xl font-bold text-charcoal-900 mt-0.5">
              Personal Style & Sizing Preferences
            </h3>
            <p className="text-xs text-charcoal-500 mt-1">
              These baseline defaults initialize your AI Stylist recommendations.
            </p>
          </div>
          <Sliders className="w-5 h-5 text-charcoal-600" />
        </div>

        <form onSubmit={handleSavePreferences} className="space-y-6 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Default Occasion
              </label>
              <select
                value={localPrefs.occasion}
                onChange={(e) => setLocalPrefs({ ...localPrefs, occasion: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              >
                <option value="College">College</option>
                <option value="Casual">Casual</option>
                <option value="Office">Office</option>
                <option value="Party">Party</option>
                <option value="Wedding">Wedding</option>
                <option value="Traditional">Traditional</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Default Aesthetic Style
              </label>
              <select
                value={localPrefs.style}
                onChange={(e) => setLocalPrefs({ ...localPrefs, style: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              >
                <option value="Casual">Casual</option>
                <option value="Formal">Formal</option>
                <option value="Traditional">Traditional</option>
                <option value="Western">Western</option>
                <option value="Streetwear">Streetwear</option>
                <option value="Minimal">Minimal</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Primary Colour
              </label>
              <input
                type="text"
                value={localPrefs.colour}
                onChange={(e) => setLocalPrefs({ ...localPrefs, colour: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                Typical Purchase Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-charcoal-500 font-bold">₹</span>
                <input
                  type="number"
                  value={localPrefs.budget}
                  onChange={(e) => setLocalPrefs({ ...localPrefs, budget: e.target.value })}
                  className="w-full pl-7 pr-3 py-2.5 text-xs text-charcoal-900 bg-[#FAF8F5] border border-taupe-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-charcoal-900"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
            >
              Save Preferences
            </Button>
          </div>
        </form>
      </div>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </div>
  );
};

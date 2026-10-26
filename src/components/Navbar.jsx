import React, { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Sparkles, Menu, X, User, Shirt, ShoppingBag, Eye, History, HelpCircle, LogIn, LogOut, Calendar } from 'lucide-react';
import { useFashion } from '../context/FashionContext';
import { useAuth } from '../context/AuthContext';
import { AuthModal } from './AuthModal';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { userProfile, wardrobeStats } = useFashion();
  const { user, profile, signOut, isConfigured } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || userProfile.name;
  const avatarUrl = profile?.avatar_url || userProfile.avatar;

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/wardrobe', label: 'My Wardrobe' },
    { to: '/stylist', label: 'AI Stylist' },
    { to: '/planner', label: 'Weekly Planner' },
    { to: '/history', label: 'History' },
  ];

  const linkClass = ({ isActive }) =>
    `relative px-3.5 py-1.5 text-sm font-medium transition-all duration-200 tracking-wide ${
      isActive
        ? 'text-charcoal-900 font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-charcoal-900'
        : 'text-charcoal-500 hover:text-charcoal-900 hover:bg-taupe-100/50 rounded-md'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#FAF8F5]/90 backdrop-blur-md border-b border-taupe-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center text-cream-50 transition-transform duration-300 group-hover:scale-105">
                <Sparkles className="w-4 h-4 text-cream-100" />
              </div>
              <div className="flex flex-col">
                <span className="editorial-heading text-xl font-bold tracking-widest text-charcoal-900 uppercase">
                  Fashion VISTA
                </span>
                <span className="text-[9px] uppercase tracking-widest text-taupe-600 -mt-1 font-semibold">
                  AI Wardrobe & Occasion Stylist
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1.5 lg:gap-3">
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClass}>
                  {link.label}
                </NavLink>
              ))}
            </nav>

            {/* Right Actions */}
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-2">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-taupe-300 hover:border-charcoal-400 bg-white/70 transition-all hover:bg-white"
                  >
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-7 h-7 rounded-full object-cover border border-taupe-200"
                    />
                    <span className="text-xs font-medium text-charcoal-800 pr-1">
                      {displayName.split(' ')[0]}
                    </span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    title="Sign Out"
                    className="p-2 rounded-full text-charcoal-500 hover:text-charcoal-900 hover:bg-taupe-100 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal-900 text-cream-50 hover:bg-black text-xs font-medium transition-all shadow-sm cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {user ? (
                <Link
                  to="/profile"
                  className="p-2 rounded-full border border-taupe-300 text-charcoal-700 bg-white"
                >
                  <User className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className="p-2 rounded-full border border-taupe-300 text-charcoal-700 bg-white"
                >
                  <LogIn className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-charcoal-800 hover:bg-taupe-200 transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-taupe-300 bg-[#FAF8F5] px-4 pt-2 pb-6 space-y-2 shadow-lg">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-2.5 rounded-lg text-base font-medium transition-colors ${
                    isActive
                      ? 'bg-charcoal-900 text-cream-50 font-semibold'
                      : 'text-charcoal-700 hover:bg-taupe-200'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-taupe-200 flex items-center justify-between px-2">
              <div className="text-xs text-charcoal-500">
                Wardrobe: <span className="font-semibold text-charcoal-900">{wardrobeStats.total} Items</span>
              </div>
              <div className="text-xs text-charcoal-500">
                {isConfigured ? 'Supabase Connected' : 'Guest / Local Storage'}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
};

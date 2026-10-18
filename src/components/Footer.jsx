import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Cpu, Heart } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="bg-[#F5F1EB] border-t border-taupe-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-charcoal-900 flex items-center justify-center text-cream-50">
                <Sparkles className="w-4 h-4 text-cream-100" />
              </div>
              <span className="editorial-heading text-xl font-bold tracking-widest text-charcoal-900 uppercase">
                Fashion VISTA
              </span>
            </div>
            <p className="editorial-sub text-lg italic text-charcoal-700">
              "Try what you own. Shop only what you need."
            </p>
            <p className="text-xs text-charcoal-500 max-w-md leading-relaxed">
              AI-Based Personalized Fashion Decision Assistant with Virtual Wardrobe and 360° Occasion Stylist. Designed to curb hyper-consumerism by analyzing what you already own before recommending intentional additions.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-taupe-300 text-[11px] font-semibold text-charcoal-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Frontend Standalone Mode (Mock Data Active)
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-bold tracking-widest text-charcoal-900">
              Workflow Navigation
            </h5>
            <ul className="space-y-2 text-xs text-charcoal-600 font-medium">
              <li><Link to="/" className="hover:text-black transition-colors">Home Landing</Link></li>
              <li><Link to="/stylist" className="hover:text-black transition-colors">AI Stylist Multi-Step</Link></li>
              <li><Link to="/recommendations" className="hover:text-black transition-colors">360° Occasion Stylist</Link></li>
              <li><Link to="/wardrobe" className="hover:text-black transition-colors">Virtual Wardrobe</Link></li>
              <li><Link to="/try-existing" className="hover:text-black transition-colors">Try Existing Pieces</Link></li>
              <li><Link to="/shop-new" className="hover:text-black transition-colors">Shop Missing Item</Link></li>
            </ul>
          </div>

          {/* Core Journey */}
          <div className="space-y-3">
            <h5 className="text-xs uppercase font-bold tracking-widest text-charcoal-900">
              Occasion Studio Suite
            </h5>
            <ul className="space-y-2 text-xs text-charcoal-600 font-medium">
              <li><Link to="/recommendations" className="hover:text-black transition-colors">360° Occasion Studio</Link></li>
              <li><Link to="/recommendations" className="hover:text-black transition-colors">5-Retailer Price Compare</Link></li>
              <li><Link to="/analysis" className="hover:text-black transition-colors">Outfit Analysis</Link></li>
              <li><Link to="/history" className="hover:text-black transition-colors">Style History</Link></li>
              <li><Link to="/profile" className="hover:text-black transition-colors">User Profile & Capsule</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-12 mt-12 border-t border-taupe-300/60 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-500 gap-4">
          <p>© 2026 Fashion VISTA. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>API Docs (Flask Backend Ready)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

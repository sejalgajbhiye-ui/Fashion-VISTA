import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Shirt, Eye, CheckCircle2, ShoppingBag, Layers, ArrowUpRight } from 'lucide-react';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 md:space-y-32 pb-16">
      
      {/* HERO SECTION */}
      <section className="relative pt-8 md:pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-8 z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-taupe-300 shadow-subtle">
              <Sparkles className="w-3.5 h-3.5 text-charcoal-800" />
              <span className="text-[11px] font-bold tracking-widest uppercase text-charcoal-700">
                AI-Powered Personal Stylist
              </span>
            </div>

            <h1 className="editorial-heading text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-semibold text-charcoal-900 leading-[1.08] tracking-tight">
              Style smarter.<br />
              <span className="italic font-normal">Wear what you own.</span>
            </h1>

            <p className="text-base sm:text-lg text-charcoal-600 max-w-xl leading-relaxed font-normal">
              Fashion VISTA recommends complete outfits based on your style, occasion and wardrobe — helping you decide what to wear before deciding what to buy.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => navigate('/stylist')}
                iconRight={<ArrowRight className="w-4 h-4" />}
                className="shadow-card"
              >
                Build My Outfit →
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/wardrobe')}
              >
                Explore My Wardrobe
              </Button>
            </div>

            <div className="pt-6 border-t border-taupe-200/80 flex items-center gap-8 text-xs text-charcoal-500 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Zero spontaneous purchases</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Realistic virtual preview</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual with Floating UI Cards */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              
              {/* Main Fashion Hero Image */}
              <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-taupe-100">
                <img
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=85"
                  alt="Fashion VISTA editorial model outfit"
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 via-transparent to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6 text-white">
                  <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded">
                    Curated Capsule
                  </span>
                  <p className="editorial-heading text-xl sm:text-2xl font-semibold mt-2">
                    Effortless High-Rotation Styling
                  </p>
                </div>
              </div>

              {/* Floating UI Card 1: WARDROBE MATCH */}
              <div className="absolute -top-6 -left-4 sm:-left-8 bg-white/95 backdrop-blur-md border border-taupe-200 rounded-2xl p-4 sm:p-5 shadow-card max-w-[210px] sm:max-w-[240px] transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                    Wardrobe Match
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                </div>
                <div className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900 mb-1">
                  3 / 4 ITEMS
                </div>
                <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block">
                  ✓ Already in your wardrobe
                </p>
              </div>

              {/* Floating UI Card 2: AI RECOMMENDATION */}
              <div className="absolute -bottom-6 -right-4 sm:-right-8 bg-white/95 backdrop-blur-md border border-taupe-200 rounded-2xl p-4 sm:p-5 shadow-card max-w-[220px] sm:max-w-[260px] transform hover:scale-105 transition-transform duration-300">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                    AI Recommendation
                  </span>
                </div>
                <div className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                  "Urban Casual"
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-3 h-3 rounded-full bg-charcoal-900 border border-white" />
                  <span className="w-3 h-3 rounded-full bg-[#2B4C7E] border border-white" />
                  <span className="text-xs text-charcoal-600 font-medium">Black + Blue</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs uppercase font-bold tracking-widest text-charcoal-500">
            Intelligent Process
          </span>
          <h2 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900 mt-2">
            How It Works
          </h2>
          <p className="text-sm sm:text-base text-charcoal-500 mt-3">
            A conscious 4-step framework that prioritizes what sits in your closet.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="editorial-heading text-3xl font-light text-taupe-400">01</span>
                <span className="w-8 h-8 rounded-full bg-taupe-100 flex items-center justify-center text-charcoal-800">
                  <Sparkles className="w-4 h-4" />
                </span>
              </div>
              <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                Tell us your style
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                Choose your upcoming occasion, aesthetic style, seasonal temperature, and budget preference in seconds.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-taupe-100 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
              Step 01 / Input
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="editorial-heading text-3xl font-light text-taupe-400">02</span>
                <span className="w-8 h-8 rounded-full bg-taupe-100 flex items-center justify-center text-charcoal-800">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                Get your outfit
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                Receive an AI-curated complete look harmonized in silhouette, color balance, and stylistic appropriateness.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-taupe-100 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
              Step 02 / Curation
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col justify-between border-charcoal-900 shadow-subtle">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="editorial-heading text-3xl font-light text-charcoal-900">03</span>
                <span className="w-8 h-8 rounded-full bg-charcoal-900 text-cream-50 flex items-center justify-center">
                  <Shirt className="w-4 h-4" />
                </span>
              </div>
              <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                Check your wardrobe
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                The core differentiator: we check what you already own first. If an item is missing, you upload a product screenshot.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-taupe-100 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Step 03 / Core Differentiator
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="editorial-heading text-3xl font-light text-taupe-400">04</span>
                <span className="w-8 h-8 rounded-full bg-taupe-100 flex items-center justify-center text-charcoal-800">
                  <Eye className="w-4 h-4" />
                </span>
              </div>
              <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                Try it virtually
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                See yourself in the outfit with before-and-after photo visualization and comprehensive compatibility analysis.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-taupe-100 text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider">
              Step 04 / Virtual Preview
            </div>
          </div>

        </div>
      </section>

      {/* LARGE USP SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#1A1A1A] via-[#242424] to-[#1A1A1A] text-cream-50 rounded-3xl p-8 sm:p-14 lg:p-18 relative overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#4A3B32]/30 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-3xl space-y-6 relative z-10">
            <span className="text-xs uppercase font-bold tracking-widest text-taupe-300 bg-white/10 px-3 py-1 rounded-full">
              The Fashion VISTA Philosophy
            </span>

            <h2 className="editorial-heading text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal leading-tight">
              "Your wardrobe <span className="italic font-light text-taupe-200">comes first."</span>
            </h2>

            <p className="text-base sm:text-lg text-taupe-200 leading-relaxed font-light">
              Fashion VISTA checks your existing wardrobe before suggesting new purchases. By matching outfit components against your registered closet pieces, you minimize wasteful spending and rediscover forgotten favorites.
            </p>

            <div className="pt-4 flex flex-wrap gap-4">
              <Button
                variant="white"
                size="md"
                onClick={() => navigate('/wardrobe')}
              >
                Inspect Virtual Wardrobe
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => navigate('/stylist')}
                className="text-cream-100 border-taupe-400 hover:bg-white/10"
              >
                Start Styling Session →
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* THREE FEATURE CARDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs uppercase font-bold tracking-widest text-charcoal-500">
            Engineered Capabilities
          </span>
          <h2 className="editorial-heading text-3xl sm:text-4xl font-semibold text-charcoal-900 mt-2">
            The Three Pillars
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col">
            <div className="aspect-[4/3] bg-taupe-100 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=700&q=80"
                alt="AI Outfit Recommendations"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                  AI Outfit Recommendations
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                  Tailored styling rules matching your specific event type, color palette, personal aesthetic, and seasonal climate conditions.
                </p>
              </div>
              <div className="pt-6">
                <Link to="/recommendations" className="text-xs font-semibold text-charcoal-900 inline-flex items-center gap-1.5 hover:underline">
                  View Latest Recommendation <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col">
            <div className="aspect-[4/3] bg-taupe-100 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=700&q=80"
                alt="Virtual Wardrobe"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                  Virtual Wardrobe
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                  Digitize your closet with categories, color taxonomy, and style labels. Track rotation metrics and make informed closet additions.
                </p>
              </div>
              <div className="pt-6">
                <Link to="/wardrobe" className="text-xs font-semibold text-charcoal-900 inline-flex items-center gap-1.5 hover:underline">
                  Manage Wardrobe Collection <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-2xl overflow-hidden border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col">
            <div className="aspect-[4/3] bg-taupe-100 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=700&q=80"
                alt="360° Occasion Stylist"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
            <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-2">
                  360° Occasion Stylist
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-500 leading-relaxed">
                  5-slot ensemble blueprints (Dress, Jewellery, Hairstyle, Footwear, Handbag) with comparative price links across Myntra, Amazon, Meesho, Flipkart, and Ajio.
                </p>
              </div>
              <div className="pt-6">
                <Link to="/recommendations" className="text-xs font-semibold text-charcoal-900 inline-flex items-center gap-1.5 hover:underline">
                  Enter Occasion Studio <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-[#FAF6F0] border border-taupe-300 rounded-3xl p-10 sm:p-16 space-y-6">
          <span className="text-xs uppercase font-bold tracking-widest text-charcoal-500">
            Start Curation
          </span>
          <h2 className="editorial-heading text-3xl sm:text-5xl font-semibold text-charcoal-900 max-w-xl mx-auto">
            Ready to unlock the outfits already in your closet?
          </h2>
          <p className="text-sm sm:text-base text-charcoal-600 max-w-md mx-auto">
            Take the 6-step styling questionnaire and see what you own in a completely new light.
          </p>
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/stylist')}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Find your next outfit →
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
};

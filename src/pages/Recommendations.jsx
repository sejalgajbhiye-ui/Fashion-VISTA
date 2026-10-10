import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { ClothingCard } from '../components/ClothingCard';
import { WardrobeMatch } from '../components/WardrobeMatch';
import { RecommendationReason } from '../components/RecommendationReason';
import { OutfitCard } from '../components/OutfitCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Sparkles, Shirt, ShoppingBag, ArrowRight, RefreshCw, Layers, Eye, LayoutGrid } from 'lucide-react';

export const Recommendations = () => {
  const navigate = useNavigate();
  const { currentRecommendation, applyAlternative, preferences } = useFashion();

  const [activeVisualMode, setActiveVisualMode] = useState('model'); // 'model' | 'canvas'

  const {
    name,
    subtitle,
    heroImage,
    composed_look_image,
    items = [],
    wardrobeMatch,
    reasons = [],
    alternatives = [],
    missingItem
  } = currentRecommendation;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      
      {/* Page Header & Preferences Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-taupe-300 text-[11px] font-bold uppercase tracking-widest text-charcoal-700 mb-3 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
            Curated For You
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            Your AI-curated outfit
          </h1>
          <p className="text-sm sm:text-base text-charcoal-500 mt-2">
            Harmonized across silhouette balance, personal style rules, and wardrobe inventory.
          </p>
        </div>

        {/* Preference Tags Summary */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="tag" size="md">
            {preferences.occasion || "College"}
          </Badge>
          <Badge variant="tag" size="md">
            {preferences.style || "Casual"}
          </Badge>
          <Badge variant="tag" size="md">
            {preferences.colour || "Black"}
          </Badge>
          <Badge variant="tag" size="md">
            {preferences.season || "Summer"}
          </Badge>
          <button
            onClick={() => navigate('/stylist')}
            className="text-xs font-semibold text-charcoal-800 hover:text-black underline ml-2 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Re-tune
          </button>
        </div>
      </div>

      {/* MAIN RECOMMENDATION SHOWCASE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Large Editorial Fashion Hero Image with Mode Switcher */}
        <div className="lg:col-span-5 relative space-y-3">
          <div className="relative aspect-[3/4] sm:aspect-[4/5] rounded-3xl overflow-hidden shadow-card border border-taupe-200 bg-taupe-100">
            {/* Visual Mode Segmented Switcher */}
            {composed_look_image && (
              <div className="absolute top-4 right-4 z-20 flex items-center bg-white/95 backdrop-blur-md rounded-xl p-1 border border-taupe-300 shadow-md text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveVisualMode('model')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeVisualMode === 'model'
                      ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                      : 'text-charcoal-600 hover:text-black'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Model Look</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVisualMode('canvas')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                    activeVisualMode === 'canvas'
                      ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                      : 'text-charcoal-600 hover:text-black'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Flat-Lay Canvas</span>
                </button>
              </div>
            )}

            <img
              src={activeVisualMode === 'canvas' && composed_look_image ? composed_look_image : heroImage}
              alt={name}
              className={`w-full h-full ${activeVisualMode === 'canvas' ? 'object-contain bg-[#FCFAF6]' : 'object-cover object-top'} transition-all duration-300`}
            />

            {activeVisualMode === 'model' && (
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/80 via-transparent to-transparent pointer-events-none" />
            )}

            {activeVisualMode === 'model' && (
              <div className="absolute bottom-6 left-6 right-6 text-white space-y-1 pointer-events-none">
                <span className="text-[10px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-2.5 py-1 rounded">
                  AI Blueprint
                </span>
                <h2 className="editorial-heading text-2xl sm:text-3xl font-bold">
                  {name}
                </h2>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-taupe-200 font-light line-clamp-2">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Complete Outfit Breakdown Cards */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-charcoal-800" />
              <h3 className="editorial-heading text-lg font-bold uppercase tracking-wider text-charcoal-900">
                Complete Outfit Ensembles
              </h3>
            </div>
            <span className="text-xs font-medium text-charcoal-500">
              {items.length} Essential Pieces
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
            {items.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                showStatus={true}
              />
            ))}
          </div>
        </div>

      </section>

      {/* CORE USP SECTION: WARDROBE MATCH */}
      <section>
        <WardrobeMatch
          ownedCount={wardrobeMatch?.ownedCount ?? 3}
          totalCount={wardrobeMatch?.totalCount ?? 4}
          percentage={wardrobeMatch?.percentage ?? 75}
          statusText={wardrobeMatch?.statusText ?? "You're almost ready."}
          subtext={wardrobeMatch?.subtext ?? "Only 1 item may need to be purchased."}
          items={items}
        />
      </section>

      {/* WHY THIS OUTFIT? REASONS CARD */}
      <section>
        <RecommendationReason
          reasons={reasons}
          title="WHY THIS OUTFIT?"
          subtitle="Intentional curation calibrated to eliminate unnecessary wardrobe clutter"
        />
      </section>

      {/* MAIN ACTIONS (Prominent Call to Action Buttons) */}
      <section className="bg-white rounded-3xl p-8 sm:p-10 border border-taupe-200 shadow-card text-center space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-500">
            Next Action Path
          </span>
          <h3 className="editorial-heading text-2xl sm:text-3xl font-semibold text-charcoal-900 mt-1">
            Choose your next styling step
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-500 max-w-lg mx-auto mt-2">
            Build with the pieces you already own, or upload the missing piece to preview the complete ensemble virtually.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 max-w-xl mx-auto">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/try-existing')}
            className="w-full sm:w-auto"
            iconLeft={<Shirt className="w-4 h-4" />}
          >
            TRY WHAT I OWN
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => navigate('/shop-new')}
            className="w-full sm:w-auto"
            iconLeft={<ShoppingBag className="w-4 h-4" />}
          >
            SHOP THE MISSING ITEM
          </Button>
        </div>

        <p className="text-[11px] text-taupe-500 font-medium">
          Step 03 in the Fashion VISTA Conscious Styling Protocol
        </p>
      </section>

      {/* ALTERNATIVE OUTFITS */}
      {alternatives && alternatives.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-500">
                Alternative Combinations
              </span>
              <h3 className="editorial-heading text-2xl sm:text-3xl font-semibold text-charcoal-900 mt-1">
                Explore Alternatives
              </h3>
            </div>
            <span className="text-xs text-charcoal-500">
              3 curated variants
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {alternatives.map((alt) => (
              <OutfitCard
                key={alt.id}
                outfit={alt}
                onView={(selectedAlt) => {
                  applyAlternative(selectedAlt);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                actionText="View Outfit →"
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

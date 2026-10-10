import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { WardrobeMatch } from '../components/WardrobeMatch';
import { RecommendationReason } from '../components/RecommendationReason';
import { OutfitCard } from '../components/OutfitCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Sparkles,
  Shirt,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertCircle,
  Check,
  Compass
} from 'lucide-react';

export const Recommendations = () => {
  const navigate = useNavigate();
  const { currentRecommendation, applyAlternative, preferences } = useFashion();

  const {
    name,
    subtitle,
    items = [],
    reasons = [],
    alternatives = []
  } = currentRecommendation;

  // Normalize items to ensure consistent ownership flags
  const normalizedItems = items.map(item => {
    const isOwned = item.inWardrobe ?? item.owned ?? false;
    return {
      ...item,
      inWardrobe: isOwned,
      owned: isOwned,
      needed_to_buy: item.needed_to_buy ?? !isOwned
    };
  });

  const ownedItems = normalizedItems.filter(i => i.inWardrobe);
  const missingItems = normalizedItems.filter(i => !i.inWardrobe);
  const totalCount = normalizedItems.length;
  const ownedCount = ownedItems.length;
  const coveragePercentage = Math.round((ownedCount / Math.max(1, totalCount)) * 100);

  // Slot helper for display order and badges
  const slotOrder = ['Top', 'Bottom', 'Shoes', 'Layer'];
  const sortedItems = [...normalizedItems].sort((a, b) => {
    const aSlot = a.slot || a.category || '';
    const bSlot = b.slot || b.category || '';
    return slotOrder.indexOf(aSlot) - slotOrder.indexOf(bSlot);
  });

  const getSlotDisplayLabel = (item) => {
    const slot = (item.slot || item.category || 'Garment').toUpperCase();
    if (slot === 'TOP') return 'TOPWEAR';
    if (slot === 'BOTTOM') return 'BOTTOMWEAR';
    if (slot === 'SHOES') return 'FOOTWEAR';
    if (slot === 'LAYER') return 'OUTERWEAR / LAYER';
    return slot;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Page Header & Preferences Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-taupe-300 text-[11px] font-bold uppercase tracking-widest text-charcoal-700 mb-3 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
            AI STYLING BLUEPRINT
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            WHAT YOU SHOULD WEAR
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 mt-2 font-medium">
            Text-only styling directives harmonized for your selected preferences and wardrobe inventory.
          </p>
        </div>

        {/* Preference Tags Summary */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="tag" size="md">
            Occasion: {preferences.occasion || "College"}
          </Badge>
          <Badge variant="tag" size="md">
            Style: {preferences.style || "Casual"}
          </Badge>
          <Badge variant="tag" size="md">
            Colour: {preferences.colour || "Black"}
          </Badge>
          <Badge variant="tag" size="md">
            Season: {preferences.season || "Summer"}
          </Badge>
          <button
            onClick={() => navigate('/stylist')}
            className="text-xs font-semibold text-charcoal-800 hover:text-black underline ml-2 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-tune Preferences
          </button>
        </div>
      </div>

      {/* 2. Primary Styling Directive & Closet Status Summary */}
      <section className="bg-[#FCFAF7] rounded-3xl p-6 sm:p-10 border border-taupe-300 shadow-sm space-y-8">
        
        {/* Look Name and Concept Prescription */}
        <div className="space-y-3 pb-6 border-b border-taupe-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-widest text-charcoal-500">
              Curated Ensemble Formula
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700 bg-white px-3 py-1 rounded-full border border-taupe-300">
              {totalCount} Piece Combination
            </span>
          </div>

          <h2 className="editorial-heading text-2xl sm:text-3xl md:text-4xl font-bold text-charcoal-900">
            {name}
          </h2>

          <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed max-w-4xl font-normal">
            {subtitle || "Balanced proportion and palette coordination calibrated for daily utility."}
          </p>

          <div className="p-4 rounded-2xl bg-white border border-taupe-200 space-y-2 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-charcoal-800">
              <Compass className="w-4 h-4 text-charcoal-900" />
              Styling Directive
            </div>
            <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
              Wear the coordinated pieces below to achieve an intentional <strong className="text-charcoal-900">{preferences.style || 'Casual'}</strong> silhouette for <strong className="text-charcoal-900">{preferences.occasion || 'College'}</strong>. Pieces already in your closet are highlighted in green, while missing items required to complete the ensemble are marked in amber.
            </p>
          </div>
        </div>

        {/* High-Visibility Closet Breakdown Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          
          <div className="bg-white rounded-2xl p-5 border border-emerald-200/90 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                In Your Closet
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="editorial-heading text-3xl font-bold text-charcoal-900">
                {ownedCount}
              </span>
              <span className="text-xs text-charcoal-500 ml-1.5 font-medium">
                of {totalCount} items
              </span>
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-2">
              ✓ Ready to wear immediately
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-amber-200/90 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Needed to Buy
              </span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="editorial-heading text-3xl font-bold text-charcoal-900">
                {missingItems.length}
              </span>
              <span className="text-xs text-charcoal-500 ml-1.5 font-medium">
                item{missingItems.length === 1 ? '' : 's'} missing
              </span>
            </div>
            <p className="text-xs text-amber-700 font-medium mt-2">
              {missingItems.length > 0 ? "✦ Purchase to complete ensemble" : "✓ None! 100% closet ready"}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-taupe-200 shadow-subtle flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700">
                Closet Readiness
              </span>
              <Layers className="w-4 h-4 text-charcoal-700" />
            </div>
            <div className="mt-2">
              <span className="editorial-heading text-3xl font-bold text-charcoal-900">
                {coveragePercentage}%
              </span>
              <span className="text-xs text-charcoal-500 ml-1.5 font-medium">
                wardrobe match
              </span>
            </div>
            <p className="text-xs text-charcoal-600 font-medium mt-2">
              {coveragePercentage === 100 ? "All pieces in your wardrobe" : "High closet synergy"}
            </p>
          </div>

        </div>

      </section>

      {/* 3. Slot-by-Slot Garment Breakdown (Text-First Showcase) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-taupe-200">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-charcoal-900" />
            <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
              Garment Breakdown: What You Should Wear
            </h3>
          </div>
          <span className="text-xs text-charcoal-500 font-medium">
            {totalCount} Coordinated Garment Pieces
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedItems.map((item, idx) => {
            const isOwned = item.inWardrobe;

            return (
              <div
                key={item.id || idx}
                className={`rounded-2xl p-6 sm:p-7 border transition-all shadow-subtle flex flex-col justify-between space-y-5 ${
                  isOwned
                    ? 'bg-white border-emerald-300 ring-1 ring-emerald-200/60'
                    : 'bg-[#FFFAF5] border-amber-300 ring-1 ring-amber-200/60'
                }`}
              >
                {/* Header: Slot Badge & Ownership Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                  <span className="bg-charcoal-900 text-cream-50 px-2.5 py-1 rounded text-[10px] font-bold tracking-widest uppercase">
                    {getSlotDisplayLabel(item)}
                  </span>

                  {isOwned ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ALREADY IN YOUR CLOSET
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                      <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      NEEDED TO BUY
                    </span>
                  )}
                </div>

                {/* Garment Details & Styling Description */}
                <div className="space-y-3">
                  <div>
                    <h4 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                      {item.name}
                    </h4>
                    <p className="text-xs text-charcoal-500 mt-1 font-medium">
                      {item.brand ? `${item.brand} • ` : ''}{item.colour} {item.subcategory || item.category}
                    </p>
                  </div>

                  {/* Attributes Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-taupe-100 text-charcoal-800 text-[11px] font-semibold">
                      Color: {item.colour}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-taupe-100 text-charcoal-800 text-[11px] font-semibold">
                      Role: {item.slot || item.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-taupe-100 text-charcoal-800 text-[11px] font-semibold">
                      Usage: {item.usage || preferences.occasion || 'Casual'}
                    </span>
                  </div>

                  {/* Styling Instructions */}
                  <div className="pt-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700 mb-1">
                      Styling Note:
                    </div>
                    <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed font-normal">
                      {item.description || `Style this ${item.colour} ${item.subcategory || 'piece'} to coordinate seamlessly with the rest of the ensemble.`}
                    </p>
                  </div>
                </div>

                {/* Status Guidance Banner & Slot Action */}
                <div className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOwned
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}>
                  <div className="text-xs font-medium">
                    {isOwned ? (
                      <span className="flex items-center gap-1.5 font-semibold text-emerald-800">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        Available in your wardrobe — wear this piece directly.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        Missing from wardrobe — purchase or substitute this piece.
                      </span>
                    )}
                  </div>

                  {isOwned ? (
                    <button
                      onClick={() => navigate('/try-existing')}
                      className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-xs font-bold hover:bg-emerald-50 transition-colors shrink-0"
                    >
                      Try What I Own →
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/shop-new')}
                      className="px-3 py-1.5 rounded-lg bg-charcoal-900 text-cream-50 text-xs font-bold hover:bg-black transition-colors shrink-0"
                    >
                      Shop Missing Piece →
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Categorized Split: Already In Closet vs. Needed to Buy */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* Box A: Already In Your Closet */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-taupe-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <h3 className="editorial-heading text-lg sm:text-xl font-bold text-charcoal-900">
                Already In Your Closet ({ownedItems.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Ready to Wear
            </span>
          </div>

          <p className="text-xs sm:text-sm text-charcoal-600">
            These items match what you already own. You do not need to make any purchases for these slots:
          </p>

          <div className="space-y-2.5">
            {ownedItems.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span className="font-bold text-charcoal-900">{item.name}</span>
                </div>
                <span className="font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {item.slot || item.category}
                </span>
              </div>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/try-existing')}
            className="w-full justify-center"
            iconLeft={<Shirt className="w-4 h-4" />}
          >
            TRY WHAT I OWN ({ownedItems.length} ITEMS)
          </Button>
        </div>

        {/* Box B: Items Needed To Buy */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-card space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-taupe-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h3 className="editorial-heading text-lg sm:text-xl font-bold text-charcoal-900">
                Needed To Buy ({missingItems.length})
              </h3>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              {missingItems.length > 0 ? "Action Required" : "All Complete"}
            </span>
          </div>

          {missingItems.length > 0 ? (
            <>
              <p className="text-xs sm:text-sm text-charcoal-600">
                To achieve the full styled blueprint, acquire or upload the following piece(s):
              </p>

              <div className="space-y-2.5">
                {missingItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-charcoal-900">{item.name}</span>
                    </div>
                    <span className="font-semibold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                      {item.slot || item.category}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/shop-new')}
                className="w-full justify-center border-amber-400 hover:bg-amber-50"
                iconLeft={<ShoppingBag className="w-4 h-4" />}
              >
                SHOP THE MISSING ITEM
              </Button>
            </>
          ) : (
            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-emerald-100 text-emerald-800">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h4 className="editorial-heading text-lg font-bold text-emerald-900">
                100% Wardrobe Complete!
              </h4>
              <p className="text-xs text-emerald-700">
                Every single piece required for this outfit is already available in your wardrobe. Zero new shopping needed!
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/try-existing')}
                className="justify-center mx-auto"
                iconLeft={<Shirt className="w-3.5 h-3.5" />}
              >
                WEAR THIS ENSEMBLE NOW
              </Button>
            </div>
          )}
        </div>

      </section>

      {/* 5. Wardrobe Match Progress & Inventory Synergy */}
      <section>
        <WardrobeMatch
          ownedCount={ownedCount}
          totalCount={totalCount}
          percentage={coveragePercentage}
          statusText={coveragePercentage === 100 ? "Ready in your closet!" : "High Closet Synergy"}
          subtext={missingItems.length > 0 ? `Missing: ${missingItems.map(i => i.name).join(', ')}` : "All pieces available in wardrobe"}
          items={sortedItems}
        />
      </section>

      {/* 6. Why This Outfit? (Styling Reasons) */}
      <section>
        <RecommendationReason
          reasons={reasons}
          title="WHY THIS OUTFIT?"
          subtitle="Intentional curation calibrated to eliminate unnecessary wardrobe clutter"
        />
      </section>

      {/* 7. Alternative Ensembles (Text-Centric Blueprints) */}
      {alternatives && alternatives.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-taupe-200">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-500">
                Alternative Combinations
              </span>
              <h3 className="editorial-heading text-2xl sm:text-3xl font-semibold text-charcoal-900 mt-1">
                Explore Alternative Blueprints
              </h3>
            </div>
            <span className="text-xs text-charcoal-500 font-medium">
              {alternatives.length} Curated Variants
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {alternatives.map((alt) => (
              <OutfitCard
                key={alt.id}
                outfit={alt}
                textOnly={true}
                onView={(selectedAlt) => {
                  applyAlternative(selectedAlt);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                actionText="Select This Blueprint →"
              />
            ))}
          </div>
        </section>
      )}

    </div>
  );
};

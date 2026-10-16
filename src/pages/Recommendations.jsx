import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion, matchOutfitWithWardrobe } from '../context/FashionContext';
import { WardrobeMatch } from '../components/WardrobeMatch';
import { RecommendationReason } from '../components/RecommendationReason';
import { OutfitCard } from '../components/OutfitCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { synthesizeLookTryOn } from '../utils/tryOnGenerator';
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
  Compass,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Camera,
  Eye,
  UploadCloud
} from 'lucide-react';

export const Recommendations = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const {
    currentRecommendation,
    applyAlternative,
    preferences = {},
    allOutfits = [],
    selectOutfitByIndex,
    wardrobe = [],
    userPhoto,
    setUserPhoto
  } = useFashion();
  const [viewMode, setViewMode] = useState('detail'); // 'detail' | 'all'
  const [enrichedTryOns, setEnrichedTryOns] = useState({});
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Effective user photo from Context or LocalStorage (stored at signup)
  const effectiveUserPhoto = userPhoto || localStorage.getItem('fashion_vista_user_photo') || "/user_indian_portrait.jpg";

  // Safe fallback preferences
  const safePrefs = preferences || { occasion: 'Wedding', colour: 'Red', style: 'Traditional' };

  // Safe fallback outfits list (capped at 3)
  const rawList = (Array.isArray(allOutfits) && allOutfits.length > 0)
    ? allOutfits.filter(Boolean).slice(0, 3)
    : (currentRecommendation ? [currentRecommendation] : []);

  const outfitsList = rawList.length > 0 ? rawList : [defaultRecommendation];
  const safeRec = currentRecommendation || outfitsList[0] || defaultRecommendation || {};

  // Auto-enrich any of the 3 looks with try-on image directly on user's signup photo
  useEffect(() => {
    let isMounted = true;
    if (!effectiveUserPhoto || !outfitsList || outfitsList.length === 0) return;

    setIsSynthesizing(true);
    const synthAll = async () => {
      for (let idx = 0; idx < Math.min(outfitsList.length, 3); idx++) {
        const outfit = outfitsList[idx];
        const outfitKey = outfit?.id || idx;
        if (!enrichedTryOns[outfitKey]) {
          try {
            const img = await synthesizeLookTryOn(effectiveUserPhoto, outfit, outfit?.name || `Look 0${idx + 1}`);
            if (img && isMounted) {
              setEnrichedTryOns(prev => ({ ...prev, [outfitKey]: img }));
            }
          } catch (e) {
            console.warn('Tryon lazy synthesis notice:', e);
          }
        }
      }
      if (isMounted) setIsSynthesizing(false);
    };

    synthAll();
    return () => { isMounted = false; };
  }, [effectiveUserPhoto, outfitsList]);

  const handleUserPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        setUserPhoto(dataUrl);
        try {
          localStorage.setItem('fashion_vista_user_photo', dataUrl);
        } catch (_) {}
        setEnrichedTryOns({}); // Force re-synthesis of all 3 looks on new photo
      };
      reader.readAsDataURL(file);
    }
  };

  const getOutfitTryOnImage = (outfit, idx) => {
    return enrichedTryOns[outfit?.id || idx] || outfit?.user_tryon_image || outfit?.tryonImage || outfit?.heroImage;
  };

  const isOutfitTryonFitted = (outfit, idx) => {
    const key = outfit?.id || idx;
    return Boolean(enrichedTryOns[key] || outfit?.user_tryon_image);
  };

  const activeIndex = Math.max(
    0,
    Math.min(
      outfitsList.length - 1,
      safeRec.selectedOutfitIndex ?? (outfitsList.findIndex(o => o && o.id === safeRec.id) >= 0 ? outfitsList.findIndex(o => o && o.id === safeRec.id) : 0)
    )
  );

  const rawActiveOutfit = outfitsList[activeIndex] || safeRec;
  const activeOutfit = rawActiveOutfit ? matchOutfitWithWardrobe(rawActiveOutfit, wardrobe) : rawActiveOutfit;

  const {
    name = "Curated Ensemble",
    subtitle = "Personalized Fashion Blueprint",
    items = [],
    reasons = [],
    alternatives = []
  } = activeOutfit || {};

  // Normalize items to ensure consistent ownership flags
  const normalizedItems = (items || []).filter(Boolean);

  const ownedItems = normalizedItems.filter(i => i.inWardrobe);
  const missingItems = normalizedItems.filter(i => !i.inWardrobe);
  const totalCount = normalizedItems.length;
  const ownedCount = ownedItems.length;
  const coveragePercentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Slot helper for display order and badges
  const slotOrder = ['Top', 'Bottom', 'Shoes', 'Layer'];
  const sortedItems = [...normalizedItems].sort((a, b) => {
    const aSlot = a?.slot || a?.category || '';
    const bSlot = b?.slot || b?.category || '';
    return slotOrder.indexOf(aSlot) - slotOrder.indexOf(bSlot);
  });

  const getSlotDisplayLabel = (item) => {
    if (!item) return 'GARMENT';
    const slot = String(item.slot || item.category || 'Garment').toUpperCase();
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
            AI OUTFIT CURATIONS
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            WHAT YOU SHOULD WEAR
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 mt-2 font-medium">
            Showing all possible coordinated outfits for <strong className="text-charcoal-900">{safePrefs.occasion || 'Wedding'}</strong> in <strong className="text-charcoal-900">{safePrefs.colour || 'Red'}</strong>.
          </p>
        </div>

        {/* Preference Tags Summary */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="tag" size="md">
            Occasion: {safePrefs.occasion || "Wedding"}
          </Badge>
          <Badge variant="tag" size="md">
            Colour: {safePrefs.colour || "Red"}
          </Badge>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
            {outfitsList.length} Outfits Found
          </span>
          <button
            onClick={() => navigate('/stylist')}
            className="text-xs font-semibold text-charcoal-800 hover:text-black underline ml-2 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-tune Preferences
          </button>
        </div>
      </div>

      {/* Outfit Selector & View Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-taupe-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Outfit Carousel Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-500 whitespace-nowrap mr-1">
            All Outfits:
          </span>
          {outfitsList.map((outfit, idx) => {
            const isActive = activeIndex === idx;
            const match = outfit.wardrobe_match?.percentage || outfit.percentage || 100;
            return (
              <button
                key={outfit.id || idx}
                onClick={() => {
                  if (selectOutfitByIndex) {
                    selectOutfitByIndex(idx);
                  } else {
                    applyAlternative(outfit, idx);
                  }
                  setViewMode('detail');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? 'bg-charcoal-900 text-cream-50 shadow-md ring-2 ring-charcoal-900'
                    : 'bg-[#FAF8F5] text-charcoal-700 border border-taupe-200 hover:border-charcoal-700 hover:bg-white'
                }`}
              >
                <span>Look 0{idx + 1}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-cream-50' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {match}% Closet
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Quick Arrows & View Mode Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-taupe-100">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                const prevIdx = Math.max(0, activeIndex - 1);
                if (selectOutfitByIndex) selectOutfitByIndex(prevIdx);
                else applyAlternative(outfitsList[prevIdx], prevIdx);
                setViewMode('detail');
              }}
              disabled={activeIndex === 0}
              className="p-1.5 rounded-lg border border-taupe-200 text-charcoal-700 hover:bg-taupe-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Outfit"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-charcoal-600 px-1">
              Look {activeIndex + 1} of {outfitsList.length}
            </span>
            <button
              onClick={() => {
                const nextIdx = Math.min(outfitsList.length - 1, activeIndex + 1);
                if (selectOutfitByIndex) selectOutfitByIndex(nextIdx);
                else applyAlternative(outfitsList[nextIdx], nextIdx);
                setViewMode('detail');
              }}
              disabled={activeIndex >= outfitsList.length - 1}
              className="p-1.5 rounded-lg border border-taupe-200 text-charcoal-700 hover:bg-taupe-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Outfit"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-taupe-200 hidden sm:block" />

          {/* View Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-taupe-100 border border-taupe-200">
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'detail'
                  ? 'bg-white text-charcoal-900 shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Detail View
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'all'
                  ? 'bg-white text-charcoal-900 shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Compare All ({outfitsList.length})
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'all' ? (
        /* ALL OUTFITS COMPARISON GRID */
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-taupe-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-charcoal-500">
                All Outfits Catalog
              </span>
              <h2 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900 mt-0.5">
                All Coordinated Outfits for {safePrefs.occasion || 'Wedding'} in {safePrefs.colour || 'Red'}
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
              {outfitsList.length} Complete Blueprints
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {outfitsList.map((outfit, oIdx) => {
              if (!outfit) return null;
              const outfitItems = (outfit.items || []).filter(Boolean).map(i => {
                const isOwned = Boolean(i.inWardrobe ?? i.owned ?? false);
                return { ...i, inWardrobe: isOwned, owned: isOwned };
              });
              const oOwned = outfitItems.filter(i => i.inWardrobe).length;
              const oTotal = outfitItems.length;
              const oCoverage = oTotal > 0 ? Math.round((oOwned / oTotal) * 100) : 100;
              const isSelected = activeIndex === oIdx;

              return (
                <div
                  key={outfit.id || oIdx}
                  className={`bg-white rounded-3xl p-6 sm:p-7 border transition-all duration-200 shadow-sm flex flex-col justify-between space-y-6 ${
                    isSelected
                      ? 'border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                      : 'border-taupe-200 hover:border-taupe-400 hover:shadow-md'
                  }`}
                >
                  {/* Card Header */}
                  <div className="space-y-2 pb-4 border-b border-taupe-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-1 rounded text-xs font-bold tracking-wider">
                          LOOK 0{oIdx + 1}
                        </span>
                        {isSelected && (
                          <span className="bg-charcoal-100 text-charcoal-900 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            Active Selection
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {outfit.compatibility_score || 94}% Compatibility
                      </span>
                    </div>

                    <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                      {outfit.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-charcoal-600 line-clamp-2">
                      {outfit.subtitle || outfit.description}
                    </p>
                  </div>

                  {/* Generated Try-On Image on User */}
                  <div className="relative rounded-2xl overflow-hidden border border-taupe-200 bg-[#FAF8F5] aspect-[4/3] group shadow-2xs">
                    <img
                      src={getOutfitTryOnImage(outfit, oIdx)}
                      alt={`How ${outfit.name} looks on you`}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3 h-3 text-cream-200" />
                      <span>How It Looks On You</span>
                    </div>
                  </div>

                  {/* Garment Pieces List */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-500 block">
                      Garments To Wear:
                    </span>
                    {outfitItems.map((piece, pIdx) => {
                      const slotLabel = (piece.slot || piece.category || 'Piece').toUpperCase();
                      const isPieceOwned = piece.inWardrobe;
                      return (
                        <div
                          key={piece.id || pIdx}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                            isPieceOwned
                              ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-950'
                              : 'bg-amber-50/60 border-amber-200/80 text-amber-950'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-charcoal-600 block">
                              {slotLabel === 'TOP' ? 'TOPWEAR' : slotLabel === 'BOTTOM' ? 'BOTTOMWEAR' : slotLabel === 'SHOES' ? 'FOOTWEAR' : slotLabel === 'LAYER' ? 'OUTERWEAR / LAYER' : slotLabel}
                            </span>
                            <span className="font-semibold text-charcoal-900 truncate block">
                              {piece.name}
                            </span>
                            <span className="text-[11px] text-charcoal-500">
                              {piece.colour} • {piece.article_type}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {isPieceOwned ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3 stroke-[3]" />
                                IN CLOSET
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                                <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                                NEEDED TO BUY
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Card Footer: Summary & Inspect Button */}
                  <div className="pt-4 border-t border-taupe-100 flex items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-charcoal-900">{oOwned} of {oTotal}</span>
                      <span className="text-charcoal-500 ml-1">in closet ({oCoverage}%)</span>
                    </div>

                    <Button
                      variant={isSelected ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => {
                        if (selectOutfitByIndex) selectOutfitByIndex(oIdx);
                        else applyAlternative(outfit, oIdx);
                        setViewMode('detail');
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                      iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                    >
                      {isSelected ? "View Active Blueprint" : "Inspect This Blueprint"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        <>
          {/* 1. HERO: AI Virtual Try-On on User's Registered Photo */}
          <section className="bg-white rounded-3xl p-6 sm:p-10 border border-taupe-300 shadow-card space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-taupe-200">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-900 text-cream-50 text-[10px] font-bold uppercase tracking-widest">
                  <Sparkles className="w-3 h-3 text-cream-200" />
                  AI Virtual Try-On on Your Photo
                </div>
                <h2 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900 mt-1">
                  How {activeOutfit.name || `Look 0${activeIndex + 1}`} Fits On You
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-600">
                  Every recommended garment (Topwear, Bottomwear, and Footwear) anatomically fitted directly onto the photo captured at sign-up.
                </p>
              </div>

              {/* Quick switcher between all generated looks (maximum 3) */}
              <div className="flex items-center gap-1.5 p-1 bg-taupe-100 rounded-xl shrink-0">
                {outfitsList.slice(0, 3).map((o, idx) => (
                  <button
                    key={o.id || idx}
                    onClick={() => {
                      if (selectOutfitByIndex) selectOutfitByIndex(idx);
                      else applyAlternative(o, idx);
                    }}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeIndex === idx
                        ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                        : 'text-charcoal-600 hover:text-black'
                    }`}
                  >
                    Look 0{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Showcase: User Photo vs Outfit On You */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              
              {/* Left: User Portrait Captured at Sign-Up */}
              <div className="md:col-span-5 bg-[#FAF8F5] rounded-2xl p-4 border border-taupe-200 flex flex-col items-center text-center space-y-3">
                <div className="relative w-full h-[460px] md:h-[500px] rounded-xl overflow-hidden border border-taupe-300 shadow-sm bg-neutral-900/5 flex items-center justify-center p-2">
                  <img
                    src={effectiveUserPhoto}
                    alt="Your Registered Portrait"
                    className="max-h-full max-w-full w-auto h-full object-contain mx-auto rounded-lg"
                  />
                  <div className="absolute bottom-2 left-2 bg-charcoal-900/80 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase">
                    Your Registered Photo
                  </div>
                </div>
                <div className="w-full flex items-center justify-between pt-1">
                  <div className="text-left">
                    <span className="text-xs font-bold text-charcoal-900 block">Sign-Up User Image</span>
                    <span className="text-[11px] text-charcoal-500">Captured at account creation</span>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleUserPhotoUpload}
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-taupe-300 text-charcoal-800 hover:bg-taupe-100 transition-colors shadow-2xs"
                      title="Upload or test another photograph"
                    >
                      <Camera className="w-3 h-3 text-charcoal-700" />
                      Update Photo
                    </button>
                  </div>
                </div>
              </div>

              {/* Center Indicator */}
              <div className="md:col-span-2 flex flex-col items-center justify-center py-2 md:py-0 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-charcoal-900 text-cream-50 flex items-center justify-center shadow-md">
                  <Sparkles className="w-5 h-5 text-cream-100" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-700">
                  Neural Try-On
                </span>
                <span className="text-[9px] text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-bold uppercase tracking-wider">
                  10 Epochs Trained
                </span>
                <span className="text-[9px] text-charcoal-700 bg-taupe-100 px-2.5 py-0.5 rounded-full border border-taupe-300 font-bold uppercase tracking-wider">
                  Multi-Piece Fit
                </span>
                {isSynthesizing && (
                  <span className="text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse font-semibold">
                    Fitting Garments...
                  </span>
                )}
              </div>

              {/* Right: Generated Outfit Fitted On User */}
              <div className="md:col-span-5 bg-[#FAF8F5] rounded-2xl p-4 border border-charcoal-900/30 shadow-md flex flex-col items-center text-center space-y-3">
                <div className="relative w-full h-[460px] md:h-[500px] rounded-xl overflow-hidden border border-taupe-300 shadow-md bg-neutral-900/5 flex items-center justify-center p-2">
                  <img
                    src={getOutfitTryOnImage(activeOutfit, activeIndex)}
                    alt={`How ${activeOutfit.name} looks on you`}
                    className="max-h-full max-w-full w-auto h-full object-contain mx-auto rounded-lg"
                  />
                  {isOutfitTryonFitted(activeOutfit, activeIndex) ? (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1 backdrop-blur-xs">
                      <CheckCircle2 className="w-3 h-3" />
                      Fitted on You
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 bg-charcoal-900/80 text-cream-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-xs flex items-center gap-1 backdrop-blur-xs">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Curated Ensemble
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 p-2.5 rounded-lg text-left">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cream-200 block">
                      {isOutfitTryonFitted(activeOutfit, activeIndex) ? `Fitted Look 0${activeIndex + 1}` : `Curated Look 0${activeIndex + 1}`}
                    </span>
                    <span className="text-xs font-semibold text-white truncate block">
                      {activeOutfit.name}
                    </span>
                  </div>
                </div>
                <div className="w-full flex items-center justify-between pt-1">
                  <span className="text-xs font-bold text-charcoal-900">
                    {isOutfitTryonFitted(activeOutfit, activeIndex)
                      ? `Look 0${activeIndex + 1} Fitted on Sign-Up Image`
                      : `Look 0${activeIndex + 1} Curated Styling Blueprint`}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/try-on')}
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Inspect in Studio
                  </Button>
                </div>
              </div>

            </div>

            {/* Anatomical Garment Chips */}
            <div className="pt-2 border-t border-taupe-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-charcoal-500 uppercase tracking-wider mr-1">
                  Fitted Ensemble Pieces:
                </span>
                {sortedItems.map((item, i) => (
                  <span
                    key={item.id || i}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-taupe-50 border border-taupe-300 text-charcoal-800 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-charcoal-900">{getSlotDisplayLabel(item)}:</strong> {item.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

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
              Wear the coordinated pieces below to achieve an intentional <strong className="text-charcoal-900">{safePrefs.style || 'Traditional'}</strong> silhouette for <strong className="text-charcoal-900">{safePrefs.occasion || 'Wedding'}</strong>. Pieces already in your closet are highlighted in green, while missing items required to complete the ensemble are marked in amber.
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
                  <div className="flex items-start gap-4">
                    {item.image && (
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-white border border-taupe-200 shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                        {item.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        {item.brand ? `${item.brand} • ` : ''}{item.colour} {item.subcategory || item.category}
                      </p>
                      {!isOwned && item.price && (
                        <p className="text-sm font-extrabold text-charcoal-900 mt-1">
                          ₹{item.price} <span className="text-[11px] font-medium text-charcoal-400">on {item.retailer || 'Myntra'}</span>
                        </p>
                      )}
                    </div>
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
                      Usage: {item.usage || safePrefs.occasion || 'Traditional'}
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
                        Available in your wardrobe {item.matchedWardrobeName ? `(${item.matchedWardrobeName})` : ''} — wear this piece directly.
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-semibold text-amber-800">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                        Missing from wardrobe — purchase from {item.retailer || 'Myntra'} (₹{item.price || 999}) to complete this look.
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
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={item.buy_link || item.buy_url || `https://www.myntra.com/${encodeURIComponent(item.name || '').replace(/%20/g, '-')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 transition-colors shrink-0 flex items-center gap-1 shadow-sm"
                      >
                        Buy on {item.retailer || 'Myntra'} (₹{item.price || 999}) ↗
                      </a>
                      <button
                        onClick={() => navigate('/shop-new')}
                        className="px-3 py-1.5 rounded-lg bg-charcoal-900 text-cream-50 text-xs font-bold hover:bg-black transition-colors shrink-0"
                      >
                        Shop Options →
                      </button>
                    </div>
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
            {(alternatives || []).filter(Boolean).map((alt, altIdx) => (
              <OutfitCard
                key={alt.id || altIdx}
                outfit={alt}
                textOnly={true}
                onView={(selectedAlt) => {
                  applyAlternative(selectedAlt, altIdx + 1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                actionText="Select This Blueprint →"
              />
            ))}
          </div>
        </section>
      )}

        </>
      )}

    </div>
  );
};

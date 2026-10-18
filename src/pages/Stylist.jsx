import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Check, DollarSign, Tag, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useFashion } from '../context/FashionContext';
import { stylistStepOptions } from '../data/outfitData';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';

// Pre-defined Step 3 Budget Constraint Tiers
// Rule: Under ₹2,000 -> Meesho, Flipkart, Amazon. Above ₹2,000 -> Myntra
export const BUDGET_TIERS = [
  {
    id: "under-2000",
    label: "Under ₹2,000",
    retailers: "Meesho • Flipkart • Amazon",
    badge: "Budget Friendly (< ₹2,000)",
    description: "Every piece curated strictly under ₹2,000 with direct buying links from Meesho, Flipkart, and Amazon.",
    price_range: "under-2000",
    min: 0,
    max: 2000,
    budget: 2000,
    icon: "🏷️",
    accentColor: "border-purple-300 bg-purple-50/50 text-purple-700"
  },
  {
    id: "2000-5000",
    label: "₹2,000 - ₹5,000",
    retailers: "Myntra Curated",
    badge: "Occasion Ready (₹2,000+)",
    description: "Premium ethnic silhouettes, designer fabrics & authentic verified items directly on Myntra.",
    price_range: "2000-5000",
    min: 2000,
    max: 5000,
    budget: 5000,
    icon: "✨",
    accentColor: "border-pink-300 bg-pink-50/50 text-[#E11B5A]"
  },
  {
    id: "5000-10000",
    label: "₹5,000 - ₹10,000",
    retailers: "Myntra Premium Designer",
    badge: "Luxury Occasion (₹2,000+)",
    description: "Intricate heavy Zari, pure raw silks, handcrafted Polki accents & elevated formal statements on Myntra.",
    price_range: "5000-10000",
    min: 5000,
    max: 10000,
    budget: 10000,
    icon: "👑",
    accentColor: "border-amber-300 bg-amber-50/50 text-amber-700"
  },
  {
    id: "no-limit",
    label: "No Budget Limit",
    retailers: "Myntra + Value Brands",
    badge: "All Price Ranges",
    description: "Full spectrum exploration across all price tiers with automatic routing (< ₹2,000 to Meesho/Flipkart/Amazon, >= ₹2,000 to Myntra).",
    price_range: "all",
    min: null,
    max: null,
    budget: null,
    icon: "💎",
    accentColor: "border-emerald-300 bg-emerald-50/50 text-emerald-700"
  }
];

export const Stylist = () => {
  const navigate = useNavigate();
  const { preferences, generateRecommendation } = useFashion();

  // 3-Step Questionnaire: 1 - Occasion, 2 - Colour, 3 - Budget Constraint
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  // Local state taking occasion, colour, and budget constraint
  const [formState, setFormState] = useState({
    occasion: preferences.occasion || 'Wedding',
    colour: preferences.colour || 'Red',
    budgetTier: preferences.price_range === 'under-2000' || (preferences.budget && preferences.budget <= 2000) ? 'under-2000' : (preferences.price_range || 'under-2000'),
    customBudget: preferences.budget ? String(preferences.budget) : ''
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const stepTitles = [
    { title: "Occasion Type", subtitle: "Where are you heading? Select your occasion." },
    { title: "Preferred Colour", subtitle: "Select your preferred color theme or let AI choose." },
    { title: "Budget & Store Preference", subtitle: "Choose your budget bracket (< ₹2,000 for Meesho, Flipkart & Amazon; > ₹2,000 for Myntra)." }
  ];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleGenerate();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const occ = formState.occasion || 'Wedding';
      const col = formState.colour || 'Red';
      const selectedTier = BUDGET_TIERS.find(t => t.id === formState.budgetTier) || BUDGET_TIERS[0];
      const hasCustom = formState.customBudget && !isNaN(Number(formState.customBudget)) && Number(formState.customBudget) > 0;
      const budgetVal = hasCustom ? Number(formState.customBudget) : selectedTier.budget;
      const priceRangeVal = hasCustom
        ? (budgetVal <= 2000 ? 'under-2000' : 'all')
        : selectedTier.price_range;

      const fullPrefs = {
        occasion: occ,
        colour: col,
        style: occ === 'Wedding' || occ === 'Traditional' ? 'Traditional' : occ === 'Office' ? 'Formal' : 'Casual',
        budget: budgetVal,
        price_range: priceRangeVal,
        min_price: selectedTier.min,
        max_price: hasCustom ? budgetVal : selectedTier.max,
        outfitType: 'Full Outfit',
        season: 'All Season'
      };
      await generateRecommendation(fullPrefs);
    } catch (err) {
      console.error('Error in handleGenerate:', err);
    } finally {
      setIsGenerating(false);
      navigate('/recommendations');
    }
  };

  const progressPercent = Math.round((currentStep / totalSteps) * 100);
  const selectedTier = BUDGET_TIERS.find(t => t.id === formState.budgetTier) || BUDGET_TIERS[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      
      {/* Header */}
      <div className="text-center max-w-xl mx-auto mb-10">
        <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200">
          AI Personal Stylist
        </span>
        <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900 mt-3">
          Let's find your outfit.
        </h1>
        <p className="text-sm sm:text-base text-charcoal-500 mt-2">
          Tell us where you're going, what you like, and your target budget.
        </p>
      </div>

      {/* Progress Counter */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 shadow-card mb-8">
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs uppercase font-bold tracking-widest text-charcoal-400">
              Questionnaire Progress
            </span>
            <h2 className="editorial-heading text-xl font-bold text-charcoal-900 mt-0.5">
              STEP {currentStep} — {stepTitles[currentStep - 1].title.toUpperCase()}
            </h2>
            <p className="text-xs text-charcoal-500">
              {stepTitles[currentStep - 1].subtitle}
            </p>
          </div>
          <div className="text-right">
            <span className="editorial-heading text-2xl font-bold text-charcoal-900">
              0{currentStep}
            </span>
            <span className="text-sm font-medium text-taupe-400"> / 0{totalSteps}</span>
          </div>
        </div>

        <ProgressBar
          value={progressPercent}
          max={100}
          height="h-2"
          barColor="bg-charcoal-900"
          trackColor="bg-taupe-200"
        />

        {/* STEP CONTENT */}
        <div className="mt-8 pt-6 border-t border-taupe-100">
          
          {/* STEP 1: OCCASION */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {stylistStepOptions.occasions.map((occ) => {
                const isSelected = formState.occasion === occ.label;
                return (
                  <div
                    key={occ.id}
                    onClick={() => setFormState({ ...formState, occasion: occ.label })}
                    className={`p-4 sm:p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                        : 'bg-white border-taupe-200 hover:border-taupe-400 hover:bg-[#FAF8F5]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-charcoal-900 text-base">{occ.label}</span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-charcoal-900 text-white' : 'border border-taupe-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-500 leading-relaxed">{occ.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 2: PREFERRED COLOUR */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {stylistStepOptions.colours.map((col) => {
                  const isSelected = formState.colour === col.label;
                  return (
                    <div
                      key={col.id}
                      onClick={() => setFormState({ ...formState, colour: col.label })}
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                          : 'bg-white border-taupe-200 hover:border-taupe-400 hover:bg-[#FAF8F5]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-6 h-6 rounded-full shadow-inner ${col.border ? 'border border-taupe-300' : ''}`}
                          style={{ background: col.hex }}
                        />
                        <span className="font-semibold text-sm text-charcoal-900">{col.label}</span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-charcoal-900 text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Selection Summary */}
              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-taupe-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-charcoal-700 uppercase tracking-wider text-[10px] block mb-1">
                    Selected Preferences
                  </span>
                  <div className="flex items-center gap-4 text-charcoal-700 font-medium">
                    <span>Occasion: <strong className="text-charcoal-900">{formState.occasion}</strong></span>
                    <span>•</span>
                    <span>Colour: <strong className="text-charcoal-900">{formState.colour}</strong></span>
                  </div>
                </div>
                <span className="text-charcoal-600 font-semibold bg-white px-2.5 py-1 rounded-md border border-taupe-200">
                  Step 2 of 3 Complete
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: BUDGET CONSTRAINT & MULTI-RETAILER STORE TIERS */}
          {currentStep === 3 && (
            <div className="space-y-6">
              
              {/* Informational Retailer Rule Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-taupe-300 text-xs text-charcoal-800 space-y-1">
                <div className="flex items-center gap-2 font-bold text-charcoal-900">
                  <ShoppingBag className="w-4 h-4 text-[#E11B5A]" />
                  <span>Retailer Sourcing Rule (Automated Pricing Dispatch):</span>
                </div>
                <p className="text-charcoal-600 leading-relaxed pl-6">
                  • <strong>Under ₹2,000</strong>: Direct product buying links from <strong>Meesho, Flipkart, or Amazon</strong>.<br />
                  • <strong>Above ₹2,000</strong>: Direct product buying links from <strong>Myntra</strong>.
                </p>
              </div>

              {/* 4 Budget Tier Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUDGET_TIERS.map((tier) => {
                  const isSelected = formState.budgetTier === tier.id && !formState.customBudget;
                  return (
                    <div
                      key={tier.id}
                      onClick={() => setFormState({ ...formState, budgetTier: tier.id, customBudget: '' })}
                      className={`p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                        isSelected
                          ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                          : 'bg-white border-taupe-200 hover:border-taupe-400 hover:bg-[#FAF8F5]/50'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{tier.icon}</span>
                          <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${tier.accentColor}`}>
                            {tier.badge}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-bold text-charcoal-900 text-lg">{tier.label}</h4>
                          <span className="text-xs font-semibold text-charcoal-500 block mt-0.5">
                            Stores: <strong className="text-charcoal-800">{tier.retailers}</strong>
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-600 leading-relaxed">
                          {tier.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-taupe-100 text-xs">
                        <span className="font-medium text-charcoal-500">
                          {tier.max ? `Budget Cap: ₹${tier.max.toLocaleString('en-IN')}` : 'No Hard Cap'}
                        </span>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-charcoal-900 text-white' : 'border border-taupe-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Optional Custom Budget Input */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF8F5] border border-taupe-200 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-charcoal-900" />
                  Or Enter Exact Custom Budget Limit (₹ INR):
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 1500, 2000, 3500..."
                      value={formState.customBudget}
                      onChange={(e) => setFormState({ ...formState, customBudget: e.target.value })}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-taupe-300 focus:outline-none focus:ring-2 focus:ring-charcoal-900 bg-white text-sm font-semibold text-charcoal-900"
                    />
                  </div>
                  {formState.customBudget && (
                    <button
                      type="button"
                      onClick={() => setFormState({ ...formState, customBudget: '' })}
                      className="text-xs text-charcoal-500 hover:text-charcoal-900 underline font-semibold px-2"
                    >
                      Reset to Preset
                    </button>
                  )}
                </div>
                {formState.customBudget && (
                  <p className="text-[11px] font-semibold text-charcoal-600">
                    {Number(formState.customBudget) < 2000 ? (
                      <span className="text-purple-700 font-bold">
                        ✓ Budget &lt; ₹2,000: Links will be sourced directly from Meesho, Flipkart, and Amazon.
                      </span>
                    ) : (
                      <span className="text-[#E11B5A] font-bold">
                        ✓ Budget ≥ ₹2,000: Links will be sourced directly from Myntra.
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Complete 3-Step Summary Banner */}
              <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] block mb-1">
                    Ready to Generate Occasion Blueprints
                  </span>
                  <div className="flex flex-wrap items-center gap-2 text-charcoal-800 font-semibold">
                    <span>Occasion: <strong className="text-charcoal-950">{formState.occasion}</strong></span>
                    <span>•</span>
                    <span>Colour: <strong className="text-charcoal-950">{formState.colour}</strong></span>
                    <span>•</span>
                    <span>
                      Budget: <strong className="text-charcoal-950">
                        {formState.customBudget ? `₹${Number(formState.customBudget).toLocaleString('en-IN')}` : selectedTier.label}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Retailer Tier: <strong className="text-charcoal-950">
                        {formState.customBudget
                          ? (Number(formState.customBudget) < 2000 ? 'Meesho / Flipkart / Amazon' : 'Myntra')
                          : selectedTier.retailers
                        }
                      </strong>
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-emerald-800 font-extrabold bg-white px-3 py-1.5 rounded-lg border border-emerald-300 shadow-2xs shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  3 of 3 Ready
                </span>
              </div>

            </div>
          )}

        </div>

        {/* CONTROLS AT EVERY STEP */}
        <div className="mt-10 pt-6 border-t border-taupe-200 flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="md"
            onClick={handleBack}
            disabled={currentStep === 1 || isGenerating}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {currentStep === 1 && (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Colour →
            </Button>
          )}

          {currentStep === 2 && (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Budget →
            </Button>
          )}

          {currentStep === 3 && (
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating}
              iconLeft={<Sparkles className="w-4 h-4" />}
            >
              {isGenerating ? "Finding All Outfits..." : "Generate All Outfits ✨"}
            </Button>
          )}
        </div>

      </div>

      {/* GENERATION LOADING OVERLAY */}
      {isGenerating && (
        <div className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl border border-taupe-200">
            <div className="w-14 h-14 mx-auto rounded-full bg-cream-100 flex items-center justify-center animate-spin">
              <Sparkles className="w-7 h-7 text-charcoal-900" />
            </div>
            <h3 className="editorial-heading text-2xl font-semibold text-charcoal-900">
              Curating Your AI Ensemble
            </h3>
            <p className="text-sm text-charcoal-500 leading-relaxed">
              Evaluating color harmonies, silhouette balance, and matching fashion pieces against your budget limit & digital wardrobe...
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400 border-t border-taupe-100">
              <span>Slot Completeness</span>
              <span>•</span>
              <span>Budget Compliance</span>
              <span>•</span>
              <span>Closet Synergy</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Check, IndianRupee } from 'lucide-react';
import { useFashion } from '../context/FashionContext';
import { stylistStepOptions } from '../data/outfitData';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';

export const Stylist = () => {
  const navigate = useNavigate();
  const { preferences, generateRecommendation } = useFashion();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Local state for the multi-step form initialized from context preferences
  const [formState, setFormState] = useState({
    occasion: preferences.occasion || 'College',
    outfitType: preferences.outfitType || 'Full Outfit',
    colour: preferences.colour || 'Black',
    style: preferences.style || 'Casual',
    season: preferences.season || 'Summer',
    budget: preferences.budget || '1800'
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const stepTitles = [
    { title: "Occasion", subtitle: "Where are you heading?" },
    { title: "Outfit Type", subtitle: "What key garment or silhouette do you have in mind?" },
    { title: "Primary Colour", subtitle: "Select your preferred tone or let AI decide" },
    { title: "Aesthetic Style", subtitle: "How do you want your ensemble to feel?" },
    { title: "Season / Weather", subtitle: "What climate condition are we dressing for?" },
    { title: "Budget Limit (Optional)", subtitle: "Set an upper limit if any missing pieces are recommended" },
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
      await generateRecommendation(formState);
    } finally {
      setIsGenerating(false);
      navigate('/recommendations');
    }
  };

  const progressPercent = Math.round((currentStep / totalSteps) * 100);

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
          Tell us where you're going, what you like, and how you want to look.
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

          {/* STEP 2: OUTFIT TYPE */}
          {currentStep === 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {stylistStepOptions.outfitTypes.map((type) => {
                const isSelected = formState.outfitType === type.label;
                return (
                  <div
                    key={type.id}
                    onClick={() => setFormState({ ...formState, outfitType: type.label })}
                    className={`p-4 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-md'
                        : 'bg-white text-charcoal-800 border-taupe-200 hover:border-taupe-400 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    <div className="font-semibold text-sm sm:text-base">{type.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 3: COLOUR */}
          {currentStep === 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {stylistStepOptions.colours.map((col) => {
                const isSelected = formState.colour === col.label;
                return (
                  <div
                    key={col.id}
                    onClick={() => setFormState({ ...formState, colour: col.label })}
                    className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                        : 'bg-white border-taupe-200 hover:border-taupe-400'
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
          )}

          {/* STEP 4: STYLE */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {stylistStepOptions.styles.map((stl) => {
                const isSelected = formState.style === stl.label;
                return (
                  <div
                    key={stl.id}
                    onClick={() => setFormState({ ...formState, style: stl.label })}
                    className={`p-4 sm:p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                        : 'bg-white border-taupe-200 hover:border-taupe-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-charcoal-900 text-base">{stl.label}</span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-charcoal-900 text-white' : 'border border-taupe-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-500 leading-relaxed">{stl.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 5: SEASON */}
          {currentStep === 5 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {stylistStepOptions.seasons.map((seas) => {
                const isSelected = formState.season === seas.label;
                return (
                  <div
                    key={seas.id}
                    onClick={() => setFormState({ ...formState, season: seas.label })}
                    className={`p-5 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                        : 'bg-white border-taupe-200 hover:border-taupe-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-charcoal-900 text-base">{seas.label}</span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        isSelected ? 'bg-charcoal-900 text-white' : 'border border-taupe-300'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-xs text-charcoal-500 leading-relaxed">{seas.description}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* STEP 6: BUDGET */}
          {currentStep === 6 && (
            <div className="max-w-md mx-auto space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-taupe-100 mx-auto flex items-center justify-center text-charcoal-800">
                <IndianRupee className="w-8 h-8 stroke-[1.5]" />
              </div>
              <div>
                <label htmlFor="budget-input" className="block text-sm font-semibold text-charcoal-800 mb-2">
                  Optional Purchase Budget
                </label>
                <div className="relative max-w-xs mx-auto">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-charcoal-500 text-lg font-semibold">
                    ₹
                  </span>
                  <input
                    id="budget-input"
                    type="number"
                    placeholder="e.g. 2000"
                    value={formState.budget}
                    onChange={(e) => setFormState({ ...formState, budget: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 text-lg font-semibold text-charcoal-900 bg-white border border-taupe-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-charcoal-900 focus:border-transparent text-center"
                  />
                </div>
                <p className="text-xs text-charcoal-500 mt-2">
                  Remember: Fashion VISTA prioritizes your existing wardrobe. You only buy if a critical layer is missing.
                </p>
              </div>

              {/* Summary of selections */}
              <div className="p-4 bg-[#FAF8F5] rounded-xl border border-taupe-200 text-left text-xs space-y-1.5">
                <div className="font-semibold text-charcoal-700 uppercase tracking-wider text-[10px] mb-2">
                  Summary of Selections
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Occasion:</span>
                  <span className="font-medium text-charcoal-900">{formState.occasion}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Type:</span>
                  <span className="font-medium text-charcoal-900">{formState.outfitType}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Colour:</span>
                  <span className="font-medium text-charcoal-900">{formState.colour}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Style:</span>
                  <span className="font-medium text-charcoal-900">{formState.style}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Season:</span>
                  <span className="font-medium text-charcoal-900">{formState.season}</span>
                </div>
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
            disabled={currentStep === 1}
            iconLeft={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Continue →
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleGenerate}
              disabled={isGenerating}
              iconLeft={<Sparkles className="w-4 h-4" />}
            >
              {isGenerating ? "Analyzing Wardrobe..." : "Generate My Outfit →"}
            </Button>
          )}
        </div>

      </div>

    </div>
  );
};

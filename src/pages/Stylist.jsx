import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Sparkles, Check } from 'lucide-react';
import { useFashion } from '../context/FashionContext';
import { stylistStepOptions } from '../data/outfitData';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';

export const Stylist = () => {
  const navigate = useNavigate();
  const { preferences, generateRecommendation } = useFashion();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Local state strictly taking occasion and colour
  const [formState, setFormState] = useState({
    occasion: preferences.occasion || 'Wedding',
    colour: preferences.colour || 'Red'
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const stepTitles = [
    { title: "Occasion Type", subtitle: "Where are you heading? Select your occasion." },
    { title: "Preferred Colour", subtitle: "Select your preferred color theme or let AI choose." }
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
      const fullPrefs = {
        occasion: occ,
        colour: col,
        style: occ === 'Wedding' || occ === 'Traditional' ? 'Traditional' : occ === 'Office' ? 'Formal' : 'Casual',
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
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                  Ready to generate all matching outfits
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

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleNext}
              iconRight={<ArrowRight className="w-4 h-4" />}
            >
              Continue to Colour →
            </Button>
          ) : (
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
              Evaluating color harmonies, silhouette balance, and matching 25,000+ fashion catalog pieces against your digital wardrobe...
            </p>
            <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-charcoal-400 border-t border-taupe-100">
              <span>Slot Completeness</span>
              <span>•</span>
              <span>Color Harmony</span>
              <span>•</span>
              <span>Closet Synergy</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

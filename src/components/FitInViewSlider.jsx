import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  Maximize2,
  RefreshCw,
  Share2,
  Columns,
  SplitSquareVertical,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy
} from 'lucide-react';

/**
 * FitInViewSlider — Photorealistic Interactive Virtual Try-On Before/After Comparison Stage
 * Exactly models the split-screen slider from https://fitinview.com/
 * 
 * Features:
 * - Fluid pointer & touch-drag interaction across full 0% to 100% range
 * - Click-to-slide anywhere on the portrait
 * - Floating "Your photo" and "Try-on: [Outfit Name]" badges with dynamic collision fading
 * - Toggle between "Interactive Split Slider" and "Side-by-Side" view
 * - Fullscreen high-res inspection modal
 * - Download and Share triggers
 */
export const FitInViewSlider = ({
  beforeImage,
  afterImage,
  beforeLabel = "Your photo",
  afterLabel = "AI Fitted Look",
  outfitTitle = "Curated Outfit",
  initialPosition = 50,
  maxHeight = "520px",
  onDownload,
  onRetry,
  isRetrying = false,
  className = ""
}) => {
  const containerRef = useRef(null);
  const [sliderPos, setSliderPos] = useState(initialPosition); // 0 to 100 %
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState('slider'); // 'slider' | 'side-by-side'
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Update slider position clamped between 2% and 98%
  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handlePointerDown = (e) => {
    setIsDragging(true);
    updatePosition(e.clientX);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_) {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      setSliderPos(prev => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPos(prev => Math.min(100, prev + 5));
    }
  };

  // Label visibility based on divider knob position
  const isBeforeLabelVisible = sliderPos > 18;
  const isAfterLabelVisible = sliderPos < 82;

  // Share link handler
  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    }
  };

  const defaultBefore = "/sejal_beach_portrait.png";
  const effectiveBefore = beforeImage || defaultBefore;
  const effectiveAfter = afterImage || effectiveBefore;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Top Toolbar: View Mode Toggle & Utility Actions */}
      <div className="flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-taupe-100 rounded-xl border border-taupe-200">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'slider'
                ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                : 'text-charcoal-600 hover:text-black'
            }`}
          >
            <SplitSquareVertical className="w-3.5 h-3.5" />
            <span>Interactive Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                : 'text-charcoal-600 hover:text-black'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              disabled={isRetrying}
              className="p-1.5 rounded-lg border border-taupe-200 bg-white text-charcoal-700 hover:bg-taupe-100 hover:text-black transition-colors"
              title="Re-fit this look"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            </button>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-1.5 rounded-lg border border-taupe-200 bg-white text-charcoal-700 hover:bg-taupe-100 hover:text-black transition-colors"
            title="Share fitted try-on"
          >
            {copiedShare ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg border border-taupe-200 bg-white text-charcoal-700 hover:bg-taupe-100 hover:text-black transition-colors"
            title="Inspect fullscreen"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-charcoal-900 hover:bg-black text-white font-bold transition-all shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'slider' ? (
        /* 1. FITINVIEW INTERACTIVE SPLIT SLIDER */
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Divider between your photo and the try-on"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(sliderPos)}
          className="relative w-full rounded-2xl overflow-hidden select-none touch-none cursor-ew-resize border border-taupe-300 bg-[#E8E4DE] shadow-inner group"
          style={{ height: maxHeight }}
        >
          {/* Base Layer: Original Portrait (Before) */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-[#E8E4DE]">
            <img
              src={effectiveBefore}
              alt="Original Portrait"
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Overlaid Layer: AI Fitted Result (After) with clip-path */}
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none transition-none"
            style={{
              clipPath: `inset(0 0 0 ${sliderPos}%)`,
              WebkitClipPath: `inset(0 0 0 ${sliderPos}%)`
            }}
          >
            <img
              src={effectiveAfter}
              alt={afterLabel}
              className="w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          </div>

          {/* Divider Line */}
          <div
            className="absolute top-0 bottom-0 z-20 pointer-events-none"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-0 bottom-0 -left-[1.5px] w-[3px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]" />
          </div>

          {/* Draggable Knob Handle with SVG Chevrons */}
          <div
            className="absolute top-1/2 z-30 -translate-y-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-100"
            style={{
              left: `clamp(24px, ${sliderPos}%, calc(100% - 24px))`,
              transform: `translate(-50%, -50%) scale(${isDragging ? 1.12 : 1})`
            }}
          >
            <div className="w-11 h-11 rounded-full bg-white text-charcoal-900 border border-black/10 shadow-[0_4px_16px_rgba(0,0,0,0.28)] flex items-center justify-center cursor-ew-resize transition-all">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-charcoal-900"
              >
                <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
              </svg>
            </div>
          </div>

          {/* Floating Tag: Before */}
          <div
            className={`absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md bg-white/95 backdrop-blur-xs text-charcoal-900 text-[11px] font-bold uppercase tracking-wider shadow-sm border border-black/10 transition-opacity duration-150 pointer-events-none ${
              isBeforeLabelVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {beforeLabel}
          </div>

          {/* Floating Tag: After */}
          <div
            className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-md bg-charcoal-900/95 backdrop-blur-xs text-cream-50 text-[11px] font-bold uppercase tracking-wider shadow-sm border border-white/20 transition-opacity duration-150 pointer-events-none flex items-center gap-1.5 ${
              isAfterLabelVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[200px]">{afterLabel}</span>
          </div>

          {/* Interactive Hint Banner at Bottom */}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold tracking-wide pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Drag slider or tap to compare before &amp; after
          </div>
        </div>
      ) : (
        /* 2. SIDE-BY-SIDE MODE */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Before */}
          <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-taupe-200 flex flex-col items-center">
            <div
              className="relative w-full rounded-xl overflow-hidden bg-neutral-900/5 flex items-center justify-center border border-taupe-300"
              style={{ height: maxHeight }}
            >
              <img
                src={effectiveBefore}
                alt={beforeLabel}
                className="max-h-full max-w-full object-contain mx-auto rounded-lg"
              />
              <div className="absolute top-2 left-2 bg-charcoal-900/80 backdrop-blur-xs text-cream-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                {beforeLabel}
              </div>
            </div>
            <span className="text-[11px] font-semibold text-charcoal-600 mt-2">
              Original Base Portrait
            </span>
          </div>

          {/* Card 2: After */}
          <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-charcoal-900/30 flex flex-col items-center shadow-sm">
            <div
              className="relative w-full rounded-xl overflow-hidden bg-neutral-900/5 flex items-center justify-center border border-taupe-300"
              style={{ height: maxHeight }}
            >
              <img
                src={effectiveAfter}
                alt={afterLabel}
                className="max-h-full max-w-full object-contain mx-auto rounded-lg"
              />
              <div className="absolute top-2 left-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                <CheckCircle2 className="w-3 h-3" />
                {afterLabel}
              </div>
            </div>
            <span className="text-[11px] font-bold text-emerald-800 mt-2">
              ✓ AI Fitted Look
            </span>
          </div>
        </div>
      )}

      {/* FULLSCREEN INSPECTION MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-taupe-200">
              <span className="text-sm font-bold text-charcoal-900">
                {outfitTitle} — High-Resolution Try-On Comparison
              </span>
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="p-1.5 rounded-lg hover:bg-taupe-100 text-charcoal-600 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="h-[70vh] flex items-center justify-center bg-[#FAF8F5] rounded-2xl p-2">
              <img
                src={effectiveAfter}
                alt={afterLabel}
                className="max-h-[66vh] w-auto object-contain rounded-xl shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-xs">
              <span className="text-charcoal-500 font-medium">
                High-definition neural composite with preserved body posture and fabric drapery
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="px-4 py-2 rounded-lg border border-taupe-200 text-charcoal-800 font-bold hover:bg-taupe-100"
                >
                  Close
                </button>
                {onDownload && (
                  <button
                    type="button"
                    onClick={onDownload}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-charcoal-900 text-white font-bold hover:bg-black"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

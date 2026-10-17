import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  RefreshCw,
  Download,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Maximize2,
  X,
  CreditCard,
  ShieldCheck,
  ShoppingBag,
  Sliders,
  Check
} from 'lucide-react';
import {
  getFitInViewAccount,
  startFitInViewBatchTryOn,
  getFitInViewBatchStatus,
  retryFitInViewJob
} from '../services/api';
import { Button } from './Button';
import { Badge } from './Badge';

export const FitInViewTryOnPipeline = ({
  userPhoto,
  onUpdateUserPhoto,
  preferences = {},
  recommendations = [],
  onNavigateStylist
}) => {
  const fileInputRef = useRef(null);
  const [accountInfo, setAccountInfo] = useState(null);
  const [batchId, setBatchId] = useState(null);
  const [batchStatus, setBatchStatus] = useState('idle'); // 'idle' | 'dispatching' | 'processing' | 'completed' | 'error'
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchResults, setBatchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [selectedOutfitModal, setSelectedOutfitModal] = useState(null);
  const [isRetrying, setIsRetrying] = useState({});
  const [activeTab, setActiveTab] = useState(0); // 0 to recommendations.length - 1

  // 1. Fetch FitInView account and credit status
  useEffect(() => {
    let isMounted = true;
    async function loadAccount() {
      try {
        const info = await getFitInViewAccount();
        if (isMounted) {
          setAccountInfo(info);
        }
      } catch (err) {
        console.warn('Failed to load FitInView account:', err);
      }
    }
    loadAccount();
    return () => { isMounted = false; };
  }, []);

  // 2. Automated batch trigger when recommendations and photo are ready
  useEffect(() => {
    if (!userPhoto || !recommendations || recommendations.length === 0) return;

    let isMounted = true;
    let pollInterval = null;

    async function dispatchBatch() {
      try {
        setBatchStatus('dispatching');
        setBatchProgress(10);
        setErrorMessage(null);

        const payload = {
          user_photo: userPhoto,
          preferences,
          recommendations: recommendations.slice(0, 3),
          output_size: '1K'
        };

        const dispatchRes = await startFitInViewBatchTryOn(payload);
        if (!isMounted) return;

        if (dispatchRes.success && dispatchRes.batch_id) {
          const currentBatchId = dispatchRes.batch_id;
          setBatchId(currentBatchId);
          setBatchStatus('processing');

          // Initialize pending results
          if (Array.isArray(dispatchRes.jobs)) {
            setBatchResults(dispatchRes.jobs);
          }

          // Start polling batch status
          pollInterval = setInterval(async () => {
            try {
              const statusData = await getFitInViewBatchStatus(currentBatchId);
              if (!isMounted) return;

              if (statusData && statusData.batch_id) {
                setBatchProgress(statusData.progress_percent || 0);
                if (Array.isArray(statusData.results)) {
                  setBatchResults(statusData.results);
                }

                if (statusData.status === 'completed' || statusData.status === 'failed') {
                  setBatchStatus(statusData.status === 'completed' ? 'completed' : 'error');
                  clearInterval(pollInterval);
                }
              }
            } catch (err) {
              console.warn('Polling FitInView batch error:', err);
            }
          }, 2000);
        } else {
          setBatchStatus('error');
          setErrorMessage(dispatchRes.error || 'Failed to dispatch batch try-on');
        }
      } catch (err) {
        if (!isMounted) return;
        setBatchStatus('error');
        setErrorMessage(err.message || 'An error occurred during batch try-on');
      }
    }

    dispatchBatch();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [userPhoto, recommendations]);

  // Handle Retry for a single job
  const handleRetryJob = async (jobId) => {
    if (!batchId || !jobId) return;
    setIsRetrying(prev => ({ ...prev, [jobId]: true }));
    try {
      const res = await retryFitInViewJob(batchId, jobId, userPhoto);
      if (res && res.success) {
        // Optimistically update status to running
        setBatchResults(prev => prev.map(job => (
          job.job_id === jobId ? { ...job, status: 'running', error: null } : job
        )));
      }
    } catch (err) {
      console.warn('Retry error:', err);
    } finally {
      setIsRetrying(prev => ({ ...prev, [jobId]: false }));
    }
  };

  // Download high-resolution try-on image
  const handleDownloadImage = (imageSrc, outfitName) => {
    if (!imageSrc) return;
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `FashionVISTA_${(outfitName || 'TryOn').replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Safe preferences
  const occasion = preferences.occasion || 'Wedding';
  const colour = preferences.colour || 'Red';
  const style = preferences.style || 'Traditional';

  const currentOutfit = recommendations[activeTab] || null;

  // Resolve batch result robustly by outfit_id, job_id, or array index
  const currentResult = (Array.isArray(batchResults) && (
    batchResults.find((r, i) =>
      (r?.outfit_id && currentOutfit?.id && r.outfit_id === currentOutfit.id) ||
      r?.job_id === `job_${batchId}_${activeTab + 1}` ||
      i === activeTab
    ) || batchResults[activeTab]
  )) || null;

  // Effective try-on image supporting both result_url and result_image plus outfit fallbacks
  const fittedImage = currentResult?.result_url ||
    currentResult?.result_image ||
    currentOutfit?.user_tryon_image ||
    currentOutfit?.tryonImage ||
    null;

  const isFitted = Boolean(
    currentResult?.status === 'succeeded' ||
    Boolean(fittedImage)
  );

  return (
    <div className="space-y-8">
      {/* 5-Step Process Tracker */}
      <div className="bg-white rounded-2xl p-5 border border-taupe-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-taupe-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="editorial-heading text-lg font-bold text-charcoal-900 tracking-wide uppercase">
              End-to-End Automated Pipeline
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-charcoal-500">
              Provider:
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-charcoal-900 text-cream-50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              {accountInfo?.is_live ? 'FitInView Cloud' : 'FitInView Engine'}
            </span>
            {accountInfo?.credits_balance !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-300">
                <CreditCard className="w-3 h-3" />
                {accountInfo.credits_balance} Credits Available
              </span>
            )}
          </div>
        </div>

        {/* 5 Step Icons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-taupe-200 shrink-0 border border-taupe-300">
              <img src={userPhoto} alt="User" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-emerald-600/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-700 stroke-[3]" />
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Step 1
              </span>
              <span className="text-xs font-bold text-charcoal-900 truncate block">
                Your Photo
              </span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] text-charcoal-500 hover:text-black underline font-semibold mt-0.5 block"
              >
                Change Photo
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={onUpdateUserPhoto}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-300">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Step 2
              </span>
              <span className="text-xs font-bold text-charcoal-900 truncate block">
                Preferences
              </span>
              <span className="text-[10px] text-charcoal-600 truncate block">
                {occasion} • {colour}
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-taupe-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 border border-emerald-300">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Step 3
              </span>
              <span className="text-xs font-bold text-charcoal-900 truncate block">
                AI Recommend
              </span>
              <span className="text-[10px] text-charcoal-600 truncate block">
                {recommendations.length} Myntra Outfits
              </span>
            </div>
          </div>

          {/* Step 4 */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            batchStatus === 'completed'
              ? 'bg-[#FAF8F5] border-taupe-200'
              : 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
          }`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
              batchStatus === 'completed'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300 animate-spin'
            }`}>
              {batchStatus === 'completed' ? (
                <Check className="w-5 h-5 stroke-[2.5]" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400 block">
                Step 4
              </span>
              <span className="text-xs font-bold text-charcoal-900 truncate block">
                Batch Try-On
              </span>
              <span className="text-[10px] text-charcoal-600 truncate block">
                {batchStatus === 'completed' ? 'All Fitted' : `${batchProgress}% Processed`}
              </span>
            </div>
          </div>

          {/* Step 5 */}
          <div className="p-3 rounded-xl bg-charcoal-900 text-cream-50 flex items-center gap-3 shadow-sm col-span-2 sm:col-span-1">
            <div className="w-10 h-10 rounded-lg bg-cream-50/10 text-cream-50 flex items-center justify-center shrink-0 border border-white/20">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cream-200 block">
                Step 5
              </span>
              <span className="text-xs font-bold text-white truncate block">
                Try-On Gallery
              </span>
              <span className="text-[10px] text-cream-200 truncate block">
                Interactive Results
              </span>
            </div>
          </div>
        </div>

        {/* Live Batch Progress Bar (if processing) */}
        {batchStatus === 'processing' && (
          <div className="mt-4 pt-4 border-t border-taupe-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-charcoal-700 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-charcoal-900" />
                FitInView AI Virtual Try-On in Progress...
              </span>
              <span className="font-bold text-charcoal-900">
                {batchProgress}% Completed
              </span>
            </div>
            <div className="w-full h-2 bg-taupe-100 rounded-full overflow-hidden border border-taupe-200">
              <div
                className="h-full bg-charcoal-900 transition-all duration-500 rounded-full"
                style={{ width: `${Math.max(5, batchProgress)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-charcoal-500">
              <span>Concurrency limited to 2 workers to respect 20 req/min rate limit</span>
              <span>Estimated Cost: {recommendations.slice(0, 3).length * 8} Credits</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Showcase: Try-On Gallery for All Recommended Outfits */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-taupe-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-900 text-cream-50 text-[10px] font-bold uppercase tracking-widest mb-1">
              <Sparkles className="w-3 h-3 text-cream-200" />
              FitInView Virtual Try-On Gallery
            </div>
            <h3 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
              Automated AI Try-On on Your Portrait
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-600 mt-0.5">
              Top outfits automatically selected by your recommendation model and fitted by FitInView.
            </p>
          </div>

          {/* Outfit Switcher Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-taupe-100 rounded-xl shrink-0 overflow-x-auto">
            {recommendations.slice(0, 3).map((rec, idx) => {
              const res = (Array.isArray(batchResults) && (
                batchResults.find((r, i) =>
                  (r?.outfit_id && rec?.id && r.outfit_id === rec.id) ||
                  r?.job_id === `job_${batchId}_${idx + 1}` ||
                  i === idx
                ) || batchResults[idx]
              )) || null;
              const isFinished = res?.status === 'succeeded' || Boolean(res?.result_url || res?.result_image || rec?.user_tryon_image);
              const isErr = res?.status === 'failed' && !isFinished;
              return (
                <button
                  key={rec.id || idx}
                  onClick={() => setActiveTab(idx)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === idx
                      ? 'bg-charcoal-900 text-cream-50 shadow-sm'
                      : 'text-charcoal-600 hover:text-black'
                  }`}
                >
                  <span>Look 0{idx + 1}</span>
                  {isFinished && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {isErr && <AlertCircle className="w-3 h-3 text-amber-400" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Look Display */}
        {currentOutfit && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Side-by-Side Photo & Try-On Showcase */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 1. Original User Portrait */}
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-taupe-200 flex flex-col items-center">
                  <div className="relative w-full h-[380px] rounded-xl overflow-hidden bg-neutral-900/5 flex items-center justify-center border border-taupe-300">
                    <img
                      src={userPhoto}
                      alt="Your Portrait"
                      className="max-h-full max-w-full object-contain mx-auto rounded-lg"
                    />
                    <div className="absolute top-2 left-2 bg-charcoal-900/80 backdrop-blur-xs text-cream-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      Your Photo
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-charcoal-600 mt-2">
                    Original Base Portrait
                  </span>
                </div>

                {/* 2. Fitted Try-On Result */}
                <div className="bg-[#FAF8F5] rounded-2xl p-3 border border-charcoal-900/30 flex flex-col items-center shadow-sm">
                  <div className="relative w-full h-[380px] rounded-xl overflow-hidden bg-neutral-900/5 flex items-center justify-center border border-taupe-300 group">
                    {currentResult?.status === 'running' ? (
                      <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-charcoal-800" />
                        <span className="text-xs font-bold text-charcoal-800">
                          Fitting Look 0{activeTab + 1}...
                        </span>
                        <span className="text-[11px] text-charcoal-500">
                          Adapting neckline, waistline, and drapery
                        </span>
                      </div>
                    ) : currentResult?.status === 'failed' && !fittedImage ? (
                      <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-amber-600" />
                        <span className="text-xs font-bold text-charcoal-800">
                          Try-On Incomplete
                        </span>
                        <span className="text-[11px] text-charcoal-500">
                          {currentResult.error || 'Garment fitting timed out'}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleRetryJob(currentResult.job_id)}
                          loading={isRetrying[currentResult?.job_id]}
                        >
                          Retry Look
                        </Button>
                      </div>
                    ) : fittedImage ? (
                      <>
                        <img
                          src={fittedImage}
                          alt="Fitted Try-On"
                          className="max-h-full max-w-full object-contain mx-auto rounded-lg"
                        />
                        <div className="absolute top-2 left-2 bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          Fitted Result
                        </div>
                        <button
                          onClick={() => setSelectedOutfitModal({
                            image: fittedImage,
                            title: currentOutfit.name
                          })}
                          className="absolute bottom-2 right-2 bg-charcoal-900/80 hover:bg-black text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <Clock className="w-6 h-6 text-charcoal-400" />
                        <span className="text-xs font-semibold text-charcoal-600">
                          Queued in Batch
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for Try-On Image */}
                  <div className="w-full flex items-center justify-between gap-2 mt-2 pt-1 border-t border-taupe-200">
                    <span className="text-[11px] font-bold text-emerald-800">
                      {isFitted ? '✓ AI Fitted Look' : (currentResult?.status === 'running' ? 'Fitting in progress...' : 'Queued in Batch')}
                    </span>
                    {fittedImage && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownloadImage(fittedImage, currentOutfit.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white border border-taupe-300 text-charcoal-800 hover:bg-taupe-100 transition-colors shadow-2xs"
                          title="Download PNG result"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button
                          onClick={() => handleRetryJob(currentResult?.job_id)}
                          disabled={isRetrying[currentResult?.job_id]}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-charcoal-600 hover:text-black border border-taupe-200 hover:bg-white transition-colors"
                          title="Re-run this outfit try-on"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRetrying[currentResult?.job_id] ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Right Column: Matched Myntra Product Details & Buy Links */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">
                  Look 0{activeTab + 1} Blueprint Details
                </span>
                <h4 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                  {currentOutfit.name}
                </h4>
                <p className="text-xs sm:text-sm text-charcoal-600">
                  {currentOutfit.subtitle || currentOutfit.description || 'Personalized ensemble recommendation.'}
                </p>
              </div>

              {/* Garments List with Real Myntra Info */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-widest text-charcoal-500 block">
                  Garments in This Outfit:
                </span>
                {(currentOutfit.items || []).filter(Boolean).map((item, iIdx) => {
                  const isOwned = item.inWardrobe;
                  const buyLink = item.buy_link || item.buy_url || `https://www.myntra.com/${encodeURIComponent(item.name || '').replace(/%20/g, '-')}`;

                  return (
                    <div
                      key={item.id || iIdx}
                      className="p-3.5 rounded-xl border border-taupe-200 bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image && (
                          <div className="w-12 h-14 rounded-lg overflow-hidden bg-white border border-taupe-200 shrink-0">
                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500 block">
                            {item.slot || item.category || 'Piece'}
                          </span>
                          <span className="font-bold text-charcoal-900 truncate block">
                            {item.name}
                          </span>
                          <span className="text-[11px] font-semibold text-charcoal-600 block">
                            ₹{item.price || 999} • {item.colour}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isOwned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check className="w-3 h-3 stroke-[3]" />
                            In Closet
                          </span>
                        ) : (
                          <a
                            href={buyLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                          >
                            Buy on Myntra
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Preference Context Badge */}
              <div className="p-3.5 rounded-xl bg-taupe-100 border border-taupe-200 text-xs text-charcoal-700 space-y-1">
                <span className="font-bold text-charcoal-900 block">
                  Curation Logic:
                </span>
                <p className="text-[11px] leading-relaxed text-charcoal-600">
                  Recommended automatically based on your requested occasion (<strong className="text-charcoal-900">{occasion}</strong>), color theme (<strong className="text-charcoal-900">{colour}</strong>), and silhouette preference (<strong className="text-charcoal-900">{style}</strong>).
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Fullscreen Image Inspection Modal */}
      {selectedOutfitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-taupe-200">
              <span className="text-sm font-bold text-charcoal-900">
                {selectedOutfitModal.title} — High-Res Virtual Try-On
              </span>
              <button
                onClick={() => setSelectedOutfitModal(null)}
                className="p-1 rounded-lg hover:bg-taupe-100 text-charcoal-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-[#FAF8F5] rounded-2xl p-2">
              <img
                src={selectedOutfitModal.image}
                alt="Enlarged Try-On"
                className="max-h-[70vh] w-auto object-contain rounded-xl"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedOutfitModal(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                iconLeft={<Download className="w-4 h-4" />}
                onClick={() => handleDownloadImage(selectedOutfitModal.image, selectedOutfitModal.title)}
              >
                Download Image
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

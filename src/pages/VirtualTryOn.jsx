import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Sparkles,
  ArrowRight,
  User,
  Shirt,
  Cpu,
  Camera,
  CheckCircle2,
  RefreshCw,
  Download,
  Bookmark,
  AlertCircle,
  Eye,
  SlidersHorizontal,
  Layers,
  Upload,
  Check,
  RotateCcw
} from 'lucide-react';
import { requestVirtualTryOn, requestOutfitTryOn, getVTOStatus } from '../services/api';


export const VirtualTryOn = () => {
  const navigate = useNavigate();
  const {
    userPhoto,
    setUserPhoto,
    currentRecommendation,
    wardrobe,
    tryOnResult,
    setTryOnResult,
    customGarmentPhoto,
    setCustomGarmentPhoto,
    customGarmentName,
    setCustomGarmentName,
    saveTryOnToHistory,
    showToast
  } = useFashion();

  // Curated look items covering Topwear, Bottomwear, and Saree
  const curatedLooksPool = [
    // Topwear
    { name: "Silk Crepe Blouse", category: "Topwear", slot: "Topwear", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80" },
    { name: "Ivory Tailored Blazer", category: "Topwear", slot: "Topwear", image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=700&q=80" },
    { name: "Emerald Ribbed Knit Top", category: "Topwear", slot: "Topwear", image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80" },
    // Bottomwear
    { name: "Classic Indigo Denim Jeans", category: "Bottomwear", slot: "Bottomwear", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80" },
    { name: "High-Rise Wide Leg Trousers", category: "Bottomwear", slot: "Bottomwear", image: "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=700&q=80" },
    { name: "Pleated A-Line Midi Skirt", category: "Bottomwear", slot: "Bottomwear", image: "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=700&q=80" },
    // Saree & Ethnic
    { name: "Multicolor Embroidered Saree", category: "Saree", slot: "Saree", image: "/garment_cloth1_multicolor_saree.png" },
    { name: "Crimson Red Bridal Saree", category: "Saree", slot: "Saree", image: "/garment_cloth2_red_saree.png" },
    { name: "Olive Green Flared Anarkali", category: "Saree", slot: "Saree", image: "/garment_cloth3_green_anarkali.png" },
    { name: "Hot Pink Embroidered Gown", category: "Saree", slot: "Saree", image: "/garment_cloth4_pink_gown.png" },
    { name: "Royal Blue Satin Saree", category: "Saree", slot: "Saree", image: "/royal_blue_saree.jpg" },
    { name: "Royal Banarasi Silk Saree", category: "Saree", slot: "Saree", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80" },
    { name: "Floral Chiffon Draped Saree", category: "Saree", slot: "Saree", image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=80" },
    { name: "Embroidered Festive Lehenga", category: "Saree", slot: "Saree", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=700&q=80" }
  ];

  // Outfit items from recommendation merged with curated look pool
  const outfitItems = currentRecommendation?.items && currentRecommendation.items.length > 0
    ? [...currentRecommendation.items, ...curatedLooksPool.filter(c => !currentRecommendation.items.some(i => i.name === c.name))]
    : curatedLooksPool;

  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' | 'topwear' | 'bottomwear' | 'saree'
  const [customGarmentCategory, setCustomGarmentCategory] = useState('Topwear');

  const matchesCategory = (item, catFilter) => {
    if (catFilter === 'all') return true;
    const itemCat = (item.slot || item.category || item.name || '').toLowerCase();
    if (catFilter === 'topwear') {
      return itemCat.includes('top') || itemCat.includes('shirt') || itemCat.includes('tee') || itemCat.includes('blouse') || itemCat.includes('blazer') || itemCat.includes('jacket');
    }
    if (catFilter === 'bottomwear') {
      return itemCat.includes('bottom') || itemCat.includes('pant') || itemCat.includes('jean') || itemCat.includes('skirt') || itemCat.includes('trouser') || itemCat.includes('lower');
    }
    if (catFilter === 'saree') {
      return itemCat.includes('saree') || itemCat.includes('sari') || itemCat.includes('lehenga') || itemCat.includes('anarkali') || itemCat.includes('dress') || itemCat.includes('ethnic');
    }
    return true;
  };

  const tryableRecommendationItems = outfitItems.filter(item => {
    const slot = (item.slot || item.category || '').toLowerCase();
    const isTryable = slot.includes('top') || slot.includes('bottom') || slot.includes('pant') || slot.includes('jean') || slot.includes('dress') || slot.includes('layer') || slot.includes('saree') || slot.includes('kurti');
    return isTryable && matchesCategory(item, selectedCategory);
  });

  const tryableWardrobeItems = (wardrobe || []).filter(item => {
    const cat = (item.category || item.slot || '').toLowerCase();
    const isTryable = cat.includes('top') || cat.includes('bottom') || cat.includes('pant') || cat.includes('jean') || cat.includes('dress') || cat.includes('layer') || cat.includes('saree') || cat.includes('kurti');
    return isTryable && matchesCategory(item, selectedCategory);
  });

  // Default custom garment fallback
  const initialCustomGarmentImg = customGarmentPhoto || null;
  const initialCustomGarmentTitle = customGarmentName || "Custom Garment";

  // Selected garment to try on
  const [selectedGarment, setSelectedGarment] = useState(() => {
    if (initialCustomGarmentImg) {
      return {
        name: initialCustomGarmentTitle,
        category: customGarmentCategory || "Topwear",
        slot: customGarmentCategory || "Topwear",
        image: initialCustomGarmentImg,
        isCustom: true
      };
    }
    if (tryableRecommendationItems.length > 0) return tryableRecommendationItems[0];
    if (tryableWardrobeItems.length > 0) return tryableWardrobeItems[0];
    return outfitItems[0] || null;
  });

  // Source tab for garment selection: 'mixed_outfit' | 'recommendation' | 'wardrobe' | 'custom'
  const [garmentSourceTab, setGarmentSourceTab] = useState(() => {
    if (initialCustomGarmentImg) return 'custom';
    if (currentRecommendation?.items?.length > 0) return 'mixed_outfit';
    return 'recommendation';
  });
  const [customGarmentImage, setCustomGarmentImage] = useState(initialCustomGarmentImg);
  const [customGarmentTitle, setCustomGarmentTitle] = useState(initialCustomGarmentTitle);


  // VTO Engine status
  const [vtoStatus, setVtoStatus] = useState({ status: 'checking', message: 'Checking AI engine...' });

  // Try-on execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [viewMode, setViewMode] = useState('tryon'); // 'tryon' | 'original'
  const [hasSavedHistory, setHasSavedHistory] = useState(false);

  // Hidden file inputs
  const photoFileInputRef = useRef(null);
  const garmentFileInputRef = useRef(null);

  const processingSteps = [
    { title: "Calibrating Inputs", detail: "Validating user posture resolution and garment silhouette" },
    { title: "DensePose & Human Parsing", detail: "Extracting 3D surface coordinates and garment category alignment" },
    { title: "Generative UNet Inpainting", detail: "Running IDM-VTON diffusion denoising with IP-Adapter visual conditioning" },
    { title: "High-Resolution Synthesis", detail: "Synthesizing authentic fabric folds, drape, and identity preservation (768×1024)" }
  ];

  // Fetch engine status on mount
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const res = await getVTOStatus();
        if (isMounted) {
          setVtoStatus(res);
        }
      } catch (err) {
        if (isMounted) {
          setVtoStatus({ status: 'offline', message: 'AI Engine offline' });
        }
      }
    };
    checkStatus();
    return () => { isMounted = false; };
  }, []);

  // Update selected garment if recommendation changes and none is selected
  useEffect(() => {
    if (!selectedGarment && tryableRecommendationItems.length > 0) {
      setSelectedGarment(tryableRecommendationItems[0]);
    }
  }, [currentRecommendation]);

  // Handle User Photo upload directly
  const handleUserPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("Photo must be less than 10MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setUserPhoto(dataUrl);
        showToast("New portrait photo loaded!", "success");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Quick selection helpers
  const handleSelectFlannelPortrait = () => {
    setUserPhoto("/user_portrait.png");
    showToast("Selected First Photo (Flannel Shirt Portrait) 👤", "success");
  };

  const handleSelectUploadedGreenTshirt = () => {
    const greenObj = {
      name: "Lime Green T-Shirt",
      category: "Top",
      slot: "Top",
      image: "/green_tshirt.png",
      isCustom: true
    };
    setCustomGarmentImage("/green_tshirt.png");
    setCustomGarmentTitle("Lime Green T-Shirt");
    setCustomGarmentPhoto("/green_tshirt.png");
    setCustomGarmentName("Lime Green T-Shirt");
    setSelectedGarment(greenObj);
    setGarmentSourceTab('custom');
    showToast("Selected Sample Lime Green T-Shirt! 👕", "success");
  };

  // Handle Custom Garment upload
  const handleCustomGarmentUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
    const lowerName = cleanName.toLowerCase();

    // Auto-detect category from file name or retain active category
    let detectedCat = customGarmentCategory;
    if (lowerName.includes('pant') || lowerName.includes('jean') || lowerName.includes('skirt') || lowerName.includes('trouser') || lowerName.includes('bottom')) {
      detectedCat = 'Bottomwear';
    } else if (lowerName.includes('saree') || lowerName.includes('sari') || lowerName.includes('lehenga') || lowerName.includes('anarkali') || lowerName.includes('dress')) {
      detectedCat = 'Saree';
    } else if (lowerName.includes('top') || lowerName.includes('shirt') || lowerName.includes('tee') || lowerName.includes('blouse') || lowerName.includes('jacket')) {
      detectedCat = 'Topwear';
    }
    setCustomGarmentCategory(detectedCat);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        const customObj = {
          name: cleanName || "Uploaded Cloth",
          category: detectedCat,
          slot: detectedCat,
          image: dataUrl,
          isCustom: true
        };
        setCustomGarmentImage(dataUrl);
        setCustomGarmentTitle(customObj.name);
        setCustomGarmentPhoto(dataUrl);
        setCustomGarmentName(customObj.name);
        setSelectedGarment(customObj);
        setGarmentSourceTab('custom');
        showToast(`"${customObj.name}" set as active ${detectedCat}! ✨`, "success");
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Execute Real Virtual Try-On
  const handleExecuteTryOn = async () => {
    if (!userPhoto) {
      showToast("Please provide or upload a user portrait photo first.", "error");
      return;
    }

    const garmentImg = selectedGarment?.image || customGarmentImage || customGarmentPhoto;
    if (!garmentImg) {
      showToast("Please select or upload a garment to try on.", "error");
      return;
    }

    const activeGarmentName = selectedGarment?.name || customGarmentTitle || customGarmentName || 'Garment';

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(0);
    setHasSavedHistory(false);

    // Step progression timer simulation for informative user feedback
    const stepTimer1 = setTimeout(() => setCurrentStep(1), 400);
    const stepTimer2 = setTimeout(() => setCurrentStep(2), 900);
    const stepTimer3 = setTimeout(() => setCurrentStep(3), 1400);

    try {
      const activeCategory = selectedGarment?.category || selectedGarment?.slot || customGarmentCategory || 'Topwear';
      const payload = {
        person_image: userPhoto,
        garment_image: garmentImg,
        category: activeCategory.toLowerCase(),
        garment_category: activeCategory,
        garment_name: activeGarmentName,
        blend_mode: 'neural'
      };

      const result = await requestVirtualTryOn(payload);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (result && result.status === 'completed' && result.result_image) {
        setTryOnResult({
          ...result,
          garment_name: activeGarmentName,
          garment_image: garmentImg,
          timestamp: new Date().toISOString()
        });
        setViewMode('tryon');
        showToast("AI Virtual Try-On synthesized successfully!", "success");
      } else {
        const errMsg = result?.error || "Virtual try-on synthesis failed. Please try a different image.";
        setErrorMessage(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setErrorMessage(err.message || "Failed to communicate with AI Try-On service.");
      showToast("Try-On request failed. Please check backend connection.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Real Mixed Outfit Multi-Garment Try-On
  const handleExecuteOutfitTryOn = async () => {
    if (!userPhoto) {
      showToast("Please provide or upload a user portrait photo first.", "error");
      return;
    }

    const itemsToTry = currentRecommendation?.items || [];
    if (itemsToTry.length === 0) {
      showToast("No recommendation outfit items available.", "error");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setCurrentStep(0);
    setHasSavedHistory(false);

    const stepTimer1 = setTimeout(() => setCurrentStep(1), 400);
    const stepTimer2 = setTimeout(() => setCurrentStep(2), 900);
    const stepTimer3 = setTimeout(() => setCurrentStep(3), 1400);

    try {
      const payload = {
        user_photo: userPhoto,
        garments: itemsToTry
      };

      const result = await requestOutfitTryOn(payload);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);

      if (result && result.status === 'completed' && result.result_image) {
        setTryOnResult({
          ...result,
          garment_name: currentRecommendation.name || "Curated Mixed Ensemble",
          timestamp: new Date().toISOString(),
          is_mixed_outfit: true,
          applied_garments: result.applied_garments || itemsToTry
        });
        setViewMode('tryon');
        showToast("Mixed Outfit Virtual Try-On synthesized successfully! ✨", "success");
      } else {
        const errMsg = result?.error || "Mixed outfit try-on synthesis failed.";
        setErrorMessage(errMsg);
        showToast(errMsg, "error");
      }
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setErrorMessage(err.message || "Failed to communicate with AI Try-On service.");
      showToast("Try-On request failed. Please check backend connection.", "error");
    } finally {
      setIsProcessing(false);
    }
  };


  // Save current try-on result to History
  const handleSaveToHistory = () => {
    if (!tryOnResult || !tryOnResult.result_image) return;
    saveTryOnToHistory(tryOnResult);
    setHasSavedHistory(true);
  };

  // Download synthesized try-on image
  const handleDownloadResult = () => {
    if (!tryOnResult?.result_image) return;
    const link = document.createElement('a');
    link.href = tryOnResult.result_image;
    link.download = `fashion-vista-tryon-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Downloaded try-on photo!", "info");
  };

  const defaultUserImg = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={photoFileInputRef}
        onChange={handleUserPhotoChange}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />
      <input
        type="file"
        ref={garmentFileInputRef}
        onChange={handleCustomGarmentUpload}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
      />

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-taupe-300 text-[11px] font-bold uppercase tracking-widest text-charcoal-700 mb-2 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
            Functionality 4: AI Virtual Try-On
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            Virtual Try-On Studio
          </h1>
          <p className="text-sm sm:text-base text-charcoal-500 mt-1 max-w-2xl">
            Simulate realistic garment fitting directly onto your portrait using PyTorch MobileNetV3 semantic silhouette parsing and Keypoint-RCNN anatomical pose anchoring.
          </p>
        </div>

        {/* Neural Engine Readiness Pill */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {vtoStatus.is_ready ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Neural Engine Ready (CPU PyTorch)
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 shadow-sm">
              <Cpu className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              Checking Engine Status
            </div>
          )}
        </div>
      </div>

      {/* ERROR BANNER IF ANY */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <p className="font-semibold text-rose-900">Try-On Synthesis Notice</p>
            <p className="mt-0.5 text-rose-700">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-rose-800 hover:text-rose-950 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MAIN TWO-COLUMN STUDIO WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: INPUT CONTROLS (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* 1. USER PORTRAIT CARD */}
          <div className="bg-white rounded-3xl p-6 border border-taupe-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-taupe-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-charcoal-700" />
                <h3 className="editorial-heading text-base font-bold uppercase tracking-wider text-charcoal-900">
                  Your Portrait
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => photoFileInputRef.current?.click()}
                  className="text-xs text-charcoal-700 hover:text-black font-semibold underline"
                >
                  Upload New
                </button>
                <span className="text-taupe-300">•</span>
                <button
                  type="button"
                  onClick={() => navigate('/try-on/upload')}
                  className="text-xs text-charcoal-500 hover:text-charcoal-800"
                >
                  Adjust
                </button>
              </div>
            </div>

            {/* Quick Portrait Preset Switcher */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setUserPhoto("/user_indian_portrait.jpg");
                  showToast("Selected My Photo (Event Portrait) ✨", "success");
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  userPhoto === '/user_indian_portrait.jpg'
                    ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                    : 'bg-taupe-50 text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                }`}
              >
                <span>✨</span> My Photo
              </button>
              <button
                type="button"
                onClick={handleSelectFlannelPortrait}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  userPhoto === '/user_portrait.png'
                    ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                    : 'bg-taupe-50 text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                }`}
              >
                <span>👤</span> Flannel Portrait
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserPhoto("/woman_portrait.png");
                  showToast("Selected Studio Model Portrait (Woman in Black Top) 👩", "info");
                }}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                  userPhoto === '/woman_portrait.png' || userPhoto === defaultUserImg
                    ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                    : 'bg-taupe-50 text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                }`}
              >
                <span>👩</span> Studio Model
              </button>
            </div>

            <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden bg-taupe-100/70 border border-taupe-200 shadow-subtle group flex items-center justify-center p-1">
              <img
                src={userPhoto || defaultUserImg}
                alt="Your original uploaded portrait"
                className="max-h-full max-w-full w-auto h-full object-contain mx-auto"
              />
              <div className="absolute bottom-3 left-3 bg-charcoal-900/80 backdrop-blur-sm text-cream-50 text-[11px] px-3 py-1 rounded-full font-medium">
                Calibrated Posture
              </div>
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]"
              >
                <Camera className="w-4 h-4" /> Change Photo
              </button>
            </div>

            <div className="text-[11px] text-charcoal-500 flex items-center justify-between pt-1">
              <span>Pose Anchors: Full Body Silhouette</span>
              <span className="text-emerald-700 font-medium">✓ Ready for Fitting</span>
            </div>
          </div>

          {/* 2. GARMENT SELECTION CARD */}
          <div className="bg-white rounded-3xl p-6 border border-taupe-200 shadow-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-taupe-100">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-charcoal-700" />
                <h3 className="editorial-heading text-base font-bold uppercase tracking-wider text-charcoal-900">
                  Select Garment to Try
                </h3>
              </div>
              <Badge variant="neutral" size="xs">
                {selectedGarment ? (selectedGarment.slot || selectedGarment.category || 'Garment') : 'None'}
              </Badge>
            </div>

            {/* Dynamic Active Garment Indicator */}
            {selectedGarment ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-emerald-200 shrink-0">
                    <img
                      src={selectedGarment.image}
                      alt={selectedGarment.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950 truncate">
                      {selectedGarment.name}
                    </p>
                    <p className="text-[10px] text-emerald-700">
                      {selectedGarment.isCustom ? "✓ User Uploaded Cloth Active" : `${selectedGarment.slot || selectedGarment.category || 'Garment'} • Ready for Fitting`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-800 text-white shadow-sm flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-taupe-100 border border-taupe-200 text-xs text-charcoal-600 text-center">
                Select a garment below or upload your cloth to try on.
              </div>
            )}

            {/* Category Filter Pills (Topwear / Bottomwear / Saree) */}
            <div className="flex items-center gap-1.5 p-1 bg-taupe-50 rounded-xl border border-taupe-200">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'topwear', label: '👚 Topwear' },
                { id: 'bottomwear', label: '👖 Bottomwear' },
                { id: 'saree', label: '🥻 Saree / Ethnic' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all text-center ${
                    selectedCategory === cat.id
                      ? 'bg-charcoal-900 text-white shadow-sm'
                      : 'text-charcoal-600 hover:text-black hover:bg-taupe-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Source Selection Tabs */}
            <div className="flex rounded-xl bg-taupe-100 p-1 text-xs font-semibold overflow-x-auto gap-1">
              <button
                type="button"
                onClick={() => setGarmentSourceTab('mixed_outfit')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                  garmentSourceTab === 'mixed_outfit'
                    ? 'bg-charcoal-900 text-white shadow-sm'
                    : 'text-charcoal-600 hover:text-black'
                }`}
              >
                ✨ Mixed Outfit
              </button>
              <button
                type="button"
                onClick={() => setGarmentSourceTab('recommendation')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                  garmentSourceTab === 'recommendation'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                Single Piece ({tryableRecommendationItems.length})
              </button>
              <button
                type="button"
                onClick={() => setGarmentSourceTab('wardrobe')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                  garmentSourceTab === 'wardrobe'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                Wardrobe ({tryableWardrobeItems.length})
              </button>
              <button
                type="button"
                onClick={() => setGarmentSourceTab('custom')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                  garmentSourceTab === 'custom'
                    ? 'bg-white text-charcoal-900 shadow-sm'
                    : 'text-charcoal-500 hover:text-charcoal-800'
                }`}
              >
                Upload
              </button>
            </div>

            {/* TAB CONTENT: MIXED OUTFIT (WARDROBE + ONLINE SHOPPING) */}
            {garmentSourceTab === 'mixed_outfit' && (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-[#FCFAF7] border border-taupe-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                      Active Mixed Blueprint
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Wardrobe + Myntra Mixed
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-charcoal-900 truncate">
                    {currentRecommendation?.name || "Curated Ensemble"}
                  </h4>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(currentRecommendation?.items || []).map((item, idx) => {
                    const isOwned = Boolean(item.inWardrobe || item.owned);
                    const slotLabel = String(item.slot || item.category || 'Garment').toUpperCase();
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
                          isOwned
                            ? 'bg-emerald-50/60 border-emerald-200'
                            : 'bg-amber-50/60 border-amber-200'
                        }`}
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-taupe-200 shrink-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isOwned
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {isOwned ? "✓ From Your Wardrobe" : "🛍️ Shop Online"}
                            </span>
                            <span className="text-[10px] text-charcoal-400 font-bold uppercase">
                              {slotLabel}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-charcoal-900 truncate mt-0.5">
                            {item.name}
                          </div>
                          {!isOwned ? (
                            <div className="flex items-center justify-between mt-1 text-[11px]">
                              <span className="font-extrabold text-charcoal-900">
                                ₹{item.price || 999}
                              </span>
                              <a
                                href={item.buy_link || item.buy_url || `https://www.myntra.com/${encodeURIComponent(item.name || '').replace(/%20/g, '-')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-charcoal-900 hover:text-black underline flex items-center gap-0.5"
                              >
                                Buy on {item.retailer || 'Myntra'} ↗
                              </a>
                            </div>
                          ) : (
                            <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                              Using your actual wardrobe piece
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  variant="primary"
                  size="md"
                  onClick={handleExecuteOutfitTryOn}
                  disabled={isProcessing}
                  className="w-full justify-center shadow-card font-semibold py-2.5 text-xs sm:text-sm"
                  iconLeft={<Sparkles className="w-4 h-4 text-cream-200" />}
                >
                  {isProcessing ? "Synthesizing Mixed Ensemble..." : "Try Mixed Outfit on You ✨"}
                </Button>
              </div>
            )}


            {/* TAB CONTENT: CURATED RECOMMENDATION ITEMS */}
            {garmentSourceTab === 'recommendation' && (
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {tryableRecommendationItems.map((item, idx) => {
                  const isSelected = selectedGarment?.name === item.name;
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedGarment(item)}
                      className={`cursor-pointer p-2.5 rounded-2xl border transition-all flex flex-col items-center text-center relative ${
                        isSelected
                          ? 'border-charcoal-900 bg-[#FBF9F6] ring-2 ring-charcoal-900/10'
                          : 'border-taupe-200 hover:border-taupe-400 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-charcoal-900 text-white flex items-center justify-center">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-taupe-100 mb-2">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                        {item.slot || item.category}
                      </div>
                      <div className="text-xs font-semibold text-charcoal-900 truncate w-full mt-0.5">
                        {item.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: MY WARDROBE ITEMS */}
            {garmentSourceTab === 'wardrobe' && (
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {tryableWardrobeItems.length === 0 ? (
                  <div className="col-span-2 text-center py-6 text-xs text-charcoal-400">
                    No compatible tops or dresses found in your wardrobe.
                  </div>
                ) : (
                  tryableWardrobeItems.map((item, idx) => {
                    const isSelected = selectedGarment?.id === item.id || selectedGarment?.name === item.name;
                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedGarment(item)}
                        className={`cursor-pointer p-2.5 rounded-2xl border transition-all flex flex-col items-center text-center relative ${
                          isSelected
                            ? 'border-charcoal-900 bg-[#FBF9F6] ring-2 ring-charcoal-900/10'
                            : 'border-taupe-200 hover:border-taupe-400 bg-white'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-charcoal-900 text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-taupe-100 mb-2">
                          <img
                            src={item.image || "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=300&q=80"}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                          {item.category}
                        </div>
                        <div className="text-xs font-semibold text-charcoal-900 truncate w-full mt-0.5">
                          {item.name}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB CONTENT: CUSTOM GARMENT UPLOAD */}
            {garmentSourceTab === 'custom' && (
              <div className="space-y-3">
                {/* Category Type Selector for Custom Upload */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-600">
                    What are you trying on?
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'Topwear', label: '👚 Topwear', desc: 'Tops, Shirts, Jackets' },
                      { id: 'Bottomwear', label: '👖 Bottomwear', desc: 'Jeans, Pants, Skirts' },
                      { id: 'Saree', label: '🥻 Saree', desc: 'Sarees, Lehengas' }
                    ].map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCustomGarmentCategory(cat.id);
                          if (selectedGarment && selectedGarment.isCustom) {
                            setSelectedGarment(prev => ({
                              ...prev,
                              category: cat.id,
                              slot: cat.id
                            }));
                          }
                        }}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          customGarmentCategory === cat.id
                            ? 'bg-charcoal-900 text-white border-charcoal-900 shadow-sm'
                            : 'bg-white text-charcoal-700 border-taupe-300 hover:border-charcoal-400'
                        }`}
                      >
                        <div className="text-xs font-bold">{cat.label}</div>
                        <div className={`text-[9px] mt-0.5 truncate ${customGarmentCategory === cat.id ? 'text-cream-200' : 'text-charcoal-400'}`}>
                          {cat.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {customGarmentImage ? (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-2xl border border-taupe-300 bg-[#FAF8F5] flex items-center gap-3 shadow-sm">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-taupe-200 shrink-0">
                        <img src={customGarmentImage} alt="Custom uploaded garment" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-charcoal-900 truncate">
                          {customGarmentTitle || customGarmentName || "Uploaded Cloth"}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Ready for Virtual Try-On
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {selectedGarment?.image !== customGarmentImage ? (
                            <button
                              type="button"
                              onClick={() => setSelectedGarment({
                                name: customGarmentTitle || customGarmentName || "Uploaded Cloth",
                                category: customGarmentCategory || "Topwear",
                                slot: customGarmentCategory || "Topwear",
                                image: customGarmentImage,
                                isCustom: true
                              })}
                              className="text-[11px] font-bold text-white bg-charcoal-900 px-3 py-1 rounded hover:bg-black transition-colors"
                            >
                              Set as Active
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-200">
                              ✓ Active Garment
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => garmentFileInputRef.current?.click()}
                            className="text-[11px] text-charcoal-600 underline hover:text-black font-medium"
                          >
                            Upload Different
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => garmentFileInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-xl border border-dashed border-taupe-300 hover:border-charcoal-600 text-xs font-semibold text-charcoal-700 bg-white hover:bg-taupe-50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-charcoal-600" />
                      Upload Another Cloth / Dress
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => garmentFileInputRef.current?.click()}
                    className="border-2 border-dashed border-taupe-300 hover:border-charcoal-600 rounded-2xl p-6 text-center cursor-pointer transition-colors bg-[#FAF8F5]"
                  >
                    <Upload className="w-6 h-6 mx-auto text-charcoal-500 mb-2" />
                    <p className="text-xs font-semibold text-charcoal-800">
                      Click to upload any garment / cloth
                    </p>
                    <p className="text-[11px] text-charcoal-500 mt-1">
                      Clear PNG or JPG photo of shirt, top, blouse, or dress
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectUploadedGreenTshirt();
                      }}
                      className="mt-3 text-xs font-bold text-emerald-700 underline hover:text-emerald-900 block mx-auto"
                    >
                      Or test with sample Lime Green T-Shirt 👕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ACTIVE SELECTION SUMMARY & LAUNCH BUTTON */}
            {selectedGarment && (
              <div className="pt-2 border-t border-taupe-100 flex items-center justify-between">
                <div className="text-xs text-charcoal-600">
                  Target: <strong className="text-charcoal-900">{selectedGarment.name}</strong>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteTryOn}
                  disabled={isProcessing}
                  className="shadow-sm font-semibold"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cream-200" />
                      Try On Now
                    </>
                  )}
                </Button>
              </div>
            )}

          </div>

          {/* PRIVACY ASSURANCE CALLOUT */}
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs text-charcoal-600 space-y-1">
            <div className="font-semibold text-charcoal-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Private & Ephemeral Processing
            </div>
            <p className="text-[11px] text-charcoal-500 leading-relaxed">
              Your portrait is processed strictly in-memory during inference and never saved to persistent database or cloud servers.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: VIRTUAL TRY-ON FITTING ROOM (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-taupe-200 shadow-card flex flex-col justify-between min-h-[560px]">
          <div>
            
            {/* CARD TOP TOOLBAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-taupe-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-charcoal-700" />
                <h3 className="editorial-heading text-lg font-bold uppercase tracking-wider text-charcoal-900">
                  Try-On Fitting Canvas
                </h3>
              </div>

              {/* View toggle (Result vs Original) if result is available */}
              {tryOnResult?.result_image && (
                <div className="flex items-center bg-taupe-100 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setViewMode('tryon')}
                    className={`py-1 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'tryon'
                        ? 'bg-charcoal-900 text-white shadow-sm'
                        : 'text-charcoal-600 hover:text-black'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    AI Try-On Result
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('original')}
                    className={`py-1 px-3 rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === 'original'
                        ? 'bg-charcoal-900 text-white shadow-sm'
                        : 'text-charcoal-600 hover:text-black'
                    }`}
                  >
                    <User className="w-3 h-3" />
                    Original Portrait
                  </button>
                </div>
              )}
            </div>

            {/* DISPLAY CANVAS CONTAINER */}
            <div className="relative h-[480px] sm:h-[540px] w-full rounded-2xl overflow-hidden bg-[#FBF9F6] border border-taupe-200 flex flex-col items-center justify-center shadow-inner p-2">
              
              {/* STATE A: PROCESSING LOADER WITH STEP PROGRESSION */}
              {isProcessing && (
                <div className="w-full h-full p-6 flex flex-col items-center justify-center bg-gradient-to-b from-[#FAF8F5] to-[#F2EBE1] text-center space-y-6">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-taupe-200 border-t-charcoal-900 animate-spin"></div>
                    <Cpu className="w-8 h-8 text-charcoal-900" />
                  </div>

                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="editorial-heading text-xl font-bold text-charcoal-900">
                      {processingSteps[currentStep].title}
                    </h4>
                    <p className="text-xs text-charcoal-600">
                      {processingSteps[currentStep].detail}
                    </p>
                  </div>

                  {/* Progressive dots */}
                  <div className="w-full max-w-xs space-y-2">
                    <div className="h-1.5 bg-taupe-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-charcoal-900 transition-all duration-300 rounded-full"
                        style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                      <span>Step {currentStep + 1} of 4</span>
                      <span>PyTorch Neural Engine</span>
                    </div>
                  </div>
                </div>
              )}

              {/* STATE B: DISPLAY GENERATED RESULT OR ORIGINAL */}
              {!isProcessing && tryOnResult?.result_image && (
                <div className="w-full h-full relative group flex items-center justify-center">
                  <img
                    src={viewMode === 'tryon' ? tryOnResult.result_image : (userPhoto || defaultUserImg)}
                    alt={viewMode === 'tryon' ? "AI Virtual Try-On Result" : "Original User Portrait"}
                    className="max-h-full max-w-full w-auto h-full object-contain mx-auto rounded-lg"
                  />

                  {/* Corner Badges */}
                  <div className="absolute top-3 left-3 bg-charcoal-900/80 backdrop-blur-sm text-cream-50 text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
                    {viewMode === 'tryon' ? (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        {tryOnResult.is_mixed_outfit ? "AI Mixed Outfit Synthesized" : "AI Neural Warping Synthesized"}
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        Original Calibrated Portrait
                      </>
                    )}
                  </div>

                  {/* Mixed Outfit Garment Badges */}
                  {viewMode === 'tryon' && (tryOnResult.applied_garments || tryOnResult.is_mixed_outfit) && (
                    <div className="absolute top-12 left-3 right-3 flex flex-wrap gap-1.5 z-10 pointer-events-none">
                      {(tryOnResult.applied_garments || []).map((g, gIdx) => {
                        const isOwned = g.source === 'wardrobe' || g.inWardrobe;
                        return (
                          <span
                            key={gIdx}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${
                              isOwned
                                ? 'bg-emerald-950/85 text-emerald-200 border-emerald-500/50'
                                : 'bg-charcoal-950/85 text-amber-200 border-amber-500/50'
                            }`}
                          >
                            {isOwned ? "✓ Wardrobe: " : "🛍️ Online: "} {g.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {viewMode === 'tryon' && tryOnResult.metrics?.inference_time_sec && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-charcoal-900 text-[11px] px-2.5 py-1 rounded-full font-bold shadow-sm">
                      ⚡ {tryOnResult.metrics.inference_time_sec}s • {tryOnResult.metrics.generative_diffusion ? "IDM-VTON Diffusion" : "AI Synthesis"}
                    </div>
                  )}


                  {/* Quick toggle pill at the bottom */}
                  <div className="absolute bottom-4 inset-x-0 flex justify-center">
                    <button
                      type="button"
                      onClick={() => setViewMode(prev => prev === 'tryon' ? 'original' : 'tryon')}
                      className="bg-charcoal-900/80 hover:bg-black text-white text-xs px-4 py-1.5 rounded-full backdrop-blur-md shadow-card font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Switch to {viewMode === 'tryon' ? 'Original Photo' : 'AI Try-On'}
                    </button>
                  </div>
                </div>
              )}

              {/* STATE C: IDLE INITIAL STATE (NOT YET GENERATED) */}
              {!isProcessing && !tryOnResult?.result_image && (
                <div className="w-full h-full p-8 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#FAF8F5] to-[#F2EBE1]">
                  <div className="w-16 h-16 rounded-full bg-white border border-taupe-300 flex items-center justify-center mb-4 text-charcoal-700 shadow-sm">
                    <Shirt className="w-8 h-8 stroke-[1.5]" />
                  </div>

                  <h4 className="editorial-heading text-xl sm:text-2xl font-semibold text-charcoal-900 mb-2">
                    Virtual Fitting Preview
                  </h4>

                  <p className="text-xs sm:text-sm text-charcoal-600 max-w-sm mb-6 leading-relaxed">
                    Ready to simulate <strong>{selectedGarment?.name || "the selected garment"}</strong> directly onto your posture.
                  </p>

                  {errorMessage ? (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-200 max-w-sm w-full text-left space-y-1.5 mb-6">
                      <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        Inference Note
                      </div>
                      <p className="text-[11px] text-red-700 leading-relaxed">
                        {errorMessage}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-taupe-200 max-w-xs w-full shadow-subtle text-left space-y-2 mb-6">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
                        Active Generative Engine
                      </div>
                      <div className="text-xs font-semibold text-charcoal-900">
                        IDM-VTON Pretrained Diffusion (Dual UNet)
                      </div>
                      <div className="text-[11px] text-charcoal-500">
                        Target garment: {selectedGarment?.name || "Curated Piece"}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleExecuteTryOn}
                    disabled={isProcessing}
                    iconLeft={<Sparkles className="w-4 h-4 text-cream-200" />}
                    className="shadow-card font-semibold"
                  >
                    Start AI Virtual Try-On ✨
                  </Button>
                </div>
              )}

            </div>
          </div>

          {/* CARD BOTTOM ACTIONS & METRICS */}
          <div className="mt-6 pt-4 border-t border-taupe-100 flex flex-wrap items-center justify-between gap-4">
            
            {/* METRICS & STATUS SUMMARY */}
            <div className="text-xs text-charcoal-500 flex items-center gap-3">
              <span>Model: {tryOnResult?.model_id ? "IDM-VTON Pretrained Diffusion" : "IDM-VTON Generative Try-On"}</span>
              <span>•</span>
              <span className="text-charcoal-800 font-medium">
                {tryOnResult?.model_architecture || "DensePose + Dual UNet Diffusion Synthesis (768×1024)"}
              </span>
            </div>


            {/* ACTION BUTTONS ON RESULT */}
            {tryOnResult?.result_image && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownloadResult}
                  iconLeft={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSaveToHistory}
                  disabled={hasSavedHistory}
                  iconLeft={<Bookmark className="w-3.5 h-3.5" />}
                >
                  {hasSavedHistory ? "Saved in History ✓" : "Save Look"}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/analysis')}
                  iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Analyze Outfit →
                </Button>
              </div>
            )}

            {!tryOnResult?.result_image && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/analysis')}
                iconRight={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Proceed to Analysis →
              </Button>
            )}

          </div>

        </div>

      </div>

      {/* BOTTOM SECTION: COMPLETE OUTFIT ENSEMBLE */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-200 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-taupe-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500">
              Coordinated Ensemble
            </span>
            <h4 className="editorial-heading text-xl font-bold text-charcoal-900">
              Outfit Being Tried: {currentRecommendation?.name || "Curated Ensemble"}
            </h4>
          </div>
          <span className="text-xs text-charcoal-600 font-medium">
            Click any garment piece to switch fitting target
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {outfitItems.map((item, idx) => {
            const isTarget = selectedGarment?.name === item.name;
            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedGarment(item);
                  setGarmentSourceTab('recommendation');
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                  isTarget
                    ? 'bg-[#FAF8F5] border-charcoal-900 ring-2 ring-charcoal-900/10'
                    : 'bg-white border-taupe-200 hover:border-taupe-400'
                }`}
              >
                <div className="w-12 h-14 rounded-lg bg-taupe-200 overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="overflow-hidden flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-400">
                      {item.slot || item.category}
                    </span>
                    {isTarget && (
                      <span className="text-[9px] font-bold bg-charcoal-900 text-white px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-charcoal-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-charcoal-500 mt-0.5">
                    {item.inWardrobe ? "In closet" : "Needed"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};


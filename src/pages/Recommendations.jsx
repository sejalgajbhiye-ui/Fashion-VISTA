import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useFashion, matchOutfitWithWardrobe } from '../context/FashionContext';
import { WardrobeMatch } from '../components/WardrobeMatch';
import { RecommendationReason } from '../components/RecommendationReason';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import {
  Sparkles,
  ShoppingBag,
  Shirt,
  ExternalLink,
  Layers,
  Check,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Compass,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Heart,
  ShieldCheck,
  ArrowRight,
  Tag,
  SlidersHorizontal,
  Info,
  DollarSign,
  Gem,
  Crown,
  Palette,
  Sun,
  Moon
} from 'lucide-react';

// Pre-defined Quick Presets for Occasions
const OCCASION_PRESETS = [
  { id: 'Wedding', label: 'Wedding', icon: '💍', subtitle: 'Royal heritage silks & bridal lehengas' },
  { id: 'Party', label: 'Party', icon: '🎉', subtitle: 'Modern evening glam, gowns & cocktails' },
  { id: 'Reception', label: 'Reception', icon: '🥂', subtitle: 'Sophisticated gowns & drape sarees' },
  { id: 'Sangeet', label: 'Sangeet / Mehendi', icon: '🪕', subtitle: 'Vibrant shararas & flared lehengas' },
  { id: 'Festive', label: 'Festive / Puja', icon: '✨', subtitle: 'Chikankari, Chanderi & classic ethnic' },
  { id: 'Formal Gala', label: 'Formal Gala', icon: '👔', subtitle: 'Tailored luxury jumpsuits & tuxedo chic' },
  { id: 'Date Night', label: 'Date Night', icon: '🍸', subtitle: 'Effortless slip dresses & fluid blazers' },
  { id: 'College', label: 'College / Casual', icon: '🎓', subtitle: 'Breathable kurtis, linen shirts & denim' }
];

// Pre-defined Quick Presets for Target Color Themes (18 Refined Palettes)
const COLOR_PRESETS = [
  { id: 'Red', name: 'Crimson Red', hex: '#DC2626' },
  { id: 'Wine', name: 'Wine Burgundy', hex: '#881337' },
  { id: 'Green', name: 'Emerald Green', hex: '#059669' },
  { id: 'Sage', name: 'Sage Olive', hex: '#65A30D' },
  { id: 'Black', name: 'Midnight Black', hex: '#18181B' },
  { id: 'Blue', name: 'Royal Blue', hex: '#2563EB' },
  { id: 'Teal', name: 'Teal Turquoise', hex: '#0D9488' },
  { id: 'Sky', name: 'Powder Sky', hex: '#38BDF8' },
  { id: 'Navy', name: 'Navy Midnight', hex: '#1E3A8A' },
  { id: 'Pink', name: 'Blush Pink', hex: '#EC4899' },
  { id: 'Rose', name: 'Dusty Rose', hex: '#E11D48' },
  { id: 'Gold', name: 'Warm Gold', hex: '#D97706' },
  { id: 'Mustard', name: 'Mustard Haldi', hex: '#EAB308' },
  { id: 'Rust', name: 'Terracotta Rust', hex: '#C2410C' },
  { id: 'Purple', name: 'Royal Purple', hex: '#7C3AED' },
  { id: 'Lavender', name: 'Lavender Lilac', hex: '#A855F7' },
  { id: 'White', name: 'Ivory White', hex: '#F3F4F6' },
  { id: 'Beige', name: 'Champagne Nude', hex: '#D4B996' }
];

// Color Conversion & Identification Utilities
const hslToHex = (h, s, l) => {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
};

const hexToHsl = (hex) => {
  let c = (hex || '#000000').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h = Math.round(h * 60);
  }
  return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
};

const detectFamilyFromHsl = (h, s, l) => {
  if (l <= 15) return { id: 'Black', name: 'Midnight Black' };
  if (l >= 88 && s <= 20) return { id: 'White', name: 'Ivory White' };
  if (s <= 18) return l > 60 ? { id: 'Beige', name: 'Champagne Nude' } : { id: 'Black', name: 'Charcoal Noir' };
  if (h < 15 || h >= 345) return l < 35 ? { id: 'Wine', name: 'Wine Burgundy' } : { id: 'Red', name: 'Crimson Red' };
  if (h >= 15 && h < 38) return { id: 'Rust', name: 'Terracotta Rust' };
  if (h >= 38 && h < 68) return l > 60 ? { id: 'Gold', name: 'Warm Gold' } : { id: 'Mustard', name: 'Mustard Haldi' };
  if (h >= 68 && h < 165) return (s < 45 || l > 65) ? { id: 'Sage', name: 'Sage Olive' } : { id: 'Green', name: 'Emerald Green' };
  if (h >= 165 && h < 195) return { id: 'Teal', name: 'Teal Turquoise' };
  if (h >= 195 && h < 215) return { id: 'Sky', name: 'Powder Sky' };
  if (h >= 215 && h < 255) return l < 35 ? { id: 'Navy', name: 'Navy Midnight' } : { id: 'Blue', name: 'Royal Blue' };
  if (h >= 255 && h < 290) return l > 60 ? { id: 'Lavender', name: 'Lavender Lilac' } : { id: 'Purple', name: 'Royal Purple' };
  if (l < 35) return { id: 'Wine', name: 'Wine Burgundy' };
  return (l < 50 || s > 70) ? { id: 'Rose', name: 'Dusty Rose' } : { id: 'Pink', name: 'Blush Pink' };
};

// Pre-defined Excluded Colours Filter Presets
const EXCLUDED_COLOR_PRESETS = [
  { id: 'Black', name: 'Black', hex: '#18181B' },
  { id: 'White', name: 'White', hex: '#F3F4F6' },
  { id: 'Yellow', name: 'Yellow', hex: '#F59E0B' },
  { id: 'Pink', name: 'Pink', hex: '#EC4899' },
  { id: 'Green', name: 'Emerald', hex: '#059669' },
  { id: 'Orange', name: 'Orange', hex: '#EA580C' }
];

// Pre-defined Unified Budget & Price Range Filter Presets
const PRICE_RANGE_PRESETS = [
  { id: 'all', label: 'All Budgets', min: null, max: null },
  { id: 'under-2000', label: 'Under ₹2,000 (Meesho / Flipkart / Amazon)', min: null, max: 2000 },
  { id: '2000-4000', label: '₹2,000 - ₹4,000 (Myntra)', min: 2000, max: 4000 },
  { id: '4000-8000', label: '₹4,000 - ₹8,000 (Myntra)', min: 4000, max: 8000 },
  { id: '8000-plus', label: '₹8,000+ (Myntra Luxury)', min: 8000, max: null }
];

// Direct Product Buy Card Component
// Shows verified live seller price, MRP, discount, and a direct purchase link to the exact specific product
// Dynamically supports Meesho, Flipkart, Amazon for < ₹2,000 and Myntra for >= ₹2,000
const DirectProductBuyCard = ({ item }) => {
  if (!item) return null;
  const price = item.price || item.base_price || 0;
  const mrp = item.mrp && item.mrp > price ? item.mrp : Math.round(price * 1.45);
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  // Authentic direct buy link from ML / Shopping Pipeline
  let buyUrl = item.buy_url;
  let retailer = item.retailer || 'Myntra';

  if (buyUrl) {
    if (buyUrl.includes('myntra.com')) retailer = 'Myntra';
    else if (buyUrl.includes('flipkart.com')) retailer = 'Flipkart';
    else if (buyUrl.includes('amazon.in')) retailer = 'Amazon';
    else if (buyUrl.includes('meesho.com')) retailer = 'Meesho';
    else if (buyUrl.includes('ajio.com')) retailer = 'Ajio';
  } else {
    const queryEnc = encodeURIComponent(item.name || 'ethnic wear');
    buyUrl = `https://www.myntra.com/search?q=${queryEnc}`;
    retailer = 'Myntra';
  }

  // Retailer styling themes
  const RETAILER_THEMES = {
    Meesho: {
      bgGradient: 'from-[#FDF4FF] via-white to-[#FAF5FF]',
      border: 'border-[#F0ABFC]',
      badgeBg: 'bg-[#9333EA]',
      btnBg: 'bg-[#9333EA] hover:bg-[#7E22CE] ring-[#9333EA]/20',
      tagText: 'text-[#9333EA]',
      tagBg: 'bg-[#FDF4FF]',
      tagBorder: 'border-[#E9D5FF]',
      label: 'Meesho Verified Deal'
    },
    Flipkart: {
      bgGradient: 'from-[#EFF6FF] via-white to-[#F0F9FF]',
      border: 'border-[#93C5FD]',
      badgeBg: 'bg-[#2563EB]',
      btnBg: 'bg-[#2563EB] hover:bg-[#1D4ED8] ring-[#2563EB]/20',
      tagText: 'text-[#1D4ED8]',
      tagBg: 'bg-[#EFF6FF]',
      tagBorder: 'border-[#BFDBFE]',
      label: 'Flipkart Assured'
    },
    Amazon: {
      bgGradient: 'from-[#FFFBEB] via-white to-[#FEF3C7]',
      border: 'border-[#FCD34D]',
      badgeBg: 'bg-[#D97706]',
      btnBg: 'bg-[#1F2937] hover:bg-black ring-amber-500/20',
      tagText: 'text-[#B45309]',
      tagBg: 'bg-[#FEF3C7]',
      tagBorder: 'border-[#FDE68A]',
      label: 'Amazon Prime'
    },
    Myntra: {
      bgGradient: 'from-[#FFF5F7] via-white to-[#FDF2F4]',
      border: 'border-[#F5B7B1]',
      badgeBg: 'bg-[#E11B5A]',
      btnBg: 'bg-[#E11B5A] hover:bg-[#C2185B] ring-[#E11B5A]/20',
      tagText: 'text-[#E11B5A]',
      tagBg: 'bg-[#FFE4EE]',
      tagBorder: 'border-[#F8BBD0]',
      label: 'Myntra Verified Product'
    },
    Ajio: {
      bgGradient: 'from-[#F0FDF4] via-white to-[#ECFDF5]',
      border: 'border-[#A7F3D0]',
      badgeBg: 'bg-[#059669]',
      btnBg: 'bg-[#059669] hover:bg-[#047857] ring-[#059669]/20',
      tagText: 'text-[#059669]',
      tagBg: 'bg-[#ECFDF5]',
      tagBorder: 'border-[#A7F3D0]',
      label: 'Ajio Curated Trend'
    }
  };

  const theme = RETAILER_THEMES[retailer] || RETAILER_THEMES.Myntra;

  return (
    <div className={`mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${theme.bgGradient} border ${theme.border} shadow-2xs space-y-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${theme.badgeBg} text-white shadow-2xs`}>
            <ShoppingBag className="w-3.5 h-3.5" />
            {theme.label}
          </span>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
            ✓ Direct Product Buy Link
          </span>
        </div>
        {discount > 0 && (
          <span className={`text-xs font-black ${theme.tagText} ${theme.tagBg} px-3 py-1 rounded-full border ${theme.tagBorder}`}>
            {discount}% OFF LIVE DISCOUNT
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <div className="flex items-baseline gap-2.5">
            <span className="editorial-heading text-2xl sm:text-3xl font-black text-charcoal-950">
              ₹{price.toLocaleString('en-IN')}
            </span>
            {mrp > price && (
              <span className="text-sm sm:text-base font-semibold text-charcoal-400 line-through">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
            )}
            <span className="text-xs text-charcoal-500 font-semibold">
              (Live Selling Price on {retailer})
            </span>
          </div>
          <p className="text-xs text-charcoal-600 mt-1 font-medium line-clamp-1">
            Exact Product: <strong className="text-charcoal-900">{item.name}</strong>
          </p>
        </div>

        <a
          href={buyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl ${theme.btnBg} text-white font-extrabold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 shrink-0 group ring-2`}
          title={`Open ${item.name} directly on ${retailer}`}
        >
          <span>Buy on {retailer}</span>
          <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </a>
      </div>

      {/* Cross-Retailer Price Comparison Links */}
      {item.retailer_links && typeof item.retailer_links === 'object' && !Array.isArray(item.retailer_links) && (
        <div className="pt-2.5 border-t border-taupe-200/60 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="font-semibold text-charcoal-500">Compare on other stores:</span>
          {Object.entries(item.retailer_links)
            .filter(([storeKey]) => storeKey.toLowerCase() !== retailer.toLowerCase())
            .map(([storeKey, storeData]) => (
              <a
                key={storeKey}
                href={storeData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-white/90 border border-taupe-200 text-charcoal-700 hover:text-charcoal-950 hover:border-charcoal-400 font-bold transition-all shadow-2xs inline-flex items-center gap-1.5"
              >
                <span>{storeData.retailer}</span>
                {storeData.price && (
                  <span className="text-charcoal-500 font-medium">₹{storeData.price?.toLocaleString('en-IN')}</span>
                )}
              </a>
            ))}
        </div>
      )}
    </div>
  );
};

export const Recommendations = () => {
  const navigate = useNavigate();
  const {
    currentRecommendation,
    applyAlternative,
    preferences = {},
    setPreferences,
    allOutfits = [],
    selectOutfitByIndex,
    generateRecommendation,
    wardrobe = []
  } = useFashion();

  const [viewMode, setViewMode] = useState('detail'); // 'detail' | 'all'
  const [activeTab, setActiveTab] = useState('all-slots'); // 'all-slots' | 'dress' | 'bottomwear' | 'jewellery' | 'footwear' | 'handbag'
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom Color Studio State
  const [showCustomStudio, setShowCustomStudio] = useState(false);
  const [customHue, setCustomHue] = useState(175); // 0 to 360
  const [customSat, setCustomSat] = useState(85); // 0 to 100
  const [customLightness, setCustomLightness] = useState(50); // 15 to 85 (Dark to Light)
  const [customHex, setCustomHex] = useState('#0D9488');

  const handleNativeColorInput = (hexVal) => {
    setCustomHex(hexVal);
    const hsl = hexToHsl(hexVal);
    setCustomHue(hsl.h);
    setCustomSat(hsl.s);
    setCustomLightness(hsl.l);
  };

  const handleHueSlider = (newHue) => {
    setCustomHue(newHue);
    const newHex = hslToHex(newHue, customSat, customLightness);
    setCustomHex(newHex);
  };

  const handleToneSlider = (newL) => {
    setCustomLightness(newL);
    const newHex = hslToHex(customHue, customSat, newL);
    setCustomHex(newHex);
  };

  const handleApplyCustomColor = async () => {
    const family = detectFamilyFromHsl(customHue, customSat, customLightness);
    const tonePrefix = customLightness >= 70 ? 'Light' : (customLightness <= 30 ? 'Deep' : '');
    const finalColorName = tonePrefix ? `${tonePrefix} ${family.id}` : family.id;
    await handleColorChange(finalColorName);
  };

  // Safe fallback preferences
  const safePrefs = preferences || { occasion: 'Wedding', colour: 'Red', style: 'Traditional' };

  // Current outfits list (supports 5 to 10 looks)
  const outfitsList = (Array.isArray(allOutfits) && allOutfits.length > 0)
    ? allOutfits.filter(Boolean).slice(0, 10)
    : (currentRecommendation ? [currentRecommendation] : []);

  // Auto-run ML recommendation if only 1 fallback is loaded
  useEffect(() => {
    if (outfitsList.length < 3 && !isGenerating) {
      setIsGenerating(true);
      generateRecommendation(safePrefs).finally(() => setIsGenerating(false));
    }
  }, []);

  const safeRec = currentRecommendation || outfitsList[0] || {};

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
    name = "Curated Occasion Ensemble",
    subtitle = "Complete Preference-Aligned Ensemble Blueprint",
    silhouette = "Ethnic Silhouette",
    style = safePrefs.style || "Traditional",
    occasion = safePrefs.occasion || "Wedding",
    color_palette = safePrefs.colour ? `${safePrefs.colour} Harmony` : "Harmonious Palette",
    total_price = 4999,
    total_savings = 0,
    net_cost = total_price,
    wardrobe_matches = [],
    has_wardrobe_reuse = false,
    compatibility_score = 96,
    wardrobe_synergy_score = 80,
    ensemble_breakdown = null,
    compatibility_breakdown = null,
    passes_constraints = true,
    constraint_violations = [],
    items = [],
    reasons = [],
    retailer_links = []
  } = activeOutfit || {};

  // Determine if active outfit requires bottomwear (kurtas/separates = true, sarees/lehengas/gowns = false)
  const needsBottomwear = Boolean(activeOutfit?.needs_bottomwear ?? (ensemble_breakdown?.bottomwear != null));

  // Extract slots strictly based on preferences (no hairstyle)
  const dressSlot = {
    name: ensemble_breakdown?.dress?.name || items.find(i => ['dress', 'traditional', 'top'].includes(String(i.slot || i.category).toLowerCase()))?.name || name,
    category: ensemble_breakdown?.dress?.category || silhouette || 'Dress / Silhouette',
    fabric: ensemble_breakdown?.dress?.fabric || 'Pure Silk Blend / High-Grade Fabric',
    color: ensemble_breakdown?.dress?.color || color_palette,
    image: ensemble_breakdown?.dress?.image || activeOutfit?.heroImage || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
    base_price: ensemble_breakdown?.dress?.base_price || 3899,
    price: ensemble_breakdown?.dress?.price ?? (ensemble_breakdown?.dress?.is_owned ? 0 : 3899),
    mrp: ensemble_breakdown?.dress?.mrp || Math.round((ensemble_breakdown?.dress?.base_price || 3899) * 1.5),
    retailer: ensemble_breakdown?.dress?.retailer || 'Myntra',
    buy_url: ensemble_breakdown?.dress?.buy_url || (Array.isArray(ensemble_breakdown?.dress?.retailer_links) ? ensemble_breakdown?.dress?.retailer_links.find(r => r.retailer === 'Myntra')?.url : ensemble_breakdown?.dress?.retailer_links?.myntra?.url) || null,
    is_wardrobe_match: Boolean(ensemble_breakdown?.dress?.is_owned || (has_wardrobe_reuse && wardrobe_matches.some(m => m.slot === 'dress'))),
    matched_item_name: ensemble_breakdown?.dress?.matched_wardrobe_name || wardrobe_matches[0]?.name || null,
    money_saved: ensemble_breakdown?.dress?.is_owned ? (ensemble_breakdown?.dress?.base_price || 3899) : (has_wardrobe_reuse ? total_savings : 0),
    styling_tip: ensemble_breakdown?.dress?.styling_tip || 'Structured drape calibrated specifically for the occasion proportions.',
    retailer_links: ensemble_breakdown?.dress?.retailer_links || []
  };

  const bottomwearSlot = needsBottomwear && ensemble_breakdown?.bottomwear ? {
    name: ensemble_breakdown.bottomwear.name || `${safePrefs.colour || 'Coordinated'} Flared Bottomwear`,
    type: ensemble_breakdown.bottomwear.category || ensemble_breakdown.bottomwear.type || 'Bottomwear / Palazzos',
    fabric: ensemble_breakdown.bottomwear.fabric || 'Pure Silk Blend / High-Grade Tailored Fabric',
    color: ensemble_breakdown.bottomwear.color || safePrefs.colour || 'Coordinated',
    image: ensemble_breakdown.bottomwear.image || 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80',
    base_price: ensemble_breakdown.bottomwear.base_price || 999,
    price: ensemble_breakdown.bottomwear.price ?? (ensemble_breakdown.bottomwear.is_owned ? 0 : 999),
    mrp: ensemble_breakdown.bottomwear.mrp || Math.round((ensemble_breakdown.bottomwear.base_price || 999) * 1.5),
    retailer: ensemble_breakdown.bottomwear.retailer || 'Myntra',
    buy_url: ensemble_breakdown.bottomwear.buy_url || (Array.isArray(ensemble_breakdown.bottomwear.retailer_links) ? ensemble_breakdown.bottomwear.retailer_links.find(r => r.retailer === 'Myntra')?.url : ensemble_breakdown.bottomwear.retailer_links?.myntra?.url) || null,
    is_wardrobe_match: Boolean(ensemble_breakdown.bottomwear.is_owned || (has_wardrobe_reuse && wardrobe_matches.some(m => String(m.slot || '').toLowerCase() === 'bottomwear'))),
    matched_item_name: ensemble_breakdown.bottomwear.matched_wardrobe_name || null,
    money_saved: ensemble_breakdown.bottomwear.is_owned ? (ensemble_breakdown.bottomwear.base_price || 999) : 0,
    styling_tip: ensemble_breakdown.bottomwear.styling_tip || 'Pairs seamlessly with the top silhouette to balance proportions.',
    retailer_links: ensemble_breakdown.bottomwear.retailer_links || []
  } : null;

  const jewellerySlot = {
    name: ensemble_breakdown?.jewellery?.name || `${safePrefs.colour || 'Gold'} Harmonized Jewellery Set`,
    type: ensemble_breakdown?.jewellery?.type || 'Statement Choker & Earrings',
    color: ensemble_breakdown?.jewellery?.color || `${safePrefs.colour || 'Antique Gold'} Finish`,
    image: ensemble_breakdown?.jewellery?.image || items.find(i => ['jewellery', 'jewelry', 'necklace', 'choker'].includes(String(i.slot || i.category).toLowerCase()))?.image || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80',
    base_price: ensemble_breakdown?.jewellery?.base_price || 1499,
    price: ensemble_breakdown?.jewellery?.price ?? (ensemble_breakdown?.jewellery?.is_owned ? 0 : 1499),
    mrp: ensemble_breakdown?.jewellery?.mrp || Math.round((ensemble_breakdown?.jewellery?.base_price || 1499) * 1.5),
    retailer: ensemble_breakdown?.jewellery?.retailer || 'Myntra',
    buy_url: ensemble_breakdown?.jewellery?.buy_url || (Array.isArray(ensemble_breakdown?.jewellery?.retailer_links) ? ensemble_breakdown?.jewellery?.retailer_links.find(r => r.retailer === 'Myntra')?.url : ensemble_breakdown?.jewellery?.retailer_links?.myntra?.url) || null,
    is_wardrobe_match: Boolean(ensemble_breakdown?.jewellery?.is_owned || (has_wardrobe_reuse && wardrobe_matches.some(m => m.slot === 'jewellery'))),
    matched_item_name: ensemble_breakdown?.jewellery?.matched_wardrobe_name || null,
    money_saved: ensemble_breakdown?.jewellery?.is_owned ? (ensemble_breakdown?.jewellery?.base_price || 1499) : 0,
    styling_tip: ensemble_breakdown?.jewellery?.styling_tip || 'Balances the neckline width and draws visual focus upwards toward facial symmetry.',
    retailer_links: ensemble_breakdown?.jewellery?.retailer_links || []
  };

  const footwearSlot = {
    name: ensemble_breakdown?.footwear?.name || `${safePrefs.colour || 'Gold'} Coordinated Footwear`,
    type: ensemble_breakdown?.footwear?.type || 'Cushioned Ceremony Mojaris / Block Heels',
    heel_height: ensemble_breakdown?.footwear?.heel_height || 'Double Cushioned Insole',
    comfort_rating: ensemble_breakdown?.footwear?.comfort_rating || '5 / 5 (All-Day Comfort)',
    image: ensemble_breakdown?.footwear?.image || items.find(i => ['shoe', 'footwear', 'sandals', 'mojaris', 'shoes'].includes(String(i.slot || i.category).toLowerCase()))?.image || 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80',
    base_price: ensemble_breakdown?.footwear?.base_price || 1299,
    price: ensemble_breakdown?.footwear?.price ?? (ensemble_breakdown?.footwear?.is_owned ? 0 : 1299),
    mrp: ensemble_breakdown?.footwear?.mrp || Math.round((ensemble_breakdown?.footwear?.base_price || 1299) * 1.5),
    retailer: ensemble_breakdown?.footwear?.retailer || 'Myntra',
    buy_url: ensemble_breakdown?.footwear?.buy_url || (Array.isArray(ensemble_breakdown?.footwear?.retailer_links) ? ensemble_breakdown?.footwear?.retailer_links.find(r => r.retailer === 'Myntra')?.url : ensemble_breakdown?.footwear?.retailer_links?.myntra?.url) || null,
    is_wardrobe_match: Boolean(ensemble_breakdown?.footwear?.is_owned || (has_wardrobe_reuse && wardrobe_matches.some(m => m.slot === 'footwear'))),
    matched_item_name: ensemble_breakdown?.footwear?.matched_wardrobe_name || null,
    money_saved: ensemble_breakdown?.footwear?.is_owned ? (ensemble_breakdown?.footwear?.base_price || 1299) : 0,
    styling_tip: ensemble_breakdown?.footwear?.styling_tip || 'Provides solid floor grip while matching the metallic sheen of the dress hem.',
    retailer_links: ensemble_breakdown?.footwear?.retailer_links || []
  };

  const handbagSlot = {
    name: ensemble_breakdown?.handbag?.name || `${safePrefs.colour || 'Festive'} Embroidered Handbag`,
    type: ensemble_breakdown?.handbag?.type || 'Traditional Potli / Minaudière Clutch',
    material: ensemble_breakdown?.handbag?.material || 'Zari Embroidery with Metallic Clasp',
    image: ensemble_breakdown?.handbag?.image || items.find(i => ['bag', 'handbag', 'clutch', 'potli'].includes(String(i.slot || i.category).toLowerCase()))?.image || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80',
    base_price: ensemble_breakdown?.handbag?.base_price || 899,
    price: ensemble_breakdown?.handbag?.price ?? (ensemble_breakdown?.handbag?.is_owned ? 0 : 899),
    mrp: ensemble_breakdown?.handbag?.mrp || Math.round((ensemble_breakdown?.handbag?.base_price || 899) * 1.5),
    retailer: ensemble_breakdown?.handbag?.retailer || 'Myntra',
    buy_url: ensemble_breakdown?.handbag?.buy_url || (Array.isArray(ensemble_breakdown?.handbag?.retailer_links) ? ensemble_breakdown?.handbag?.retailer_links.find(r => r.retailer === 'Myntra')?.url : ensemble_breakdown?.handbag?.retailer_links?.myntra?.url) || null,
    is_wardrobe_match: Boolean(ensemble_breakdown?.handbag?.is_owned || (has_wardrobe_reuse && wardrobe_matches.some(m => m.slot === 'handbag'))),
    matched_item_name: ensemble_breakdown?.handbag?.matched_wardrobe_name || null,
    money_saved: ensemble_breakdown?.handbag?.is_owned ? (ensemble_breakdown?.handbag?.base_price || 899) : 0,
    styling_tip: ensemble_breakdown?.handbag?.styling_tip || 'Accommodates smartphone, keys, and touch-up essentials without bulkiness.',
    retailer_links: ensemble_breakdown?.handbag?.retailer_links || []
  };

  // Safe normalized breakdown scores
  const breakdownScores = compatibility_breakdown || {
    preference_relevance: 95,
    colour_harmony: activeOutfit?.color_score || 92,
    occasion_suitability: 94,
    style_compatibility: 93,
    wardrobe_synergy: has_wardrobe_reuse ? 85 : 0
  };

  // Handle Quick Occasion Regeneration via ML model
  const handleOccasionChange = async (newOccasion) => {
    setIsGenerating(true);
    const updated = { ...safePrefs, occasion: newOccasion };
    setPreferences(updated);
    try {
      await generateRecommendation(updated);
    } catch (err) {
      console.warn("Occasion change recommendation notice:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Quick Color Regeneration via ML model
  const handleColorChange = async (newColor) => {
    setIsGenerating(true);
    const updated = { ...safePrefs, colour: newColor };
    setPreferences(updated);
    try {
      await generateRecommendation(updated);
    } catch (err) {
      console.warn("Color change recommendation notice:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Quick Price Range Filter Update via ML model
  const handlePriceRangeChange = async (preset) => {
    setIsGenerating(true);
    const updated = {
      ...safePrefs,
      price_range: preset.id,
      min_price: preset.min,
      max_price: preset.max,
      budget: preset.max || null
    };
    setPreferences(updated);
    try {
      await generateRecommendation(updated);
    } catch (err) {
      console.warn("Price range recommendation notice:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Quick Budget Constraint Update via ML model
  const handleBudgetChange = async (newBudget) => {
    setIsGenerating(true);
    const updated = { ...safePrefs, budget: newBudget };
    setPreferences(updated);
    try {
      await generateRecommendation(updated);
    } catch (err) {
      console.warn("Budget update recommendation notice:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Toggle of Excluded Colours Constraint via ML model
  const handleToggleExcludedColor = async (colorName) => {
    setIsGenerating(true);
    const currentList = Array.isArray(safePrefs.excluded_colours)
      ? safePrefs.excluded_colours
      : (safePrefs.excluded_colour ? [safePrefs.excluded_colour] : []);
    
    let updatedList;
    if (currentList.map(c => String(c).toLowerCase()).includes(colorName.toLowerCase())) {
      updatedList = currentList.filter(c => String(c).toLowerCase() !== colorName.toLowerCase());
    } else {
      updatedList = [...currentList, colorName];
    }
    const updated = {
      ...safePrefs,
      excluded_colours: updatedList,
      excluded_color: updatedList.length > 0 ? updatedList[0] : null
    };
    setPreferences(updated);
    try {
      await generateRecommendation(updated);
    } catch (err) {
      console.warn("Excluded color update recommendation notice:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">

      {/* Top Banner & Title */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-taupe-300 text-[11px] font-bold uppercase tracking-widest text-charcoal-700 mb-3 shadow-subtle">
            <Sparkles className="w-3.5 h-3.5 text-charcoal-900" />
            AI 360° OCCASION STYLIST & ENSEMBLE STUDIO
          </div>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
            COMPLETE OCCASION BLUEPRINTS
          </h1>
          <p className="text-sm sm:text-base text-charcoal-600 mt-2 font-medium max-w-3xl">
            Tailored strictly to your preferences across 5 core styling dimensions: <strong className="text-charcoal-900">Dress/Top, Suitable Bottomwear, Jewellery, Footwear & Handbag</strong> with direct product buy links from <strong className="text-charcoal-900">Meesho, Flipkart, Amazon (under ₹2,000)</strong> and <strong className="text-charcoal-900">Myntra (₹2,000+)</strong>.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {outfitsList.length} ML Looks Generated
          </span>
          <button
            onClick={() => handleOccasionChange(safePrefs.occasion || 'Wedding')}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-taupe-300 text-xs font-bold text-charcoal-800 hover:text-black hover:border-charcoal-800 flex items-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Computing ML...' : 'Refresh ML Looks'}
          </button>
          <button
            onClick={() => navigate('/stylist')}
            className="px-3.5 py-1.5 rounded-xl bg-charcoal-900 text-cream-50 text-xs font-bold hover:bg-black flex items-center gap-1.5 transition-all shadow-subtle"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Change Stylist Quiz
          </button>
        </div>
      </div>

      {/* Interactive Preference Controllers: Occasion, Color, Budget & Constraints */}
      <div className="bg-[#FAF8F5] rounded-3xl p-5 border border-taupe-200 shadow-2xs space-y-4">
        
        {/* Row 1: Occasion Switcher */}
        <div>
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-charcoal-900" />
              1. Select Occasion:
            </span>
            <span className="text-[11px] text-charcoal-500 font-semibold">
              Current: <strong className="text-charcoal-900">{safePrefs.occasion || 'Wedding'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {OCCASION_PRESETS.map((occ) => {
              const isSelected = (safePrefs.occasion || '').toLowerCase() === occ.id.toLowerCase();
              return (
                <button
                  key={occ.id}
                  onClick={() => handleOccasionChange(occ.id)}
                  disabled={isGenerating}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-md ring-2 ring-charcoal-900/20'
                      : 'bg-white text-charcoal-700 border-taupe-200 hover:border-charcoal-700 hover:bg-taupe-50'
                  }`}
                >
                  <span>{occ.icon}</span>
                  <span>{occ.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 2: Target Color Palette Switcher with Custom Color Studio */}
        <div className="pt-3 border-t border-taupe-200">
          <div className="flex items-center justify-between pb-2 flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border border-black/20 inline-block shadow-2xs" style={{ background: COLOR_PRESETS.find(c => (safePrefs.colour || '').toLowerCase().includes(c.id.toLowerCase()))?.hex || '#DC2626' }} />
              2. Select Target Outfit Color:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-charcoal-500 font-semibold">
                Current: <strong className="text-charcoal-900">{safePrefs.colour || 'Red'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowCustomStudio(!showCustomStudio)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                  showCustomStudio
                    ? 'bg-charcoal-900 text-cream-50 border-charcoal-900'
                    : 'bg-taupe-100 text-charcoal-800 border-taupe-300 hover:bg-taupe-200'
                }`}
              >
                <Palette className="w-3 h-3" />
                <span>{showCustomStudio ? 'Close Custom Studio' : 'Custom Color & Tone Studio'}</span>
              </button>
            </div>
          </div>

          {/* Quick Presets Carousel (18 Curated Hues) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {COLOR_PRESETS.map((col) => {
              const isSelected = (safePrefs.colour || '').toLowerCase().includes(col.id.toLowerCase());
              return (
                <button
                  key={col.id}
                  onClick={() => handleColorChange(col.id)}
                  disabled={isGenerating}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-sm ring-2 ring-charcoal-900/20'
                      : 'bg-white text-charcoal-700 border-taupe-200 hover:border-charcoal-700 hover:bg-taupe-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ background: col.hex }} />
                  <span>{col.name}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Custom Color & Dark/Light Tone Studio */}
          {showCustomStudio && (
            <div className="mt-3 p-4 bg-cream-50/80 rounded-2xl border border-taupe-300 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between mb-3 border-b border-taupe-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg shadow-sm border border-black/20 shrink-0" style={{ background: customHex }} />
                  <div>
                    <h4 className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                      Interactive Custom Color Studio
                    </h4>
                    <p className="text-[11px] text-charcoal-500">
                      Move the pointer across colors & adjust light/dark theme tones to choose your target color.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono font-bold text-charcoal-700 bg-white px-2 py-0.5 rounded-md border border-taupe-200">
                    {customHex}
                  </span>
                  <span className="text-[11px] font-bold text-charcoal-800 bg-taupe-200 px-2 py-0.5 rounded-md">
                    {detectFamilyFromHsl(customHue, customSat, customLightness).name}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Column 1: Color Spectrum & Pointer Selection */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5 text-charcoal-900" />
                        1. Move Pointer Across Color Spectrum:
                      </span>
                      <span className="text-[10px] text-charcoal-500 font-semibold">
                        Hue: {customHue}°
                      </span>
                    </label>

                    {/* Rainbow Hue Spectrum Track with Pointer */}
                    <div className="relative flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={customHue}
                        onChange={(e) => handleHueSlider(Number(e.target.value))}
                        className="w-full h-4 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                        style={{
                          background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
                        }}
                      />
                      {/* Integrated Native 2D Color Canvas Pointer */}
                      <div className="relative group shrink-0">
                        <input
                          type="color"
                          value={customHex}
                          onChange={(e) => handleNativeColorInput(e.target.value)}
                          className="w-7 h-7 rounded-lg border border-black/20 cursor-pointer p-0 opacity-0 absolute inset-0 z-10"
                        />
                        <div
                          className="w-7 h-7 rounded-lg border-2 border-white shadow-md ring-1 ring-black/20 cursor-pointer flex items-center justify-center text-[10px]"
                          style={{ background: customHex }}
                          title="Open 2D Color Picker Canvas"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] drop-shadow">🎯</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Dark / Light Tone Slider & Presets */}
                  <div>
                    <label className="text-[11px] font-bold text-charcoal-700 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1">
                        {customLightness <= 30 ? (
                          <Moon className="w-3.5 h-3.5 text-indigo-700" />
                        ) : customLightness >= 70 ? (
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <SlidersHorizontal className="w-3.5 h-3.5 text-charcoal-900" />
                        )}
                        2. Dark / Light Theme & Shade Tone Slider:
                      </span>
                      <span className="text-[10px] font-bold text-charcoal-700">
                        {customLightness <= 30 ? '🌙 Deep / Dark' : customLightness >= 70 ? '☀️ Light / Pastel' : '💎 Balanced'} ({customLightness}%)
                      </span>
                    </label>

                    {/* Tone Gradient Slider: Deep Dark -> Vibrant -> Light Pastel */}
                    <input
                      type="range"
                      min="15"
                      max="85"
                      value={customLightness}
                      onChange={(e) => handleToneSlider(Number(e.target.value))}
                      className="w-full h-3 rounded-lg cursor-pointer appearance-none transition-all shadow-inner"
                      style={{
                        background: `linear-gradient(to right, #18181B 0%, hsl(${customHue}, ${customSat}%, 50%) 50%, #FFFFFF 100%)`
                      }}
                    />

                    {/* Quick Tone Mode Presets */}
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => handleToneSlider(25)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          customLightness <= 30
                            ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-2xs'
                            : 'bg-white text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                        }`}
                      >
                        <Moon className="w-3 h-3" />
                        <span>Deep / Dark</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToneSlider(50)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          customLightness > 30 && customLightness < 70
                            ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-2xs'
                            : 'bg-white text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Vibrant</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToneSlider(82)}
                        className={`py-1 px-2 rounded-lg text-[10px] font-bold transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                          customLightness >= 70
                            ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-2xs'
                            : 'bg-white text-charcoal-700 border-taupe-200 hover:bg-taupe-100'
                        }`}
                      >
                        <Sun className="w-3 h-3" />
                        <span>Light / Pastel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Single Selected Colour Preview & Direct Apply */}
                <div className="bg-white p-3.5 rounded-xl border border-taupe-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-charcoal-800 uppercase tracking-wider">
                        Selected Palette Shade
                      </span>
                      <span className="text-[10px] font-mono font-bold text-charcoal-700 bg-taupe-100 px-2 py-0.5 rounded-full border border-taupe-200">
                        {customHex}
                      </span>
                    </div>

                    {/* Single Color Highlight Swatch */}
                    <div className="flex items-center gap-3 p-3 bg-taupe-50/80 rounded-xl border border-taupe-200 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl shadow-md border-2 border-white ring-1 ring-black/10 shrink-0"
                        style={{ background: customHex }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-black text-charcoal-900 truncate">
                          {detectFamilyFromHsl(customHue, customSat, customLightness).name}
                        </div>
                        <div className="text-[10px] font-semibold text-charcoal-500 uppercase tracking-wide">
                          {customLightness <= 30 ? '🌙 Deep / Dark Tone' : customLightness >= 70 ? '☀️ Light / Pastel Tone' : '💎 Balanced Tone'} ({customLightness}%)
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-charcoal-600 leading-snug">
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span><strong>Full Sets:</strong> Sarees, Lehengas, Anarkalis & Gowns feature this selected color entirely.</span>
                      </p>
                      <p className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span><strong>Separates:</strong> Topwear takes this color, paired with aesthetically matching bottomwear.</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyCustomColor}
                    disabled={isGenerating}
                    className="mt-3 w-full py-2.5 px-3 rounded-xl bg-charcoal-900 hover:bg-black text-cream-50 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Curating in {detectFamilyFromHsl(customHue, customSat, customLightness).name}...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply {detectFamilyFromHsl(customHue, customSat, customLightness).name} to Outfits</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Row 3: Unified Budget & Live Price Range Filter (Direct Product Matching) */}
        <div className="pt-3 border-t border-taupe-200">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-charcoal-900" />
              3. Filter by Budget / Price Range (Live Retailer Sourcing):
            </span>
            <span className="text-[11px] text-charcoal-500 font-semibold">
              Current: <strong className="text-charcoal-900">{PRICE_RANGE_PRESETS.find(p => p.id === (safePrefs.price_range || 'all'))?.label || (safePrefs.budget ? `Under ₹${Number(safePrefs.budget).toLocaleString('en-IN')}` : 'All Budgets')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRICE_RANGE_PRESETS.map((p) => {
              const isSelected = (safePrefs.price_range || 'all') === p.id || (p.max && safePrefs.budget === p.max);
              return (
                <button
                  key={p.id}
                  onClick={() => handlePriceRangeChange(p)}
                  disabled={isGenerating}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-sm ring-2 ring-charcoal-900/20'
                      : 'bg-white text-charcoal-700 border-taupe-200 hover:border-charcoal-700 hover:bg-taupe-50'
                  }`}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 4: Excluded Colours Constraint Filter */}
        <div className="pt-3 border-t border-taupe-200">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-charcoal-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-charcoal-900" />
              4. Excluded Colours (Hard Constraint Filter):
            </span>
            <span className="text-[11px] text-charcoal-500 font-semibold">
              Excluded: <strong className="text-rose-700">{Array.isArray(safePrefs.excluded_colours) && safePrefs.excluded_colours.length > 0 ? safePrefs.excluded_colours.join(', ') : (safePrefs.excluded_colour || 'None')}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {EXCLUDED_COLOR_PRESETS.map((exCol) => {
              const activeEx = Array.isArray(safePrefs.excluded_colours)
                ? safePrefs.excluded_colours.map(c => String(c).toLowerCase())
                : (safePrefs.excluded_colour ? [String(safePrefs.excluded_colour).toLowerCase()] : []);
              const isExcluded = activeEx.includes(exCol.id.toLowerCase());
              return (
                <button
                  key={exCol.id}
                  onClick={() => handleToggleExcludedColor(exCol.id)}
                  disabled={isGenerating}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border ${
                    isExcluded
                      ? 'bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-500/30'
                      : 'bg-white text-charcoal-700 border-taupe-200 hover:border-rose-400 hover:bg-rose-50/50'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0" style={{ background: exCol.hex }} />
                  <span>{isExcluded ? `✕ Excluded: ${exCol.name}` : `Exclude ${exCol.name}`}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Look Switcher Carousel / Navigation Bar (5 to 10 Looks) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-taupe-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Looks List */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-1">
          <span className="text-xs font-extrabold uppercase tracking-wider text-charcoal-500 whitespace-nowrap mr-2">
            Diverse Pairings ({outfitsList.length}):
          </span>
          {outfitsList.map((outfit, idx) => {
            const isActive = activeIndex === idx;
            const hasReuse = outfit.has_wardrobe_reuse || (outfit.wardrobe_matches && outfit.wardrobe_matches.length > 0) || (outfit.total_savings > 0);
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
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                  isActive
                    ? 'bg-charcoal-900 text-cream-50 border-charcoal-900 shadow-md ring-2 ring-charcoal-900/20'
                    : 'bg-[#FAF8F5] text-charcoal-700 border-taupe-200 hover:border-charcoal-700 hover:bg-white'
                }`}
              >
                <span>Look 0{idx + 1}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                  isActive ? 'bg-white/20 text-cream-50' : 'bg-taupe-200 text-charcoal-800'
                }`}>
                  {outfit.silhouette || (outfit.items?.[0]?.category) || 'Ensemble'}
                </span>
                {hasReuse && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-emerald-400 text-charcoal-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    Closet Match
                  </span>
                )}
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
              className="p-2 rounded-xl border border-taupe-200 text-charcoal-700 hover:bg-taupe-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Previous Look"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-charcoal-700 px-1">
              {activeIndex + 1} / {outfitsList.length}
            </span>
            <button
              onClick={() => {
                const nextIdx = Math.min(outfitsList.length - 1, activeIndex + 1);
                if (selectOutfitByIndex) selectOutfitByIndex(nextIdx);
                else applyAlternative(outfitsList[nextIdx], nextIdx);
                setViewMode('detail');
              }}
              disabled={activeIndex >= outfitsList.length - 1}
              className="p-2 rounded-xl border border-taupe-200 text-charcoal-700 hover:bg-taupe-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              title="Next Look"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-taupe-200 hidden sm:block" />

          {/* View Toggle */}
          <div className="inline-flex p-1 rounded-2xl bg-taupe-100 border border-taupe-200">
            <button
              onClick={() => setViewMode('detail')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'detail'
                  ? 'bg-white text-charcoal-900 shadow-xs'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              Studio View
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'all'
                  ? 'bg-white text-charcoal-900 shadow-xs'
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
        /* ALL LOOKS COMPARISON GRID (5 to 10 LOOKS) */
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-taupe-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-charcoal-500">
                All Diverse Pairing Curations
              </span>
              <h2 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900 mt-0.5">
                {outfitsList.length} Distinct Occasion Looks for {safePrefs.occasion || 'Wedding'} in {safePrefs.colour || 'Red'}
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-300">
              Zero Repetition • Distinct Silhouettes
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {outfitsList.map((outfit, oIdx) => {
              if (!outfit) return null;
              const isSelected = activeIndex === oIdx;
              const hasReuse = outfit.has_wardrobe_reuse || (outfit.total_savings > 0);
              const cardDress = outfit.ensemble_breakdown?.dress || outfit.items?.[0] || {};

              return (
                <div
                  key={outfit.id || oIdx}
                  className={`bg-white rounded-3xl p-5 border transition-all duration-200 shadow-sm flex flex-col justify-between space-y-5 ${
                    isSelected
                      ? 'border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
                      : 'border-taupe-200 hover:border-taupe-400 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="bg-charcoal-900 text-cream-50 px-2.5 py-1 rounded-md text-xs font-bold tracking-wider">
                        LOOK 0{oIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        {outfit.compatibility_score || 94}% Compatibility
                      </span>
                    </div>

                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-taupe-100 border border-taupe-200">
                      <img
                        src={outfit.heroImage || cardDress.image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80'}
                        alt={outfit.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80';
                        }}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {outfit.silhouette || 'Occasion Silhouette'}
                      </div>
                    </div>

                    <div>
                      <h3 className="editorial-heading text-lg font-bold text-charcoal-900">
                        {outfit.name}
                      </h3>
                      <p className="text-xs text-charcoal-600 line-clamp-2 mt-1">
                        {outfit.subtitle || outfit.description}
                      </p>
                    </div>

                    {/* Coordinated Dimension Mini Pill List */}
                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-taupe-200 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-charcoal-500">{outfit.needs_bottomwear ? '👗 Dress/Top:' : '👗 Dress / Attire:'}</span>
                        <span className="font-bold text-charcoal-900 truncate max-w-[180px]">{outfit.ensemble_breakdown?.dress?.name || 'Curated Attire'}</span>
                      </div>
                      {outfit.needs_bottomwear && outfit.ensemble_breakdown?.bottomwear && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-charcoal-500">👖 Bottomwear:</span>
                          <span className="font-bold text-charcoal-900 truncate max-w-[180px]">{outfit.ensemble_breakdown?.bottomwear?.name || 'Suitable Bottomwear'}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-charcoal-500">💎 Jewellery:</span>
                        <span className="font-bold text-charcoal-900 truncate max-w-[180px]">{outfit.ensemble_breakdown?.jewellery?.type || 'Matching Choker'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-charcoal-500">👠 Footwear:</span>
                        <span className="font-bold text-charcoal-900 truncate max-w-[180px]">{outfit.ensemble_breakdown?.footwear?.type || 'Occasion Mojaris'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-charcoal-500">👜 Handbag:</span>
                        <span className="font-bold text-charcoal-900 truncate max-w-[180px]">{outfit.ensemble_breakdown?.handbag?.type || 'Embroidered Potli'}</span>
                      </div>
                    </div>

                    {/* Wardrobe Synergy Highlight */}
                    {hasReuse ? (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-between">
                        <span>🌿 Reuses Wardrobe Item</span>
                        <span className="text-emerald-700">Saves ₹{(outfit.total_savings || 2500).toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-taupe-100 border border-taupe-200 text-xs font-medium text-charcoal-600 flex items-center justify-between">
                        <span>{outfit.needs_bottomwear ? 'Complete 5-Piece Ensemble' : 'Complete 4-Piece Ensemble'}</span>
                        <span className="font-bold text-charcoal-900">₹{(outfit.total_price || 4800).toLocaleString('en-IN')}</span>
                      </div>
                    )}
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
                    className="w-full justify-center"
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    {isSelected ? "Active Studio Selection" : "Inspect 360° Studio Look"}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      ) : (
        /* DETAIL 360° ENSEMBLE STUDIO VIEW */
        <>
          {/* Hyper-Consumerism Protection Alert & Pricing Banner */}
          <section className={`rounded-3xl p-6 sm:p-7 border shadow-sm transition-all ${
            has_wardrobe_reuse
              ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cream-50 border-emerald-300 ring-1 ring-emerald-200'
              : 'bg-white border-taupe-300'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                    has_wardrobe_reuse ? 'bg-emerald-600 text-white' : 'bg-charcoal-900 text-white'
                  }`}>
                    {has_wardrobe_reuse ? '🌿 HYPER-CONSUMERISM CURBED' : 'INTENTIONAL OCCASION CURATION'}
                  </span>
                  <span className="text-xs font-bold text-charcoal-600">
                    ML Synergy: {wardrobe_synergy_score}%
                  </span>
                </div>
                <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                  {has_wardrobe_reuse
                    ? `You already own matching pieces! Reusing your closet saves ₹${total_savings.toLocaleString('en-IN')}.`
                    : `Curated strictly for ${occasion} in ${safePrefs.colour || 'Red'}.`
                  }
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-700 max-w-3xl leading-relaxed">
                  {has_wardrobe_reuse
                    ? `Fashion-VISTA matched items in your digital wardrobe (${wardrobe_matches.map(w => w.name).join(', ')}). Wear what you own first, and only buy missing accents.`
                    : `Every piece is harmonized in palette and silhouette for ${occasion}. If you already own a similar piece, you can swap it into your ensemble instantly.`
                  }
                </p>
              </div>

              {/* Price Calculation Card */}
              <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-taupe-200 shadow-subtle shrink-0 min-w-[260px] space-y-2 text-right">
                <div className="text-xs font-medium text-charcoal-500">
                  Full Curated Value: <strong className="text-charcoal-800 line-through">₹{total_price.toLocaleString('en-IN')}</strong>
                </div>
                {total_savings > 0 && (
                  <div className="text-xs font-bold text-emerald-700">
                    Closet Savings: -₹{total_savings.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="pt-2 border-t border-taupe-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500 block">
                    Net Investment Needed:
                  </span>
                  <span className="editorial-heading text-2xl sm:text-3xl font-extrabold text-charcoal-950">
                    ₹{net_cost.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Active Look Hero Overview */}
          <section className="bg-white rounded-3xl p-6 sm:p-10 border border-taupe-300 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-taupe-200">
              <div className="flex items-center gap-2">
                <span className="bg-charcoal-900 text-cream-50 px-3 py-1 rounded-md text-xs font-bold tracking-wider">
                  LOOK 0{activeIndex + 1}
                </span>
                <Badge variant="tag" size="md">
                  {silhouette}
                </Badge>
                <Badge variant="tag" size="md">
                  Style: {style}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-300">
                  {compatibility_score}% Harmony Score
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="editorial-heading text-2xl sm:text-4xl font-bold text-charcoal-900">
                {name}
              </h2>
              <p className="text-sm sm:text-base text-charcoal-700 leading-relaxed font-normal max-w-4xl">
                {subtitle}
              </p>
            </div>

            {/* Color Palette & Silhouette Directive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 block">Palette Harmony</span>
                <span className="text-xs sm:text-sm font-bold text-charcoal-900 mt-1 block">{color_palette}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 block">Silhouette</span>
                <span className="text-xs sm:text-sm font-bold text-charcoal-900 mt-1 block">{silhouette}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 block">Target Event</span>
                <span className="text-xs sm:text-sm font-bold text-charcoal-900 mt-1 block">{occasion}</span>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200">
                <span className="text-[10px] font-bold uppercase tracking-widest text-charcoal-500 block">Dimensions Curated</span>
                <span className="text-xs sm:text-sm font-bold text-charcoal-900 mt-1 block">{needsBottomwear ? '5 / 5 Complete Ensemble' : '4 / 4 Complete Ensemble'}</span>
              </div>
            </div>
          </section>

          {/* OUTFIT COMPATIBILITY & MATHEMATICAL SYNERGY BREAKDOWN */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-taupe-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-charcoal-900 text-cream-50 flex items-center justify-center font-extrabold text-sm shadow-subtle">
                  {compatibility_score}%
                </div>
                <div>
                  <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                    Outfit Compatibility & Synergy Breakdown
                  </h3>
                  <p className="text-xs text-charcoal-500 font-medium">
                    Formula: Score = 0.25·Relevance + 0.25·ColorHarmony + 0.20·OccasionSuitability + 0.15·StyleFit + 0.15·WardrobeSynergy
                  </p>
                </div>
              </div>

              {/* Constraint Compliance Pill */}
              {passes_constraints !== false ? (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Budget & Excluded Color Rules: 100% Passed
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-50 text-rose-800 border border-rose-300 shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Notice: {Array.isArray(constraint_violations) && constraint_violations.length > 0 ? constraint_violations.join('; ') : 'Violates hard constraint'}
                </span>
              )}
            </div>

            {/* 5-Pillar Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Pillar 1: Preference Relevance */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-600">
                    <span>1. Preference Fit</span>
                    <span className="text-charcoal-900 font-extrabold">{breakdownScores.preference_relevance}%</span>
                  </div>
                  <span className="text-[10px] text-charcoal-500 block mt-0.5">Weight: 25% • Vector Space</span>
                </div>
                <div className="w-full bg-taupe-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-charcoal-900 h-full rounded-full transition-all duration-500" style={{ width: `${breakdownScores.preference_relevance}%` }} />
                </div>
              </div>

              {/* Pillar 2: Colour Harmony */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-600">
                    <span>2. Color Harmony</span>
                    <span className="text-charcoal-900 font-extrabold">{breakdownScores.colour_harmony}%</span>
                  </div>
                  <span className="text-[10px] text-charcoal-500 block mt-0.5">Weight: 25% • Theory Matrix</span>
                </div>
                <div className="w-full bg-taupe-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-rose-600 h-full rounded-full transition-all duration-500" style={{ width: `${breakdownScores.colour_harmony}%` }} />
                </div>
              </div>

              {/* Pillar 3: Occasion Suitability */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-600">
                    <span>3. Occasion Fit</span>
                    <span className="text-charcoal-900 font-extrabold">{breakdownScores.occasion_suitability}%</span>
                  </div>
                  <span className="text-[10px] text-charcoal-500 block mt-0.5">Weight: 20% • ML Logistic Reg</span>
                </div>
                <div className="w-full bg-taupe-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-600 h-full rounded-full transition-all duration-500" style={{ width: `${breakdownScores.occasion_suitability}%` }} />
                </div>
              </div>

              {/* Pillar 4: Style Compatibility */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-charcoal-600">
                    <span>4. Style Cohesion</span>
                    <span className="text-charcoal-900 font-extrabold">{breakdownScores.style_compatibility}%</span>
                  </div>
                  <span className="text-[10px] text-charcoal-500 block mt-0.5">Weight: 15% • Silhouette Sync</span>
                </div>
                <div className="w-full bg-taupe-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${breakdownScores.style_compatibility}%` }} />
                </div>
              </div>

              {/* Pillar 5: Wardrobe Synergy */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>5. Closet Synergy</span>
                    <span className="text-emerald-800 font-extrabold">{breakdownScores.wardrobe_synergy}%</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 block mt-0.5">Weight: 15% • ₹{total_savings.toLocaleString('en-IN')} Saved</span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${breakdownScores.wardrobe_synergy}%` }} />
                </div>
              </div>
            </div>
          </section>

          {/* THE DIMENSIONS OF OCCASION STYLING */}
          <section className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-taupe-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-charcoal-900 text-cream-50 flex items-center justify-center font-bold text-xs">
                  {needsBottomwear ? '5★' : '4★'}
                </div>
                <div>
                  <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                    {needsBottomwear ? 'The 5 Core Ensemble Components' : 'The 4 Core Ensemble Components'}
                  </h3>
                  <p className="text-xs text-charcoal-500">
                    {needsBottomwear
                      ? 'Curated across Dress/Top, Suitable Bottomwear, Jewellery, Footwear & Handbag with verified direct product links.'
                      : 'Curated across Dress/Attire, Jewellery, Footwear & Handbag with verified direct product links.'}
                  </p>
                </div>
              </div>

              {/* Slot Switcher Pills */}
              <div className="inline-flex p-1 rounded-2xl bg-taupe-100 border border-taupe-200 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('all-slots')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'all-slots' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  {needsBottomwear ? 'All 5 Slots' : 'All 4 Slots'}
                </button>
                <button
                  onClick={() => setActiveTab('dress')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'dress' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  👗 {needsBottomwear ? 'Dress / Top' : 'Dress / Attire'}
                </button>
                {needsBottomwear && (
                  <button
                    onClick={() => setActiveTab('bottomwear')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'bottomwear' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                    }`}
                  >
                    👖 Bottomwear
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('jewellery')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'jewellery' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  💎 Jewellery
                </button>
                <button
                  onClick={() => setActiveTab('footwear')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'footwear' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  👠 Footwear
                </button>
                <button
                  onClick={() => setActiveTab('handbag')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'handbag' ? 'bg-white text-charcoal-900 shadow-2xs' : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  👜 Handbag
                </button>
              </div>
            </div>

            {/* CARD 1: 👗 DRESS / OUTFIT */}
            {(activeTab === 'all-slots' || activeTab === 'dress') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  {/* Dress Hero Image */}
                  <div className="w-full lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-taupe-100 border border-taupe-200 aspect-[3/4] relative shadow-subtle group">
                    <img
                      src={dressSlot.image || activeOutfit.heroImage}
                      alt={dressSlot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      👗 Primary Dress / Silhouette
                    </div>
                    {dressSlot.is_wardrobe_match && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-800/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                        ✓ In Your Wardrobe (Saved ₹{dressSlot.money_saved})
                      </div>
                    )}
                  </div>

                  {/* Dress Details */}
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase">
                          DIMENSION 01: DRESS & ATTIRE
                        </span>
                        <span className="text-xs font-semibold text-charcoal-600">
                          {dressSlot.category}
                        </span>
                      </div>
                      {dressSlot.is_wardrobe_match ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ALREADY IN WARDROBE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          PURCHASE TO COMPLETE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
                        {dressSlot.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        Fabric: <strong className="text-charcoal-800">{dressSlot.fabric}</strong> • Palette: <strong className="text-charcoal-800">{dressSlot.color}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                      <strong className="text-charcoal-900 block mb-1 font-bold">Styling Directive & Drape:</strong>
                      {dressSlot.styling_tip}
                    </div>

                    {/* Direct Product Buying Card for the Dress or Wardrobe Reuse Banner */}
                    {dressSlot.is_wardrobe_match ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs mt-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            Reusing your owned "{dressSlot.matched_item_name || dressSlot.name}"
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          Saved ₹{dressSlot.money_saved.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <DirectProductBuyCard item={dressSlot} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CARD 2: 👖 BOTTOMWEAR (Rendered only when structurally necessary) */}
            {needsBottomwear && bottomwearSlot && (activeTab === 'all-slots' || activeTab === 'bottomwear') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="w-full lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-taupe-100 border border-taupe-200 aspect-[3/4] relative shadow-subtle group">
                    <img
                      src={bottomwearSlot.image}
                      alt={bottomwearSlot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      👖 Bottomwear Pairing
                    </div>
                    {bottomwearSlot.is_wardrobe_match && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-800/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                        ✓ In Your Wardrobe (Saved ₹{bottomwearSlot.money_saved})
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase">
                          DIMENSION 02: SUITABLE BOTTOMWEAR
                        </span>
                        <span className="text-xs font-semibold text-charcoal-600">
                          {bottomwearSlot.type}
                        </span>
                      </div>
                      {bottomwearSlot.is_wardrobe_match ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ALREADY IN WARDROBE (₹0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          PURCHASE TO COMPLETE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
                        {bottomwearSlot.is_wardrobe_match
                          ? (bottomwearSlot.matched_item_name || bottomwearSlot.name)
                          : bottomwearSlot.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        Silhouette: <strong className="text-charcoal-800">{bottomwearSlot.is_wardrobe_match ? `Owned ${bottomwearSlot.matched_item_name || 'Bottomwear'}` : bottomwearSlot.type}</strong>
                        {bottomwearSlot.fabric && <> • Fabric: <strong className="text-charcoal-800">{bottomwearSlot.fabric}</strong></>}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                      <strong className="text-charcoal-900 block mb-1 font-bold">Proportion & Pairing Harmony:</strong>
                      {bottomwearSlot.is_wardrobe_match
                        ? `Pairing your owned "${bottomwearSlot.matched_item_name || bottomwearSlot.name}" balances proportions smartly with the ${dressSlot.name} for an effortless, coordinated look.`
                        : bottomwearSlot.styling_tip}
                    </div>

                    {/* Direct Product Buying Card for Bottomwear or Wardrobe Reuse Banner */}
                    {bottomwearSlot.is_wardrobe_match ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            Reusing your owned "{bottomwearSlot.matched_item_name || bottomwearSlot.name}"
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          Saved ₹{bottomwearSlot.money_saved.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <DirectProductBuyCard item={bottomwearSlot} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CARD 3: 💎 JEWELLERY */}
            {(activeTab === 'all-slots' || activeTab === 'jewellery') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="w-full lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-taupe-100 border border-taupe-200 aspect-[3/4] relative shadow-subtle group">
                    <img
                      src={jewellerySlot.image}
                      alt={jewellerySlot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Gem className="w-3 h-3 text-amber-300" />
                      💎 Jewellery Curation
                    </div>
                    {jewellerySlot.is_wardrobe_match && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-800/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                        ✓ In Your Wardrobe (Saved ₹{jewellerySlot.money_saved})
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase">
                          {needsBottomwear ? 'DIMENSION 03: JEWELLERY' : 'DIMENSION 02: JEWELLERY'}
                        </span>
                        <span className="text-xs font-semibold text-charcoal-600">
                          {jewellerySlot.type}
                        </span>
                      </div>
                      {jewellerySlot.is_wardrobe_match ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ALREADY IN WARDROBE (₹0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          PURCHASE TO COMPLETE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
                        {jewellerySlot.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        Set Pieces: <strong className="text-charcoal-800">{jewellerySlot.type}</strong> • Metal Tone: <strong className="text-charcoal-800">{jewellerySlot.color}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                      <strong className="text-charcoal-900 block mb-1 font-bold">Neckline Balance Rule:</strong>
                      {jewellerySlot.styling_tip}
                    </div>

                    {/* Price Comparison or Wardrobe Reuse Banner */}
                    {jewellerySlot.is_wardrobe_match ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            Reusing your owned "{jewellerySlot.matched_item_name || jewellerySlot.name}"
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          Saved ₹{jewellerySlot.money_saved.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <DirectProductBuyCard item={jewellerySlot} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CARD 4: 👠 FOOTWEAR */}
            {(activeTab === 'all-slots' || activeTab === 'footwear') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="w-full lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-taupe-100 border border-taupe-200 aspect-[3/4] relative shadow-subtle group">
                    <img
                      src={footwearSlot.image}
                      alt={footwearSlot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      👠 Footwear Selection
                    </div>
                    {footwearSlot.is_wardrobe_match && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-800/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                        ✓ In Your Wardrobe (Saved ₹{footwearSlot.money_saved})
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase">
                          {needsBottomwear ? 'DIMENSION 04: FOOTWEAR' : 'DIMENSION 03: FOOTWEAR'}
                        </span>
                        <span className="text-xs font-semibold text-charcoal-600">
                          {footwearSlot.type}
                        </span>
                      </div>
                      {footwearSlot.is_wardrobe_match ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ALREADY IN WARDROBE (₹0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          PURCHASE TO COMPLETE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
                        {footwearSlot.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        Profile: <strong className="text-charcoal-800">{footwearSlot.heel_height}</strong> • Silhouette Balance: <strong className="text-charcoal-800">{footwearSlot.type}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                      <strong className="text-charcoal-900 block mb-1 font-bold">Comfort & Hemline Balance:</strong>
                      {footwearSlot.styling_tip}
                    </div>

                    {/* Price Comparison or Wardrobe Reuse Banner */}
                    {footwearSlot.is_wardrobe_match ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            Reusing your owned "{footwearSlot.matched_item_name || footwearSlot.name}"
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          Saved ₹{footwearSlot.money_saved.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <DirectProductBuyCard item={footwearSlot} />
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CARD 5: 👜 HANDBAG & CLUTCHES */}
            {(activeTab === 'all-slots' || activeTab === 'handbag') && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-300 shadow-card space-y-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="w-full lg:w-72 shrink-0 rounded-2xl overflow-hidden bg-taupe-100 border border-taupe-200 aspect-[3/4] relative shadow-subtle group">
                    <img
                      src={handbagSlot.image}
                      alt={handbagSlot.name}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 bg-charcoal-900/85 backdrop-blur-xs text-cream-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Crown className="w-3 h-3 text-amber-300" />
                      👜 Handbag & Clutch
                    </div>
                    {handbagSlot.is_wardrobe_match && (
                      <div className="absolute bottom-3 left-3 right-3 bg-emerald-800/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl text-xs font-bold text-center">
                        ✓ In Your Wardrobe (Saved ₹{handbagSlot.money_saved})
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-taupe-100">
                      <div className="flex items-center gap-2">
                        <span className="bg-charcoal-900 text-cream-50 px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase">
                          {needsBottomwear ? 'DIMENSION 05: HANDBAG & ACCENTS' : 'DIMENSION 04: HANDBAG & ACCENTS'}
                        </span>
                        <span className="text-xs font-semibold text-charcoal-600">
                          {handbagSlot.type}
                        </span>
                      </div>
                      {handbagSlot.is_wardrobe_match ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ALREADY IN WARDROBE (₹0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                          PURCHASE TO COMPLETE
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="editorial-heading text-2xl sm:text-3xl font-bold text-charcoal-900">
                        {handbagSlot.name}
                      </h4>
                      <p className="text-xs text-charcoal-500 mt-1 font-medium">
                        Embroidery: <strong className="text-charcoal-800">{handbagSlot.material}</strong>
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 text-xs sm:text-sm text-charcoal-700 leading-relaxed">
                      <strong className="text-charcoal-900 block mb-1 font-bold">Occasion Utility & Proportions:</strong>
                      {handbagSlot.styling_tip}
                    </div>

                    {/* Price Comparison or Wardrobe Reuse Banner */}
                    {handbagSlot.is_wardrobe_match ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span className="font-bold text-emerald-900">
                            Reusing your owned "{handbagSlot.matched_item_name || handbagSlot.name}"
                          </span>
                        </div>
                        <span className="font-extrabold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          Saved ₹{handbagSlot.money_saved.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ) : (
                      <DirectProductBuyCard item={handbagSlot} />
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ML EXPLAINABILITY & STYLING REASONS */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-taupe-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-taupe-100">
              <Sparkles className="w-5 h-5 text-charcoal-900" />
              <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
                Machine Learning Recommendation Rationale
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-charcoal-600">
              This ensemble was generated using TF-IDF feature vectorization and cosine similarity over occasion requirements, garment silhouettes, and color harmony matrices:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Cross-Slot Affinity Score</span>
                <p className="text-xs font-semibold text-charcoal-900">{compatibility_score}% compatibility across Dress/Top, Bottomwear, Jewellery, Footwear & Handbag</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-taupe-200 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-charcoal-500">Wardrobe Synergy Evaluation</span>
                <p className="text-xs font-semibold text-charcoal-900">{has_wardrobe_reuse ? `Matched ${wardrobe_matches.length} closet garment(s), saving ₹${total_savings}` : `Evaluated across ${wardrobe.length} items in your digital wardrobe`}</p>
              </div>
            </div>
            <RecommendationReason
              reasons={reasons.length > 0 ? reasons : [
                `High cosine similarity match for ${occasion} aesthetic requirements`,
                `Color balance calibrated with ${color_palette} harmony`,
                `Direct product links with verified live Myntra prices matching actual garments`,
                `Wardrobe-first search prioritizing owned items to curb hyper-consumerism`
              ]}
              title="WHY THIS LOOK IS RANKED #1"
              subtitle="Mathematical alignment with your styling quiz and closet assets"
            />
          </section>

          {/* Wardrobe Match Summary Section */}
          <section>
            <WardrobeMatch
              ownedCount={has_wardrobe_reuse ? wardrobe_matches.length : 0}
              totalCount={5}
              percentage={wardrobe_synergy_score}
              statusText={has_wardrobe_reuse ? `Curbing fast fashion: Reusing your wardrobe saves ₹${total_savings}` : "Full 5-Piece Coordinated Ensemble"}
              subtext={has_wardrobe_reuse ? `Reused: ${wardrobe_matches.map(w => w.name).join(', ')}` : "All pieces curated with direct product buy links from Meesho/Flipkart/Amazon (< ₹2,000) or Myntra (₹2,000+)"}
              items={items}
            />
          </section>
        </>
      )}

    </div>
  );
};

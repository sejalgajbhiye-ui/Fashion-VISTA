import React, { createContext, useContext, useState, useEffect } from 'react';
import { initialWardrobeData } from '../data/wardrobeData';
import { defaultRecommendation, alternateCurations } from '../data/recommendationData';
import { initialHistoryData } from '../data/historyData';
import { defaultUserProfile } from '../data/outfitData';
import {
  generateMLRecommendation,
  fetchWardrobeItems,
  createWardrobeItem,
  updateWardrobeItemAPI,
  deleteWardrobeItemAPI
} from '../services/api';

const FashionContext = createContext();

export const useFashion = () => {
  const context = useContext(FashionContext);
  if (!context) {
    throw new Error('useFashion must be used within a FashionProvider');
  }
  return context;
};

export const normalizeOutfitObject = (raw, idx = 0, defaultPrefs = {}) => {
  if (!raw) return null;
  const items = (raw.items || []).filter(Boolean).map(item => {
    const isOwned = Boolean(item.inWardrobe ?? item.owned ?? false);
    return {
      ...item,
      inWardrobe: isOwned,
      owned: isOwned,
      needed_to_buy: Boolean(item.needed_to_buy ?? !isOwned)
    };
  });

  const ownedCount = items.filter(i => i.inWardrobe).length;
  const totalCount = items.length;
  const coveragePct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 100;
  const missingItems = items.filter(i => !i.inWardrobe);
  const missing = missingItems[0] || null;
  const missingNames = missingItems.map(i => i.name);

  const wm = raw.wardrobe_match || raw.wardrobeMatch || {};
  const wardrobeMatch = {
    ownedCount: wm.matched_count ?? wm.ownedCount ?? ownedCount,
    totalCount: wm.required_count ?? wm.totalCount ?? totalCount,
    percentage: wm.percentage ?? coveragePct,
    statusText: wm.statusText || (coveragePct === 100 ? "Ready in your closet!" : "High Closet Synergy"),
    subtext: wm.subtext || (missingNames.length > 0 ? `Missing: ${missingNames.join(', ')}` : "All pieces in closet!")
  };

  const name = raw.name || `Look 0${idx + 1}: Curated Ensemble`;
  const subtitle = raw.subtitle || raw.description || `Coordinated ensemble tailored for ${raw.occasion || defaultPrefs.occasion || 'your event'}`;
  const heroImg = raw.heroImage || raw.image || defaultRecommendation.heroImage;

  return {
    id: raw.id || `rec-${idx + 1}-${Date.now()}`,
    number: String(idx + 1).padStart(2, '0'),
    name,
    subtitle,
    description: subtitle,
    occasion: raw.occasion || defaultPrefs.occasion || 'Wedding',
    style: raw.style || defaultPrefs.style || 'Traditional',
    season: raw.season || defaultPrefs.season || 'All Season',
    colour: raw.colour || (defaultPrefs.colour === 'Any' ? 'Balanced Palette' : `${defaultPrefs.colour || 'Red'} Harmony`),
    budget: raw.budget || defaultPrefs.budget || '2500',
    heroImage: heroImg,
    image: heroImg,
    composed_look_image: raw.composed_look_image || null,
    items,
    itemsSummary: items.length > 0 ? items.map(i => i.name).join(' + ') : 'Coordinated garment pieces',
    ownedCount: wardrobeMatch.ownedCount,
    totalCount: wardrobeMatch.totalCount,
    percentage: wardrobeMatch.percentage,
    wardrobeMatch,
    wardrobe_match: {
      matched_count: wardrobeMatch.ownedCount,
      required_count: wardrobeMatch.totalCount,
      percentage: wardrobeMatch.percentage,
      statusText: wardrobeMatch.statusText,
      subtext: wardrobeMatch.subtext
    },
    missingItem: missing ? {
      id: missing.id,
      name: missing.name,
      category: missing.slot || missing.category,
      colour: missing.colour,
      reason: `Completes the silhouette for ${raw.occasion || defaultPrefs.occasion || 'styling'}.`,
      image: missing.image
    } : null,
    reasons: raw.reasons && raw.reasons.length > 0 ? raw.reasons : [
      `Compatibility Score: ${raw.compatibility_score || 92}% based on color harmony & silhouette`,
      raw.color_harmony_explanation || 'Harmonious color balance across garment slots',
      `Uses ${wardrobeMatch.ownedCount} items from your wardrobe (${wardrobeMatch.percentage}% coverage)`,
      missingNames.length > 0 ? `Missing: ${missingNames.join(', ')}` : 'Zero new purchases needed'
    ],
    compatibility_score: raw.compatibility_score || 92,
    color_score: raw.color_score || 90,
    selectedOutfitIndex: idx
  };
};

export const FashionProvider = ({ children }) => {
  // 1. Wardrobe State
  const [wardrobe, setWardrobe] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_wardrobe');
      return saved ? JSON.parse(saved) : initialWardrobeData;
    } catch {
      return initialWardrobeData;
    }
  });

  // Fetch persistent wardrobe from SQLite backend on mount
  useEffect(() => {
    const syncBackendWardrobe = async () => {
      try {
        const backendItems = await fetchWardrobeItems();
        if (backendItems && Array.isArray(backendItems) && backendItems.length > 0) {
          setWardrobe(backendItems);
        }
      } catch (e) {
        console.warn('Backend wardrobe sync fallback to local cache:', e);
      }
    };
    syncBackendWardrobe();
  }, []);

  useEffect(() => {
    localStorage.setItem('fashion_vista_wardrobe', JSON.stringify(wardrobe));
  }, [wardrobe]);

  // 2. User Preferences for AI Stylist
  const [preferences, setPreferences] = useState(() => {
    const defaultPrefs = {
      occasion: 'Wedding',
      colour: 'Red',
      style: 'Traditional',
      outfitType: 'Full Outfit',
      season: 'All Season'
    };
    try {
      const saved = localStorage.getItem('fashion_vista_preferences');
      const parsed = saved ? JSON.parse(saved) : null;
      return (parsed && typeof parsed === 'object') ? { ...defaultPrefs, ...parsed } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('fashion_vista_preferences', JSON.stringify(preferences));
    } catch (e) {
      console.warn('LocalStorage error caching preferences:', e);
    }
  }, [preferences]);

  // 3. All Outfits & Current AI Recommendation
  const [allOutfits, setAllOutfits] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_all_outfits');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((o, i) => normalizeOutfitObject(o, i)).filter(Boolean);
      }
    } catch (e) {
      console.warn('Failed to parse cached all_outfits:', e);
    }
    return [normalizeOutfitObject(defaultRecommendation, 0)];
  });

  useEffect(() => {
    try {
      if (allOutfits && allOutfits.length > 0) {
        localStorage.setItem('fashion_vista_all_outfits', JSON.stringify(allOutfits));
      }
    } catch (e) {
      console.warn('LocalStorage error caching all_outfits:', e);
    }
  }, [allOutfits]);

  const [currentRecommendation, setCurrentRecommendation] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_recommendation');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return normalizeOutfitObject(parsed, parsed.selectedOutfitIndex || 0);
      }
    } catch (e) {
      console.warn('Failed to parse cached recommendation:', e);
    }
    return normalizeOutfitObject(defaultRecommendation, 0);
  });

  useEffect(() => {
    try {
      if (currentRecommendation) {
        const cleanToStore = {
          ...currentRecommendation,
          allOutfits: undefined
        };
        localStorage.setItem('fashion_vista_recommendation', JSON.stringify(cleanToStore));
      }
    } catch (e) {
      console.warn('LocalStorage error caching recommendation:', e);
    }
  }, [currentRecommendation]);

  // 4. Try Existing selections (by slot: top, bottom, shoes, layer)
  const [tryExistingSelection, setTryExistingSelection] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_try_existing');
      return saved ? JSON.parse(saved) : {
        top: 1,      // Black Oversized Top
        bottom: 2,   // Blue Straight-Fit Jeans
        shoes: 3,    // White Minimalist Sneakers
        layer: null  // Missing / unselected
      };
    } catch {
      return { top: 1, bottom: 2, shoes: 3, layer: null };
    }
  });

  useEffect(() => {
    localStorage.setItem('fashion_vista_try_existing', JSON.stringify(tryExistingSelection));
  }, [tryExistingSelection]);

  // 5. User full-body photo for Virtual Try-On
  const defaultUserPhoto = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";
  const [userPhoto, setUserPhotoState] = useState(() => {
    return localStorage.getItem('fashion_vista_user_photo') || defaultUserPhoto;
  });

  const setUserPhoto = (photo) => {
    setUserPhotoState(photo);
    if (photo) {
      localStorage.setItem('fashion_vista_user_photo', photo);
    } else {
      localStorage.removeItem('fashion_vista_user_photo');
    }
  };

  // 6. Missing item product screenshot
  const defaultMissingPhoto = "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=700&q=80";
  const [missingItemPhoto, setMissingItemPhotoState] = useState(() => {
    return localStorage.getItem('fashion_vista_missing_photo') || defaultMissingPhoto;
  });

  const setMissingItemPhoto = (photo) => {
    setMissingItemPhotoState(photo);
    if (photo) {
      localStorage.setItem('fashion_vista_missing_photo', photo);
    } else {
      localStorage.removeItem('fashion_vista_missing_photo');
    }
  };

  // 6.5 AI Virtual Try-On State & Results
  const [tryOnResult, setTryOnResultState] = useState(() => {
    try {
      const saved = sessionStorage.getItem('fashion_vista_try_on_result');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const setTryOnResult = (res) => {
    setTryOnResultState(res);
    try {
      if (res) {
        sessionStorage.setItem('fashion_vista_try_on_result', JSON.stringify(res));
      } else {
        sessionStorage.removeItem('fashion_vista_try_on_result');
      }
    } catch (e) {
      console.warn('SessionStorage note for tryOnResult:', e);
    }
  };

  const [selectedGarmentForTryOn, setSelectedGarmentForTryOn] = useState(null);

  // 6.6 User Uploaded Custom Garment for Virtual Try-On
  const [customGarmentPhoto, setCustomGarmentPhotoState] = useState(() => {
    return localStorage.getItem('fashion_vista_custom_garment_photo') || null;
  });

  const setCustomGarmentPhoto = (photo) => {
    setCustomGarmentPhotoState(photo);
    if (photo) {
      localStorage.setItem('fashion_vista_custom_garment_photo', photo);
    } else {
      localStorage.removeItem('fashion_vista_custom_garment_photo');
    }
  };

  const [customGarmentName, setCustomGarmentNameState] = useState(() => {
    return localStorage.getItem('fashion_vista_custom_garment_name') || "";
  });

  const setCustomGarmentName = (name) => {
    setCustomGarmentNameState(name);
    if (name) {
      localStorage.setItem('fashion_vista_custom_garment_name', name);
    } else {
      localStorage.removeItem('fashion_vista_custom_garment_name');
    }
  };

  // 7. History
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_history');
      return saved ? JSON.parse(saved) : initialHistoryData;
    } catch {
      return initialHistoryData;
    }
  });

  useEffect(() => {
    localStorage.setItem('fashion_vista_history', JSON.stringify(history));
  }, [history]);

  // 8. Profile
  const [userProfile, setUserProfile] = useState(defaultUserProfile);

  // 9. Toast Notification System
  const [toast, setToast] = useState({ isVisible: false, message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    setToast({ isVisible: true, message, type });
    setTimeout(() => {
      setToast({ isVisible: false, message: '', type: 'info' });
    }, 3500);
  };

  // Helper actions
  const addWardrobeItem = async (newItem) => {
    const tempId = newItem.id || `item-${Date.now()}`;
    const localItem = {
      ...newItem,
      id: tempId,
      owned: true,
      addedDate: new Date().toISOString().split('T')[0]
    };

    // Optimistically update local state
    setWardrobe(prev => [localItem, ...prev.filter(i => i.id !== tempId)]);
    showToast(`Added "${localItem.name}" to your wardrobe!`, 'success');

    // Persist to backend SQLite
    try {
      const persisted = await createWardrobeItem(localItem);
      if (persisted && persisted.id) {
        setWardrobe(prev => prev.map(i => i.id === tempId ? { ...persisted, owned: true } : i));
      }
    } catch (err) {
      console.warn('Backend SQLite persistence error, keeping in local storage:', err.message);
    }
    return localItem;
  };

  const deleteWardrobeItem = async (id) => {
    const itemToDelete = wardrobe.find(item => item.id === id);
    setWardrobe(prev => prev.filter(item => item.id !== id));
    showToast(`Removed "${itemToDelete?.name || 'Item'}" from your wardrobe`, 'info');

    try {
      await deleteWardrobeItemAPI(id);
    } catch (err) {
      console.warn('Backend SQLite delete error:', err.message);
    }
  };

  const updateWardrobeItem = async (id, updatedFields) => {
    setWardrobe(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    showToast('Wardrobe item updated', 'success');

    try {
      await updateWardrobeItemAPI(id, updatedFields);
    } catch (err) {
      console.warn('Backend SQLite update error:', err.message);
    }
  };

  const selectTryExistingItem = (slot, itemId) => {
    setTryExistingSelection(prev => ({
      ...prev,
      [slot]: prev[slot] === itemId ? null : itemId
    }));
  };

  // Generate dynamic recommendation matching user choices
  const generateRecommendation = async (newPrefs) => {
    setPreferences(newPrefs);

    // Attempt real ML recommendation from Flask backend
    let mlRec = null;
    try {
      mlRec = await generateMLRecommendation(newPrefs, wardrobe);
    } catch (err) {
      console.warn("Backend ML recommendation unavailable, falling back to local curation:", err);
    }

    let rawOutfits = [];
    if (mlRec && Array.isArray(mlRec.recommendations) && mlRec.recommendations.length > 0) {
      rawOutfits = mlRec.recommendations;
    } else if (mlRec && mlRec.items && mlRec.items.length >= 3) {
      rawOutfits = [mlRec, ...(mlRec.alternatives || [])];
    } else if (newPrefs.style === 'Traditional' || newPrefs.occasion === 'Traditional' || newPrefs.occasion === 'Wedding') {
      rawOutfits = [alternateCurations.traditional, ...(alternateCurations.traditional.alternatives || [])];
    } else if (newPrefs.style === 'Formal' || newPrefs.occasion === 'Office') {
      rawOutfits = [alternateCurations.formal, ...(alternateCurations.formal.alternatives || [])];
    } else {
      rawOutfits = [defaultRecommendation, ...(defaultRecommendation.alternatives || [])];
    }

    const cleanOutfits = rawOutfits
      .map((o, idx) => normalizeOutfitObject(o, idx, newPrefs))
      .filter(Boolean);

    const finalOutfits = cleanOutfits.length > 0
      ? cleanOutfits
      : [normalizeOutfitObject(defaultRecommendation, 0, newPrefs)];

    const primaryOutfit = {
      ...finalOutfits[0],
      selectedOutfitIndex: 0,
      alternatives: finalOutfits.slice(1)
    };

    setAllOutfits(finalOutfits);
    setCurrentRecommendation(primaryOutfit);

    // Also record in history safely
    try {
      const historyEntry = {
        id: `hist-${Date.now()}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
        outfitName: primaryOutfit.name,
        occasion: primaryOutfit.occasion,
        style: primaryOutfit.style,
        wardrobeMatch: `${primaryOutfit.wardrobeMatch.ownedCount} / ${primaryOutfit.wardrobeMatch.totalCount} owned`,
        ownedCount: primaryOutfit.wardrobeMatch.ownedCount,
        totalCount: primaryOutfit.wardrobeMatch.totalCount,
        percentage: primaryOutfit.wardrobeMatch.percentage,
        missingItems: primaryOutfit.missingItem ? [primaryOutfit.missingItem.name] : [],
        image: primaryOutfit.heroImage,
        outfitSummary: (primaryOutfit.items || []).map(i => i.name).join(' + '),
        decision: 'AI Recommendation generated from personal stylist questionnaire'
      };

      setHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
    } catch (hErr) {
      console.warn('History recording note:', hErr);
    }

    showToast('AI Curated your outfit!', 'success');
  };

  const applyAlternative = (alt, altIndex = null) => {
    if (!alt) return;
    const targetIdx = altIndex !== null
      ? altIndex
      : (allOutfits ? allOutfits.findIndex(o => o.id === alt.id) : 0);
    const resolvedIdx = targetIdx >= 0 ? targetIdx : 0;
    const alternativesList = (allOutfits || []).filter((_, i) => i !== resolvedIdx);

    const activeObj = (allOutfits && allOutfits[resolvedIdx])
      ? allOutfits[resolvedIdx]
      : normalizeOutfitObject(alt, resolvedIdx, preferences);

    setCurrentRecommendation({
      ...activeObj,
      selectedOutfitIndex: resolvedIdx,
      alternatives: alternativesList
    });
    showToast(`Loaded "${activeObj.name}" as active outfit`, 'info');
  };

  const selectOutfitByIndex = (index) => {
    if (allOutfits && allOutfits[index]) {
      const selected = allOutfits[index];
      const alternativesList = allOutfits.filter((_, i) => i !== index);
      setCurrentRecommendation({
        ...selected,
        selectedOutfitIndex: index,
        alternatives: alternativesList
      });
      showToast(`Switched to "${selected.name}"`, 'info');
    }
  };

  const saveTryOnToHistory = (resultData) => {
    if (!resultData || !resultData.result_image) return;
    const garmentName = resultData.garment_name || 'Selected Garment';
    const historyEntry = {
      id: `tryon-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      outfitName: `Virtual Try-On: ${garmentName}`,
      occasion: currentRecommendation?.occasion || 'Casual Fitting',
      style: currentRecommendation?.style || 'Personal Fit',
      wardrobeMatch: 'AI Try-On Synthesized',
      ownedCount: 1,
      totalCount: 1,
      percentage: 100,
      missingItems: [],
      image: resultData.result_image,
      outfitSummary: `Neural geometric try-on with ${garmentName}`,
      decision: `AI Virtual Try-On (${resultData.metrics?.inference_time_sec ? resultData.metrics.inference_time_sec + 's' : 'Synthesized'})`
    };

    setHistory(prev => [historyEntry, ...prev.slice(0, 19)]);
    showToast(`Saved "${garmentName}" Virtual Try-On to your history!`, 'success');
  };

  // Computed stats
  const wardrobeStats = {
    total: wardrobe.length,
    tops: wardrobe.filter(i => i.category === 'Tops').length,
    bottoms: wardrobe.filter(i => i.category === 'Bottoms').length,
    dresses: wardrobe.filter(i => i.category === 'Dresses').length,
    shoes: wardrobe.filter(i => i.category === 'Shoes').length,
    accessories: wardrobe.filter(i => i.category === 'Accessories').length,
    others: wardrobe.filter(i => !['Tops', 'Bottoms', 'Dresses', 'Shoes', 'Accessories'].includes(i.category)).length,
  };

  return (
    <FashionContext.Provider
      value={{
        wardrobe,
        wardrobeStats,
        addWardrobeItem,
        deleteWardrobeItem,
        updateWardrobeItem,
        preferences,
        setPreferences,
        currentRecommendation,
        allOutfits: (allOutfits && allOutfits.length > 0) ? allOutfits : [currentRecommendation || normalizeOutfitObject(defaultRecommendation, 0)],
        selectOutfitByIndex,
        generateRecommendation,
        applyAlternative,
        tryExistingSelection,
        selectTryExistingItem,
        userPhoto,
        setUserPhoto,
        missingItemPhoto,
        setMissingItemPhoto,
        tryOnResult,
        setTryOnResult,
        selectedGarmentForTryOn,
        setSelectedGarmentForTryOn,
        customGarmentPhoto,
        setCustomGarmentPhoto,
        customGarmentName,
        setCustomGarmentName,
        saveTryOnToHistory,
        history,
        userProfile,
        setUserProfile,
        toast,
        showToast,
      }}
    >
      {children}
    </FashionContext.Provider>
  );
};


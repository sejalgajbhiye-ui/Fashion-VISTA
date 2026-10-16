import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { useAuth } from './AuthContext';
import {
  fetchSupabaseWardrobeItems,
  insertSupabaseWardrobeItem,
  updateSupabaseWardrobeItem,
  deleteSupabaseWardrobeItem
} from '../services/supabaseWardrobe';
import { synthesizeLookTryOn } from '../utils/tryOnGenerator';

const FashionContext = createContext();

export const useFashion = () => {
  const context = useContext(FashionContext);
  if (!context) {
    throw new Error('useFashion must be used within a FashionProvider');
  }
  return context;
};

export const normalizeColorFamily = (colorStr) => {
  if (!colorStr || typeof colorStr !== 'string') return '';
  const c = colorStr.toLowerCase().trim();
  if (c === 'any' || c === 'all' || c === 'balanced palette') return '';

  if (c.includes('black') || c.includes('charcoal')) return 'black';
  if (c.includes('white') || c.includes('cream') || c.includes('ivory') || c.includes('off-white')) return 'white';
  if (c.includes('yellow') || c.includes('mustard') || c.includes('lemon')) return 'yellow';
  if (c.includes('gold') || c.includes('golden')) return 'gold';
  if (c.includes('blue') || c.includes('navy') || c.includes('indigo') || c.includes('azure') || c.includes('sky') || c.includes('cyan') || c.includes('teal')) return 'blue';
  if (c.includes('red') || c.includes('maroon') || c.includes('crimson') || c.includes('burgundy') || c.includes('wine')) return 'red';
  if (c.includes('pink') || c.includes('rose') || c.includes('blush') || c.includes('magenta') || c.includes('fuchsia') || c.includes('salmon')) return 'pink';
  if (c.includes('green') || c.includes('olive') || c.includes('emerald') || c.includes('sage') || c.includes('mint')) return 'green';
  if (c.includes('grey') || c.includes('gray') || c.includes('silver') || c.includes('slate')) return 'grey';
  if (c.includes('brown') || c.includes('tan') || c.includes('camel') || c.includes('coffee') || c.includes('chocolate') || c.includes('rust')) return 'brown';
  if (c.includes('beige') || c.includes('khaki') || c.includes('nude') || c.includes('taupe') || c.includes('sand')) return 'beige';
  if (c.includes('purple') || c.includes('violet') || c.includes('lavender') || c.includes('plum') || c.includes('lilac')) return 'purple';
  if (c.includes('orange') || c.includes('peach') || c.includes('coral') || c.includes('tangerine')) return 'orange';

  return c;
};

export const checkColorMatch = (colorA, colorB, nameA = '', nameB = '') => {
  const famA = normalizeColorFamily(colorA) || normalizeColorFamily(nameA);
  const famB = normalizeColorFamily(colorB) || normalizeColorFamily(nameB);

  if (!famA || !famB) return false;
  return famA === famB;
};

export const matchOutfitWithWardrobe = (outfit, userWardrobe = []) => {
  if (!outfit) return null;
  const wardrobeList = Array.isArray(userWardrobe) ? userWardrobe : [];
  const usedWardrobeIds = new Set();

  const items = (outfit.items || []).filter(Boolean).map(item => {
    const slot = String(item.slot || item.category || '').toLowerCase();
    const itemColor = String(item.colour || item.color || '').toLowerCase();
    const itemName = String(item.name || '').toLowerCase();

    let matchedItem = null;

    for (const w of wardrobeList) {
      if (w.id && usedWardrobeIds.has(w.id)) continue;

      const wCat = String(w.category || '').toLowerCase().trim();
      const wSub = String(w.subcategory || wCat).toLowerCase().trim();
      const wName = String(w.name || '').toLowerCase().trim();
      const wColor = String(w.colour || w.color || '').toLowerCase().trim();

      // Strict category checks
      const isTopMatch = (slot === 'top' || slot === 'topwear') &&
        (wCat === 'tops' || wCat === 'top' || wSub.includes('shirt') || wSub.includes('top') || wSub.includes('kurti') || wSub.includes('kurta') || wSub.includes('tee')) &&
        !wCat.includes('dress') && !wSub.includes('saree') && !wName.includes('saree') && !wCat.includes('bottom') && !wCat.includes('shoe');

      const isBottomMatch = (slot === 'bottom' || slot === 'bottomwear') &&
        (wCat === 'bottoms' || wCat === 'bottom' || wSub.includes('jean') || wSub.includes('trouser') || wSub.includes('pant') || wSub.includes('skirt') || wSub.includes('palazzo') || wSub.includes('salwar')) &&
        !wCat.includes('top') && !wCat.includes('dress') && !wCat.includes('shoe');

      const isShoesMatch = (slot === 'shoes' || slot === 'footwear') &&
        (wCat === 'shoes' || wCat === 'footwear' || wSub.includes('shoe') || wSub.includes('sneaker') || wSub.includes('sandal') || wSub.includes('heel') || wSub.includes('boot') || wSub.includes('flat') || wSub.includes('jutti') || wSub.includes('loafer')) &&
        !wCat.includes('top') && !wCat.includes('bottom') && !wCat.includes('dress');

      const isLayerMatch = (slot === 'layer' || slot === 'outerwear') &&
        (wCat === 'accessories' || wCat === 'outerwear' || wName.includes('jacket') || wName.includes('coat') || wName.includes('blazer') || wName.includes('cardigan') || wName.includes('shrug') || wName.includes('hoodie')) &&
        !wCat.includes('shoes') && !wCat.includes('bottoms');

      const isDressMatch = (slot === 'dress' || slot === 'traditional') &&
        (wCat === 'dresses' || wCat === 'dress' || wSub.includes('saree') || wName.includes('saree') || wSub.includes('dress') || wName.includes('dress') || wSub.includes('anarkali') || wName.includes('anarkali')) &&
        !wCat.includes('shoes') && !wCat.includes('bottoms');

      if (isTopMatch || isBottomMatch || isShoesMatch || isLayerMatch || isDressMatch) {
        // Strict color match - must be in the same color family
        const colorMatch = checkColorMatch(itemColor, wColor, itemName, wName);

        if (colorMatch) {
          matchedItem = w;
          if (w.id) usedWardrobeIds.add(w.id);
          break;
        }
      }
    }

    const isOwned = Boolean(matchedItem);

    return {
      ...item,
      name: isOwned ? (matchedItem.name || item.name) : item.name,
      image: isOwned ? (matchedItem.image || item.image) : item.image,
      inWardrobe: isOwned,
      owned: isOwned,
      needed_to_buy: !isOwned,
      source: isOwned ? 'wardrobe' : 'online',
      source_label: isOwned ? 'From Your Wardrobe' : 'Shop Online',
      retailer: isOwned ? null : (item.retailer || 'Myntra'),
      price: isOwned ? null : (item.price || 1299),
      buy_link: isOwned ? null : (item.buy_link || item.buy_url || `https://www.myntra.com/${encodeURIComponent(item.name || '').replace(/%20/g, '-')}`),
      matchedWardrobeId: matchedItem ? matchedItem.id : null,
      matchedWardrobeName: matchedItem ? matchedItem.name : null,
      matchedWardrobeImage: matchedItem ? matchedItem.image : null
    };
  });


  const ownedCount = items.filter(i => i.inWardrobe).length;
  const totalCount = items.length;
  const coveragePct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;
  const missingItems = items.filter(i => !i.inWardrobe);
  const missing = missingItems[0] || null;
  const missingNames = missingItems.map(i => i.name);

  return {
    ...outfit,
    items,
    ownedCount,
    totalCount,
    percentage: coveragePct,
    wardrobeMatch: {
      ownedCount,
      totalCount,
      percentage: coveragePct,
      statusText: coveragePct === 100
        ? "Ready in your closet!"
        : ownedCount > 0
        ? `${ownedCount} of ${totalCount} pieces in your closet`
        : "None in your closet — purchase needed",
      subtext: missingNames.length > 0
        ? `Missing: ${missingNames.join(', ')}`
        : "All pieces in closet!"
    },
    wardrobe_match: {
      matched_count: ownedCount,
      required_count: totalCount,
      percentage: coveragePct,
      statusText: coveragePct === 100 ? "Ready in your closet!" : `${ownedCount}/${totalCount} in closet`,
      subtext: missingNames.length > 0 ? `Missing: ${missingNames.join(', ')}` : "All pieces in closet!"
    },
    missingItem: missing ? {
      id: missing.id,
      name: missing.name,
      category: missing.slot || missing.category,
      colour: missing.colour,
      reason: `Completes the silhouette for ${outfit.occasion || 'styling'}.`,
      image: missing.image
    } : null,
    reasons: [
      `Compatibility Score: ${outfit.compatibility_score || 92}% based on color harmony & silhouette`,
      outfit.color_harmony_explanation || 'Harmonious color balance across garment slots',
      `Uses ${ownedCount} items from your wardrobe (${coveragePct}% coverage)`,
      missingNames.length > 0 ? `Missing: ${missingNames.join(', ')}` : 'Zero new purchases needed'
    ]
  };
};

export const normalizeOutfitObject = (raw, idx = 0, defaultPrefs = {}, userWardrobe = []) => {
  if (!raw) return null;
  const name = raw.name || `Look 0${idx + 1}: Curated Ensemble`;
  const subtitle = raw.subtitle || raw.description || `Coordinated ensemble tailored for ${raw.occasion || defaultPrefs.occasion || 'your event'}`;
  const heroImg = raw.heroImage || raw.image || defaultRecommendation.heroImage;

  const baseOutfit = {
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
    user_tryon_image: raw.user_tryon_image || raw.tryonImage || null,
    tryonImage: raw.user_tryon_image || raw.tryonImage || null,
    user_photo: raw.user_photo || raw.userPhoto || null,
    items: raw.items || [],
    compatibility_score: raw.compatibility_score || 92,
    color_score: raw.color_score || 90,
    selectedOutfitIndex: idx
  };

  return matchOutfitWithWardrobe(baseOutfit, userWardrobe);
};

export const FashionProvider = ({ children }) => {
  const { user, isConfigured: isSupabaseConfigured } = useAuth();

  const getWardrobeKey = (u) => (u?.id ? `fashion_vista_wardrobe_${u.id}` : 'fashion_vista_wardrobe_guest');

  // 1. Wardrobe State — strictly per-user and defaults to empty array (never dummy clothes)
  const [wardrobe, setWardrobe] = useState(() => {
    try {
      localStorage.removeItem('fashion_vista_wardrobe'); // Purge legacy global dummy cache
      const key = getWardrobeKey(user);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Fetch persistent wardrobe from Supabase (if authenticated) or SQLite backend
  useEffect(() => {
    const syncWardrobe = async () => {
      const key = getWardrobeKey(user);
      try { localStorage.removeItem('fashion_vista_wardrobe'); } catch (_) {}

      // 1. Supabase Cloud Sync (if configured & authenticated)
      if (isSupabaseConfigured && user) {
        try {
          const cloudItems = await fetchSupabaseWardrobeItems(user.id);
          if (cloudItems !== null && Array.isArray(cloudItems)) {
            setWardrobe(cloudItems);
            try { localStorage.setItem(key, JSON.stringify(cloudItems)); } catch (_) {}
            return;
          }
        } catch (e) {
          console.warn('Supabase wardrobe sync fallback:', e);
        }
      }

      // 2. Backend SQLite Sync
      try {
        const backendItems = await fetchWardrobeItems();
        if (backendItems !== null && Array.isArray(backendItems)) {
          setWardrobe(backendItems);
          try { localStorage.setItem(key, JSON.stringify(backendItems)); } catch (_) {}
          return;
        }
      } catch (e) {
        console.warn('Backend wardrobe sync fallback to local cache:', e);
      }

      // 3. User-specific localStorage fallback
      try {
        const cached = localStorage.getItem(key);
        setWardrobe(cached ? JSON.parse(cached) : []);
      } catch {
        setWardrobe([]);
      }
    };
    syncWardrobe();
  }, [user, isSupabaseConfigured]);

  useEffect(() => {
    const key = getWardrobeKey(user);
    try {
      localStorage.setItem(key, JSON.stringify(wardrobe));
    } catch (_) {}
  }, [wardrobe, user]);

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

  // Whenever wardrobe changes (e.g. from Supabase sync or adding/removing clothes),
  // strictly re-evaluate outfit piece ownership against the user's real wardrobe!
  useEffect(() => {
    setCurrentRecommendation(prev => prev ? matchOutfitWithWardrobe(prev, wardrobe) : prev);
    setAllOutfits(prev => (prev || []).map(o => matchOutfitWithWardrobe(o, wardrobe)));
  }, [wardrobe]);

  // 4. Try Existing selections (by slot: top, bottom, shoes, layer)
  const [tryExistingSelection, setTryExistingSelection] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_try_existing');
      return saved ? JSON.parse(saved) : {
        top: null,
        bottom: null,
        shoes: null,
        layer: null
      };
    } catch {
      return { top: null, bottom: null, shoes: null, layer: null };
    }
  });

  useEffect(() => {
    localStorage.setItem('fashion_vista_try_existing', JSON.stringify(tryExistingSelection));
  }, [tryExistingSelection]);

  // 5. User full-body photo for Virtual Try-On
  const defaultUserPhoto = "/user_indian_portrait.jpg";
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

  const getHistoryKey = (u) => (u?.id ? `fashion_vista_history_${u.id}` : 'fashion_vista_history_guest');

  // 7. History - isolated per user, clean for authenticated accounts
  const [history, setHistory] = useState(() => {
    try {
      const key = getHistoryKey(user);
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved);
      return user ? [] : initialHistoryData;
    } catch {
      return user ? [] : initialHistoryData;
    }
  });

  useEffect(() => {
    const key = getHistoryKey(user);
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory(user ? [] : initialHistoryData);
      }
    } catch {
      setHistory(user ? [] : initialHistoryData);
    }
  }, [user]);

  useEffect(() => {
    const key = getHistoryKey(user);
    try {
      localStorage.setItem(key, JSON.stringify(history));
    } catch (_) {}
  }, [history, user]);

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

    // 1. Persist to Supabase PostgreSQL if logged in
    if (isSupabaseConfigured && user) {
      try {
        const cloudSaved = await insertSupabaseWardrobeItem(localItem, user.id);
        if (cloudSaved && cloudSaved.id) {
          setWardrobe(prev => prev.map(i => i.id === tempId ? { ...cloudSaved, owned: true } : i));
        }
      } catch (sbErr) {
        console.warn('Supabase wardrobe save note:', sbErr.message);
      }
    }

    // 2. Persist to backend SQLite
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

    // 1. Delete from Supabase if logged in
    if (isSupabaseConfigured && user) {
      try {
        await deleteSupabaseWardrobeItem(id);
      } catch (sbErr) {
        console.warn('Supabase wardrobe delete note:', sbErr.message);
      }
    }

    // 2. Delete from SQLite
    try {
      await deleteWardrobeItemAPI(id);
    } catch (err) {
      console.warn('Backend SQLite delete error:', err.message);
    }
  };

  const updateWardrobeItem = async (id, updatedFields) => {
    setWardrobe(prev => prev.map(item => item.id === id ? { ...item, ...updatedFields } : item));
    showToast('Wardrobe item updated', 'success');

    // 1. Update in Supabase if logged in
    if (isSupabaseConfigured && user) {
      try {
        await updateSupabaseWardrobeItem(id, updatedFields);
      } catch (sbErr) {
        console.warn('Supabase wardrobe update note:', sbErr.message);
      }
    }

    // 2. Update in SQLite
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

    // Attempt real ML recommendation from Flask backend with userPhoto
    let mlRec = null;
    try {
      mlRec = await generateMLRecommendation(newPrefs, wardrobe, userPhoto);
    } catch (err) {
      console.warn("Backend ML recommendation unavailable, falling back to local curation:", err);
    }

    let rawOutfits = [];
    if (mlRec && Array.isArray(mlRec.recommendations) && mlRec.recommendations.length > 0) {
      rawOutfits = mlRec.recommendations.slice(0, 3);
    } else if (mlRec && mlRec.items && mlRec.items.length >= 3) {
      rawOutfits = [mlRec, ...(mlRec.alternatives || [])].slice(0, 3);
    } else {
      // Dynamic fallback strictly matching user-selected colour and occasion
      const occ = newPrefs.occasion || 'College';
      const rawCol = (newPrefs.colour || 'Any').trim();
      const occLower = occ.toLowerCase();

      // If user selected "Any", smartly prioritize what they ALREADY own in their wardrobe!
      let col = rawCol;
      if (!rawCol || rawCol.toLowerCase() === 'any') {
        const matchingWardrobeItem = wardrobe.find(w => {
          const wCat = String(w.category || '').toLowerCase();
          const wName = String(w.name || '').toLowerCase();
          if (occLower.includes('wedding') || occLower.includes('traditional')) {
            return wCat.includes('dress') || wName.includes('saree') || wCat.includes('top');
          }
          return wCat.includes('top') || wName.includes('shirt') || wName.includes('top') || wName.includes('tee');
        });

        col = matchingWardrobeItem?.colour || (occLower.includes('wedding') || occLower.includes('traditional') ? 'Red' : 'Black');
      }

      // Ensure proper title-casing for color name
      col = col.charAt(0).toUpperCase() + col.slice(1);
      let topName, botCol, botName, shoeName, shoeCol;
      let topSlot = 'Top';
      let botSlot = 'Bottom';
      let topCat = 'Tops';
      let botCat = 'Bottoms';

      const hasSaree = wardrobe.some(w => {
        const cat = String(w.category || '').toLowerCase();
        const name = String(w.name || '').toLowerCase();
        return cat.includes('dress') || name.includes('saree');
      });

      if (occLower.includes('wedding') || occLower.includes('traditional')) {
        if (hasSaree) {
          topName = `${col} Festive Silk Saree`;
          topSlot = 'Dress';
          topCat = 'Dresses';
          botCol = col.toLowerCase() === 'gold' ? 'Cream' : 'Gold';
          botName = `${botCol} Zari Brocade Blouse`;
          botSlot = 'Top';
          botCat = 'Tops';
          shoeName = 'Embellished Metallic Juttis';
          shoeCol = 'Gold';
        } else {
          topName = `${col} Embroidered Silk Kurta`;
          topSlot = 'Top';
          topCat = 'Tops';
          botCol = col.toLowerCase() === 'gold' ? 'Cream' : 'Gold';
          botName = `${botCol} Zari Trim Flared Palazzos`;
          botSlot = 'Bottom';
          botCat = 'Bottoms';
          shoeName = 'Embellished Metallic Juttis';
          shoeCol = 'Gold';
        }
      } else if (occLower.includes('office') || occLower.includes('formal')) {
        topName = `${col} Tailored Poplin Shirt`;
        botCol = ['grey', 'black'].includes(col.toLowerCase()) ? 'Navy' : 'Grey';
        botName = `${botCol} High-Waist Tailored Trousers`;
        shoeName = 'Black Leather Minimalist Loafers';
        shoeCol = 'Black';
      } else if (occLower.includes('party')) {
        topName = `${col} Satin Evening Top`;
        botCol = col.toLowerCase() === 'black' ? 'Silver' : 'Black';
        botName = `${botCol} Tailored Evening Trousers`;
        shoeName = 'Sleek Strappy Block Heels';
        shoeCol = 'Black';
      } else {
        topName = `${col} Oversized Tee`;
        botCol = col.toLowerCase() === 'blue' ? 'White' : 'Blue';
        botName = `Vintage ${botCol} Straight-Fit Jeans`;
        shoeName = 'White Minimalist Retro Sneakers';
        shoeCol = 'White';
      }

      // Look 01: Primary Curation
      const dynamicLook1 = {
        id: `rec-${occLower}-1-${Date.now()}`,
        name: `Look 01: ${col} ${occ} Curation`,
        subtitle: `Harmonious ${col} silhouette calibrated for ${occ.toLowerCase()} comfort`,
        occasion: occ,
        style: newPrefs.style || 'Casual',
        colour: `${col} + ${botCol}`,
        budget: '1800',
        compatibility_score: 94,
        color_score: 92,
        heroImage: defaultRecommendation.heroImage,
        items: [
          {
            id: `piece-1-${col.toLowerCase()}`,
            name: topName,
            slot: topSlot,
            category: topCat,
            colour: col,
            brand: 'Zara',
            description: `Relaxed ${col.toLowerCase()} silhouette styled for effortless ${occ.toLowerCase()} mobility.`,
            image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: `piece-2-${botCol.toLowerCase()}`,
            name: botName,
            slot: botSlot,
            category: botCat,
            colour: botCol,
            brand: "Levi's",
            description: `Structured ${botCol.toLowerCase()} piece providing harmonious tonal balance with ${col}.`,
            image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: `piece-3-${shoeCol.toLowerCase()}`,
            name: shoeName,
            slot: 'Shoes',
            category: 'Shoes',
            colour: shoeCol,
            brand: 'Veja',
            description: `Versatile ${shoeCol.toLowerCase()} footwear offering all-day comfort and crisp contrast.`,
            image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80'
          }
        ]
      };

      // Look 02: Minimalist / Neutral Contrast
      const altBotCol = botCol === 'White' ? 'Blue' : 'White';
      const dynamicLook2 = {
        id: `rec-${occLower}-2-${Date.now()}`,
        name: `Look 02: ${col} Minimalist Contrast`,
        subtitle: `Clean contemporary lines pairing ${col} with ${altBotCol} accents`,
        occasion: occ,
        style: newPrefs.style || 'Casual',
        colour: `${col} + ${altBotCol}`,
        budget: '2100',
        compatibility_score: 91,
        color_score: 89,
        heroImage: defaultRecommendation.heroImage,
        items: [
          {
            id: `piece-2-top-${col.toLowerCase()}`,
            name: `Modern ${col} Relaxed Fit Blouse`,
            slot: 'Top',
            category: 'Tops',
            colour: col,
            brand: 'Uniqlo',
            description: `Lightweight ${col.toLowerCase()} cotton top offering understated everyday chic.`,
            image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: `piece-2-bot-${altBotCol.toLowerCase()}`,
            name: `Tailored ${altBotCol} Relaxed Trousers`,
            slot: 'Bottom',
            category: 'Bottoms',
            colour: altBotCol,
            brand: 'Mango',
            description: `High-rise relaxed fit ${altBotCol.toLowerCase()} trousers providing high-contrast clarity.`,
            image: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: 'piece-2-shoe-white',
            name: 'Classic White Canvas Sneakers',
            slot: 'Shoes',
            category: 'Shoes',
            colour: 'White',
            brand: 'Converse',
            description: 'Crisp white retro sneakers ensuring balanced everyday proportion.',
            image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80'
          }
        ]
      };

      // Look 03: Statement Chic
      const dynamicLook3 = {
        id: `rec-${occLower}-3-${Date.now()}`,
        name: `Look 03: ${col} Statement Chic`,
        subtitle: `Elevated silhouette balancing ${col} with grounded dark charcoal neutrals`,
        occasion: occ,
        style: newPrefs.style || 'Casual',
        colour: `${col} + Charcoal`,
        budget: '2400',
        compatibility_score: 93,
        color_score: 91,
        heroImage: defaultRecommendation.heroImage,
        items: [
          {
            id: `piece-3-top-${col.toLowerCase()}`,
            name: `Structured ${col} Elegant Topwear`,
            slot: 'Top',
            category: 'Tops',
            colour: col,
            brand: 'Massimo Dutti',
            description: `Sophisticated ${col.toLowerCase()} silhouette styled with refined proportions.`,
            image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: 'piece-3-bot-charcoal',
            name: 'Charcoal Straight-Leg Trousers',
            slot: 'Bottom',
            category: 'Bottoms',
            colour: 'Charcoal',
            brand: 'Zara',
            description: 'Deep neutral trousers giving grounding and elegance to vibrant colors.',
            image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80'
          },
          {
            id: 'piece-3-shoe-black',
            name: 'Black Leather Pointed Loafers',
            slot: 'Shoes',
            category: 'Shoes',
            colour: 'Black',
            brand: 'Clarks',
            description: 'Refined black footwear for versatile polished style.',
            image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80'
          }
        ]
      };

      rawOutfits = [dynamicLook1, dynamicLook2, dynamicLook3];
    }

    const cleanOutfits = rawOutfits
      .slice(0, 3)
      .map((o, idx) => normalizeOutfitObject(o, idx, newPrefs, wardrobe))
      .filter(Boolean);

    // Generate/enrich personalized try-on image for EACH of the maximum 3 looks on the user's photo
    const outfitsWithTryOn = await Promise.all(
      cleanOutfits.map(async (outfit, idx) => {
        try {
          if (userPhoto && !outfit.user_tryon_image) {
            const tryonImg = await synthesizeLookTryOn(userPhoto, outfit, outfit.name || `Look 0${idx + 1}`);
            if (tryonImg) {
              return {
                ...outfit,
                user_tryon_image: tryonImg,
                tryonImage: tryonImg,
                user_photo: userPhoto
              };
            }
          }
          return {
            ...outfit,
            user_photo: userPhoto
          };
        } catch (tryonErr) {
          console.warn(`Try-on synthesis note for look ${idx + 1}:`, tryonErr);
          return outfit;
        }
      })
    );

    const finalOutfits = outfitsWithTryOn.length > 0
      ? outfitsWithTryOn
      : [normalizeOutfitObject(defaultRecommendation, 0, newPrefs, wardrobe)];

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


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
    try {
      const saved = localStorage.getItem('fashion_vista_preferences');
      return saved ? JSON.parse(saved) : {
        occasion: 'College',
        outfitType: 'Full Outfit',
        colour: 'Black',
        style: 'Casual',
        season: 'Summer',
        budget: '1800'
      };
    } catch {
      return {
        occasion: 'College',
        outfitType: 'Full Outfit',
        colour: 'Black',
        style: 'Casual',
        season: 'Summer',
        budget: '1800'
      };
    }
  });

  useEffect(() => {
    localStorage.setItem('fashion_vista_preferences', JSON.stringify(preferences));
  }, [preferences]);

  // 3. Current AI Recommendation
  const [currentRecommendation, setCurrentRecommendation] = useState(() => {
    try {
      const saved = localStorage.getItem('fashion_vista_recommendation');
      return saved ? JSON.parse(saved) : defaultRecommendation;
    } catch {
      return defaultRecommendation;
    }
  });

  useEffect(() => {
    localStorage.setItem('fashion_vista_recommendation', JSON.stringify(currentRecommendation));
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

    let baseCuration = defaultRecommendation;
    if (mlRec && mlRec.items && mlRec.items.length >= 3) {
      const match = mlRec.wardrobe_match || {
        matched_count: 3,
        required_count: mlRec.items.length,
        wardrobe_coverage: 0.75,
        missing_items: []
      };

      baseCuration = {
        ...defaultRecommendation,
        name: mlRec.name || `${newPrefs.style || 'Casual'} ${newPrefs.occasion || 'College'} Curation`,
        occasion: mlRec.occasion || newPrefs.occasion || 'College',
        style: mlRec.style || newPrefs.style || 'Casual',
        season: mlRec.season || newPrefs.season || 'Summer',
        colour: newPrefs.colour === 'Any' ? 'Balanced Palette' : `${newPrefs.colour} Harmony`,
        budget: newPrefs.budget || '1800',
        items: mlRec.items,
        compatibility: {
          occasion: `Suitable for ${mlRec.occasion || newPrefs.occasion}`,
          style: mlRec.style || newPrefs.style || 'Casual',
          colour: `${mlRec.color_score || 90}% Colour Harmony`,
          wardrobe: `${match.matched_count} / ${match.required_count} items owned`,
          purchase: match.missing_items && match.missing_items.length > 0 ? `${match.missing_items.length} item needed` : '0 items needed'
        },
        wardrobeMatch: {
          ownedCount: match.matched_count,
          totalCount: match.required_count,
          percentage: Math.round(match.wardrobe_coverage * 100),
          statusText: match.wardrobe_coverage === 1 ? "Ready in your closet!" : "High Closet Synergy",
          subtext: match.missing_items && match.missing_items.length > 0 ? `Missing: ${match.missing_items.join(', ')}` : "All pieces owned!"
        },
        reasons: [
          `ML Compatibility Score: ${mlRec.compatibility_score || 92}%`,
          mlRec.color_harmony_explanation || 'Balanced color harmony across garment slots',
          mlRec.explanation || `Optimal pairing for ${newPrefs.occasion} utility`,
          `Uses ${match.matched_count} items from your wardrobe (${Math.round(match.wardrobe_coverage * 100)}% coverage)`,
          match.missing_items && match.missing_items.length > 0 ? `Missing: ${match.missing_items.join(', ')}` : 'Zero new purchases needed'
        ]
      };
    } else if (newPrefs.style === 'Traditional' || newPrefs.occasion === 'Traditional' || newPrefs.occasion === 'Wedding') {
      baseCuration = alternateCurations.traditional;
    } else if (newPrefs.style === 'Formal' || newPrefs.occasion === 'Office') {
      baseCuration = alternateCurations.formal;
    } else {
      // Dynamic Urban Casual with selected preferences
      baseCuration = {
        ...defaultRecommendation,
        occasion: newPrefs.occasion || 'College',
        outfitType: newPrefs.outfitType || 'Full Outfit',
        style: newPrefs.style || 'Casual',
        colour: newPrefs.colour === 'Any' ? 'Black + Blue' : `${newPrefs.colour} + Neutral`,
        season: newPrefs.season || 'Summer',
        budget: newPrefs.budget || '1800',
        compatibility: {
          occasion: `Suitable for ${newPrefs.occasion || 'College'}`,
          style: newPrefs.style || 'Casual',
          colour: `${newPrefs.colour || 'Black'} Harmony`,
          wardrobe: '3 / 4 items owned',
          purchase: '1 item needed'
        },
        reasons: [
          `Matches your ${newPrefs.occasion || 'college'} occasion with functional elegance`,
          `Matches your ${newPrefs.style || 'casual'} aesthetic without compromise`,
          `Works harmoniously with ${newPrefs.colour || 'black'} accents`,
          'Uses 3 items already in your wardrobe (75% match rate)',
          'Minimizes unnecessary purchases — only 1 layer needed'
        ]
      };
    }

    setCurrentRecommendation(baseCuration);

    // Also record in history
    const historyEntry = {
      id: `hist-${Date.now()}`,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      outfitName: baseCuration.name,
      occasion: baseCuration.occasion,
      style: baseCuration.style,
      wardrobeMatch: `${baseCuration.wardrobeMatch.ownedCount} / ${baseCuration.wardrobeMatch.totalCount} owned`,
      ownedCount: baseCuration.wardrobeMatch.ownedCount,
      totalCount: baseCuration.wardrobeMatch.totalCount,
      percentage: baseCuration.wardrobeMatch.percentage,
      missingItems: baseCuration.missingItem ? [baseCuration.missingItem.name] : [],
      image: baseCuration.heroImage,
      outfitSummary: baseCuration.items.map(i => i.name).join(' + '),
      decision: 'AI Recommendation generated from personal stylist questionnaire'
    };

    setHistory(prev => [historyEntry, ...prev.slice(0, 9)]);
    showToast('AI Curated your outfit!', 'success');
  };

  const applyAlternative = (alt) => {
    // If user clicks "View Outfit →" on an alternative
    setCurrentRecommendation(prev => ({
      ...prev,
      name: alt.name,
      subtitle: alt.description,
      wardrobeMatch: {
        ownedCount: alt.ownedCount,
        totalCount: alt.totalCount,
        percentage: alt.percentage,
        statusText: alt.percentage === 100 ? "Ready in your closet!" : "Almost ready.",
        subtext: alt.percentage === 100 ? "Zero new purchases needed!" : `Only ${alt.totalCount - alt.ownedCount} item needed.`
      },
      heroImage: alt.image
    }));
    showToast(`Loaded "${alt.name}" as primary outfit`, 'info');
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
        generateRecommendation,
        applyAlternative,
        tryExistingSelection,
        selectTryExistingItem,
        userPhoto,
        setUserPhoto,
        missingItemPhoto,
        setMissingItemPhoto,
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

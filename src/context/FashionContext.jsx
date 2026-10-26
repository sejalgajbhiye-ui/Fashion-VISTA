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
  fetchOutfitPlansAPI,
  createOutfitPlanAPI,
  updateOutfitPlanAPI,
  deleteOutfitPlanAPI,
  toggleOutfitPlanStatusAPI
} from '../services/api';
import {
  fetchSupabaseOutfitPlans,
  insertSupabaseOutfitPlan,
  updateSupabaseOutfitPlan,
  deleteSupabaseOutfitPlan
} from '../services/supabasePlanner';

import {
  fetchSupabaseWardrobeItems,
  insertSupabaseWardrobeItem,
  updateSupabaseWardrobeItem,
  deleteSupabaseWardrobeItem
} from '../services/supabaseWardrobe';

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

  const outfitOcc = String(outfit.occasion || '').toLowerCase();
  const isEthnicOutfit = (outfit.items || []).some(i => {
    const n = String(i?.name || '').toLowerCase();
    const c = String(i?.category || i?.slot || '').toLowerCase();
    return n.includes('kurta') || n.includes('kurti') || n.includes('anarkali') || n.includes('saree') || n.includes('lehenga') || n.includes('sharara') || c.includes('traditional');
  }) || outfitOcc.includes('wedding') || outfitOcc.includes('festive') || outfitOcc.includes('traditional');

  const isPartyOutfit = outfitOcc.includes('party') || outfitOcc.includes('cocktail') || outfitOcc.includes('gala');

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

      // Incompatibility flags
      const wIsDenim = wName.includes('jean') || wName.includes('denim') || wName.includes('ripped') || wName.includes('torn');
      const wIsSkirt = wName.includes('skirt') || wCat.includes('skirt');
      const wIsAthletic = wName.includes('jogger') || wName.includes('track') || wName.includes('sweat') || wName.includes('gym');
      const wIsSneaker = wName.includes('sneaker') || wName.includes('running') || wName.includes('trainer') || wName.includes('sport') || wName.includes('athletic');
      const wIsTraditionalShoe = wName.includes('mojari') || wName.includes('jutti') || wName.includes('kolhapuri') || wName.includes('zardozi');
      const wIsBackpack = wName.includes('backpack') || wName.includes('rucksack') || wName.includes('gym bag');
      const wIsPotli = wName.includes('potli') || wName.includes('batua') || wName.includes('zari');

      // Strict category checks
      const isTopMatch = (slot === 'top' || slot === 'topwear') &&
        (wCat === 'tops' || wCat === 'top' || wSub.includes('shirt') || wSub.includes('top') || wSub.includes('kurti') || wSub.includes('kurta') || wSub.includes('tee')) &&
        !wCat.includes('dress') && !wSub.includes('saree') && !wName.includes('saree') && !wCat.includes('bottom') && !wCat.includes('shoe');

      let isBottomMatch = (slot === 'bottom' || slot === 'bottomwear') &&
        (wCat === 'bottoms' || wCat === 'bottom' || wSub.includes('jean') || wSub.includes('trouser') || wSub.includes('pant') || wSub.includes('skirt') || wSub.includes('palazzo') || wSub.includes('salwar')) &&
        !wCat.includes('top') && !wCat.includes('dress') && !wCat.includes('shoe');

      // Rule: NEVER pair traditional ethnic kurtas/anarkalis/sarees with torn jeans or denim pants!
      if (isEthnicOutfit && wIsDenim) isBottomMatch = false;
      // Rule: NEVER pair traditional ethnic kurtas with mini/short skirts!
      if (isEthnicOutfit && wIsSkirt) isBottomMatch = false;
      // Rule: NEVER pair athletic joggers/sweatpants with ethnic or party outfits!
      if ((isEthnicOutfit || isPartyOutfit) && wIsAthletic) isBottomMatch = false;

      let isShoesMatch = (slot === 'shoes' || slot === 'footwear') &&
        (wCat === 'shoes' || wCat === 'footwear' || wSub.includes('shoe') || wSub.includes('sneaker') || wSub.includes('sandal') || wSub.includes('heel') || wSub.includes('boot') || wSub.includes('flat') || wSub.includes('jutti') || wSub.includes('loafer')) &&
        !wCat.includes('top') && !wCat.includes('bottom') && !wCat.includes('dress');

      // Rule: NEVER pair sneakers / running shoes with traditional ethnic or wedding/festive attire!
      if (isEthnicOutfit && wIsSneaker) isShoesMatch = false;
      // Rule: NEVER pair bridal/traditional mojaris with western casual streetwear
      if (outfitOcc.includes('casual') && !isEthnicOutfit && wIsTraditionalShoe) isShoesMatch = false;

      const isLayerMatch = (slot === 'layer' || slot === 'outerwear') &&
        (wCat === 'accessories' || wCat === 'outerwear' || wName.includes('jacket') || wName.includes('coat') || wName.includes('blazer') || wName.includes('cardigan') || wName.includes('shrug') || wName.includes('hoodie')) &&
        !wCat.includes('shoes') && !wCat.includes('bottoms');

      const isDressMatch = (slot === 'dress' || slot === 'traditional') &&
        (wCat === 'dresses' || wCat === 'dress' || wSub.includes('saree') || wName.includes('saree') || wSub.includes('dress') || wName.includes('dress') || wSub.includes('anarkali') || wName.includes('anarkali')) &&
        !wCat.includes('shoes') && !wCat.includes('bottoms');

      let isBagMatch = (slot === 'accessory' || slot === 'bag' || slot === 'handbag') &&
        (wCat === 'accessories' || wCat === 'bag' || wName.includes('bag') || wName.includes('purse') || wName.includes('clutch') || wName.includes('potli') || wName.includes('tote') || wName.includes('sling'));

      if (isEthnicOutfit && wIsBackpack) isBagMatch = false;
      if (outfitOcc.includes('casual') && !isEthnicOutfit && wIsPotli) isBagMatch = false;

      if (isTopMatch || isBottomMatch || isShoesMatch || isLayerMatch || isDressMatch || isBagMatch) {
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
    sub_occasion: raw.sub_occasion || '',
    style: raw.style || defaultPrefs.style || 'Traditional',
    season: raw.season || defaultPrefs.season || 'All Season',
    colour: raw.colour || raw.palette || (defaultPrefs.colour === 'Any' ? 'Balanced Palette' : `${defaultPrefs.colour || 'Red'} Harmony`),
    budget: raw.budget || defaultPrefs.budget || '2500',
    heroImage: heroImg,
    image: heroImg,
    ensemble_breakdown: raw.ensemble_breakdown || null,
    total_price: raw.total_price || null,
    total_savings: raw.total_savings || 0,
    wardrobe_matches: raw.wardrobe_matches || [],
    has_wardrobe_reuse: Boolean(raw.has_wardrobe_reuse || (raw.wardrobe_matches && raw.wardrobe_matches.length > 0)),
    pairing_rationale: raw.pairing_rationale || '',
    color_harmony_explanation: raw.color_harmony_explanation || '',
    reasons: raw.reasons || [],
    retailer_links: raw.retailer_links || [],
    items: raw.items || [],
    compatibility_score: raw.compatibility_score || 92,
    color_score: raw.color_score || 90,
    selectedOutfitIndex: idx
  };

  return matchOutfitWithWardrobe(baseOutfit, userWardrobe);
};


export const generateSmartWardrobeCombinations = (wardrobe = [], occasion = 'Casual', maxCombinations = 8) => {
  if (!Array.isArray(wardrobe) || wardrobe.length === 0) {
    return {
      combinations: [],
      hasCompleteOutfits: false,
      missingCategories: ['Tops', 'Bottoms'],
      reason: 'Your wardrobe is currently empty. Add a few pieces to generate smart combinations.'
    };
  }

  const tops = wardrobe.filter(i => {
    const cat = (i.category || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return (cat === 'tops' || cat === 'top' || name.includes('shirt') || name.includes('top') || name.includes('t-shirt') || name.includes('kurti') || name.includes('kurta')) && !cat.includes('dress');
  });

  const bottoms = wardrobe.filter(i => {
    const cat = (i.category || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return (cat === 'bottoms' || cat === 'bottom' || name.includes('jean') || name.includes('pant') || name.includes('trouser') || name.includes('skirt') || name.includes('palazzo') || name.includes('shorts')) && !cat.includes('top');
  });

  const dresses = wardrobe.filter(i => {
    const cat = (i.category || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return cat === 'dresses' || cat === 'dress' || name.includes('dress') || name.includes('saree') || name.includes('anarkali');
  });

  const shoes = wardrobe.filter(i => {
    const cat = (i.category || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return cat === 'shoes' || cat === 'footwear' || name.includes('sneaker') || name.includes('shoe') || name.includes('sandal') || name.includes('heel') || name.includes('boot') || name.includes('loafer');
  });

  const layers = wardrobe.filter(i => {
    const cat = (i.category || '').toLowerCase();
    const name = (i.name || '').toLowerCase();
    return cat === 'accessories' || cat === 'outerwear' || name.includes('jacket') || name.includes('blazer') || name.includes('coat') || name.includes('cardigan') || name.includes('hoodie');
  });

  const combinations = [];

  const isColorSynergy = (colA, colB) => {
    if (!colA || !colB) return true;
    const a = normalizeColorFamily(colA);
    const b = normalizeColorFamily(colB);
    if (!a || !b) return true;
    if (a === b) return true;
    const neutrals = ['black', 'white', 'grey', 'beige', 'brown', 'navy', 'gold'];
    if (neutrals.includes(a) || neutrals.includes(b)) return true;

    const pairs = {
      blue: ['white', 'grey', 'beige', 'brown', 'black', 'navy', 'gold', 'pink'],
      red: ['black', 'white', 'beige', 'grey', 'gold', 'navy'],
      green: ['white', 'beige', 'black', 'gold', 'brown', 'navy'],
      yellow: ['navy', 'white', 'black', 'grey', 'blue'],
      pink: ['white', 'grey', 'navy', 'beige', 'black', 'blue'],
      purple: ['white', 'grey', 'black', 'beige', 'gold'],
      orange: ['beige', 'white', 'brown', 'black', 'navy', 'gold']
    };

    if (pairs[a] && pairs[a].includes(b)) return true;
    if (pairs[b] && pairs[b].includes(a)) return true;

    return false;
  };

  // 1. Top + Bottom pairs with strict aesthetic compatibility & footwear rotation
  let shoeCounter = 0;
  for (const top of tops) {
    const topName = (top.name || '').toLowerCase();
    const topCat = (top.category || '').toLowerCase();
    const isEthnicTop = topName.includes('kurta') || topName.includes('kurti') || topName.includes('anarkali') || topName.includes('chikankari') || topCat.includes('traditional');

    for (const bot of bottoms) {
      if (combinations.length >= maxCombinations) break;

      const botName = (bot.name || '').toLowerCase();
      const botCat = (bot.category || '').toLowerCase();
      const isDenim = botName.includes('jean') || botName.includes('denim') || botName.includes('ripped') || botName.includes('torn');
      const isSkirt = botName.includes('skirt') || botCat.includes('skirt');
      const isAthletic = botName.includes('jogger') || botName.includes('track') || botName.includes('sweat') || botName.includes('gym');

      // Rule 1: NEVER pair traditional ethnic kurtas / kurtis / anarkalis with denim / torn / ripped jeans!
      if (isEthnicTop && isDenim) continue;

      // Rule 2: NEVER pair ethnic kurtas with mini/short skirts!
      if (isEthnicTop && isSkirt) continue;

      // Rule 3: NEVER pair athletic sweatpants with ethnic kurtas or formal tops!
      if (isEthnicTop && isAthletic) continue;

      // Rule 4: Top and bottomwear must look aesthetically harmonious together
      if (!isColorSynergy(top.colour, bot.colour)) continue;

      // Rule 5: Never pair formal shirts, ethnic tops, or oversized sweaters with mini skirts
      const isMiniSkirt = botName.includes('mini') || botName.includes('short skirt') || botName.includes('small skirt');
      const isOversizedOrFormalTop = topName.includes('oversized') || topName.includes('sweater') || topName.includes('formal') || topName.includes('blazer');
      if (isMiniSkirt && (isEthnicTop || isOversizedOrFormalTop)) continue;

      // Filter compatible footwear according to formality & style
      const compatibleShoes = shoes.filter(s => {
        const sName = (s.name || '').toLowerCase();
        const sIsSneaker = sName.includes('sneaker') || sName.includes('running') || sName.includes('athletic');
        const sIsTraditional = sName.includes('mojari') || sName.includes('jutti') || sName.includes('kolhapuri');

        // Sneakers NEVER match ethnic kurtas
        if (isEthnicTop && sIsSneaker) return false;
        // Heavy bridal mojaris do not match casual t-shirts
        if (!isEthnicTop && (occasion === 'Casual' || occasion === 'College') && sIsTraditional) return false;
        return isColorSynergy(top.colour, s.colour);
      });

      // Rotate through compatible footwear so every outfit gets distinct shoes
      const matchedShoe = compatibleShoes.length > 0
        ? compatibleShoes[(shoeCounter++) % compatibleShoes.length]
        : null;

      const matchedLayer = layers.find(l => isColorSynergy(top.colour, l.colour)) || null;

      const items = [
        { ...top, slot: 'Top', inWardrobe: true, matchedWardrobeId: top.id },
        { ...bot, slot: 'Bottom', inWardrobe: true, matchedWardrobeId: bot.id }
      ];
      if (matchedShoe) {
        items.push({ ...matchedShoe, slot: 'Shoes', inWardrobe: true, matchedWardrobeId: matchedShoe.id });
      }
      if (matchedLayer) {
        items.push({ ...matchedLayer, slot: 'Layer', inWardrobe: true, matchedWardrobeId: matchedLayer.id });
      }

      combinations.push({
        id: `smart-${top.id}-${bot.id}`,
        outfit_name: `${top.name} + ${bot.name}`,
        occasion,
        items,
        wardrobe_item_ids: items.map(i => i.id),
        coverage: 100,
        type: isEthnicTop ? 'Coordinated Ethnic Kurta Look' : 'Tailored Separates Duo',
        rationale: isEthnicTop
          ? `Refined ${top.name} styled harmoniously with tailored ${bot.name}.`
          : `Harmonious pairing of ${top.colour || 'versatile'} top with ${bot.colour || 'classic'} bottoms.`
      });
    }
  }

  // 2. Dress single-piece looks
  for (const dress of dresses) {
    if (combinations.length >= maxCombinations) break;
    const dressName = (dress.name || '').toLowerCase();
    const isEthnicDress = dressName.includes('saree') || dressName.includes('anarkali') || dressName.includes('lehenga');

    const compatibleShoes = shoes.filter(s => {
      const sName = (s.name || '').toLowerCase();
      const sIsSneaker = sName.includes('sneaker') || sName.includes('running');
      if (isEthnicDress && sIsSneaker) return false;
      return isColorSynergy(dress.colour, s.colour);
    });

    const matchedShoe = compatibleShoes.length > 0
      ? compatibleShoes[(shoeCounter++) % compatibleShoes.length]
      : null;

    const matchedLayer = layers.find(l => isColorSynergy(dress.colour, l.colour)) || null;

    const items = [
      { ...dress, slot: 'Dress', inWardrobe: true, matchedWardrobeId: dress.id }
    ];
    if (matchedShoe) {
      items.push({ ...matchedShoe, slot: 'Shoes', inWardrobe: true, matchedWardrobeId: matchedShoe.id });
    }
    if (matchedLayer) {
      items.push({ ...matchedLayer, slot: 'Layer', inWardrobe: true, matchedWardrobeId: matchedLayer.id });
    }

    combinations.push({
      id: `smart-dress-${dress.id}`,
      outfit_name: dress.name,
      occasion,
      items,
      wardrobe_item_ids: items.map(i => i.id),
      coverage: 100,
      type: 'Single Piece Silhouette',
      rationale: `Statement ${dress.name} complete with color-matched footwear.`
    });
  }

  const hasCompleteOutfits = combinations.length > 0;
  const missingCategories = [];
  if (tops.length === 0 && dresses.length === 0) missingCategories.push('Tops / Kurti / Dress');
  if (bottoms.length === 0 && dresses.length === 0) missingCategories.push('Bottoms / Trousers / Jeans');

  if (!hasCompleteOutfits) {
    if (tops.length > 0) {
      tops.forEach(t => {
        combinations.push({
          id: `partial-top-${t.id}`,
          outfit_name: `${t.name} (Missing Bottom)`,
          occasion,
          items: [{ ...t, slot: 'Top', inWardrobe: true, matchedWardrobeId: t.id }],
          wardrobe_item_ids: [t.id],
          coverage: 50,
          isPartial: true,
          missingCategory: 'Bottoms',
          type: 'Partial Combination',
          rationale: 'Valid top ready. Pair with any neutral trousers or jeans to complete.'
        });
      });
    } else if (bottoms.length > 0) {
      bottoms.forEach(b => {
        combinations.push({
          id: `partial-bot-${b.id}`,
          outfit_name: `${b.name} (Missing Top)`,
          occasion,
          items: [{ ...b, slot: 'Bottom', inWardrobe: true, matchedWardrobeId: b.id }],
          wardrobe_item_ids: [b.id],
          coverage: 50,
          isPartial: true,
          missingCategory: 'Tops',
          type: 'Partial Combination',
          rationale: 'Valid bottoms ready. Pair with a shirt or kurti to complete.'
        });
      });
    }
  }

  return {
    combinations,
    hasCompleteOutfits,
    missingCategories,
    reason: hasCompleteOutfits
      ? `Generated ${combinations.length} smart combinations from ${wardrobe.length} owned items.`
      : `Cannot assemble a full 2-piece outfit yet. Missing: ${missingCategories.join(', ')}.`
  };
};

export const checkOutfitRepetition = (itemIds, plannedDate, allPlans = [], currentPlanId = null) => {
  if (!Array.isArray(itemIds) || itemIds.length === 0 || !plannedDate) {
    return { isRepeated: false, repeatedOn: null };
  }

  const cleanItemIds = itemIds.map(id => String(id).trim()).filter(Boolean);
  if (cleanItemIds.length === 0) {
    return { isRepeated: false, repeatedOn: null };
  }

  const target = new Date(plannedDate + 'T00:00:00');
  const day = target.getDay();
  const diffToMon = (day === 0 ? -6 : 1) - day;
  const monday = new Date(target);
  monday.setDate(target.getDate() + diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatLocalDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const monStr = formatLocalDate(monday);
  const sunStr = formatLocalDate(sunday);

  const sortedTargetIds = Array.from(new Set(cleanItemIds)).sort().join(',');

  const otherDayPlans = (Array.isArray(allPlans) ? allPlans : []).filter(p => {
    if (!p || !p.planned_date) return false;
    if (currentPlanId && String(p.id) === String(currentPlanId)) return false;
    // CRITICAL: A plan on the SAME date is never a repetition from another day!
    if (p.planned_date === plannedDate) return false;
    return p.planned_date >= monStr && p.planned_date <= sunStr;
  });

  for (const plan of otherDayPlans) {
    const rawIds = Array.isArray(plan.wardrobe_item_ids) && plan.wardrobe_item_ids.length > 0
      ? plan.wardrobe_item_ids
      : (plan.items || []).map(i => i.matchedWardrobeId || i.id).filter(Boolean);
    const cleanPlanIds = rawIds.map(id => String(id).trim()).filter(Boolean);
    if (cleanPlanIds.length === 0) continue;

    const sortedPlanIds = Array.from(new Set(cleanPlanIds)).sort().join(',');

    if (sortedTargetIds && sortedPlanIds && sortedTargetIds === sortedPlanIds) {
      const planDayName = new Date(plan.planned_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
      return {
        isRepeated: true,
        repeatedOn: planDayName,
        repeatedDate: plan.planned_date,
        otherPlan: plan
      };
    }
  }

  return { isRepeated: false, repeatedOn: null };
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

  // Helper to get tombstoned (deleted) item IDs so they are NEVER resurrected
  const getDeletedItemIds = () => {
    try {
      const raw = localStorage.getItem('fashion_vista_deleted_item_ids');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  };

  // Fetch persistent wardrobe from Supabase (if authenticated) or SQLite backend
  useEffect(() => {
    const syncWardrobe = async () => {
      const key = getWardrobeKey(user);
      try { localStorage.removeItem('fashion_vista_wardrobe'); } catch (_) {}

      const deletedIds = getDeletedItemIds();
      const mergedMap = new Map();

      // 1. Locally cached items for this user
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            parsed.forEach(it => {
              if (it?.id && !deletedIds.has(String(it.id))) {
                mergedMap.set(String(it.id), it);
              }
            });
          }
        }
      } catch (_) {}

      // Also check guest cache so unauthenticated starter additions aren't lost
      try {
        const guestCached = localStorage.getItem('fashion_vista_wardrobe_guest');
        if (guestCached) {
          const parsedGuest = JSON.parse(guestCached);
          if (Array.isArray(parsedGuest)) {
            parsedGuest.forEach(it => {
              if (it?.id && !deletedIds.has(String(it.id)) && !mergedMap.has(String(it.id))) {
                mergedMap.set(String(it.id), it);
              }
            });
          }
        }
      } catch (_) {}

      // 2. Supabase Cloud Sync
      if (isSupabaseConfigured && user) {
        try {
          const cloudItems = await fetchSupabaseWardrobeItems(user.id);
          if (cloudItems && Array.isArray(cloudItems)) {
            cloudItems.forEach(it => {
              if (it?.id && !deletedIds.has(String(it.id))) {
                mergedMap.set(String(it.id), it);
              }
            });
          }
        } catch (e) {
          console.warn('Supabase wardrobe sync fallback:', e);
        }
      }

      // 3. Backend SQLite Sync (contains user custom garments + all starter items)
      try {
        const backendItems = await fetchWardrobeItems();
        if (backendItems && Array.isArray(backendItems)) {
          backendItems.forEach(it => {
            if (it?.id && !deletedIds.has(String(it.id)) && !mergedMap.has(String(it.id))) {
              mergedMap.set(String(it.id), it);
            }
          });
        }
      } catch (e) {
        console.warn('Backend wardrobe sync fallback to local cache:', e);
      }

      const allMerged = Array.from(mergedMap.values());
      setWardrobe(allMerged);
      try { localStorage.setItem(key, JSON.stringify(allMerged)); } catch (_) {}
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


  // 10. Weekly Outfit Planner State (User-Isolated)
  const getPlansKey = (u) => (u?.id ? `fashion_vista_plans_${u.id}` : 'fashion_vista_plans_guest');

  const [weeklyPlans, setWeeklyPlans] = useState(() => {
    try {
      const key = getPlansKey(user);
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Sync plans from Supabase / Backend SQLite
  useEffect(() => {
    const syncPlans = async () => {
      const key = getPlansKey(user);

      // 1. Supabase Cloud Sync
      if (isSupabaseConfigured && user) {
        try {
          const cloudPlans = await fetchSupabaseOutfitPlans(user.id);
          if (cloudPlans !== null && Array.isArray(cloudPlans)) {
            setWeeklyPlans(cloudPlans);
            try { localStorage.setItem(key, JSON.stringify(cloudPlans)); } catch (_) {}
            return;
          }
        } catch (e) {
          console.warn('Supabase plans sync fallback:', e);
        }
      }

      // 2. Backend SQLite Sync
      try {
        const backendPlans = await fetchOutfitPlansAPI();
        if (backendPlans !== null && Array.isArray(backendPlans)) {
          setWeeklyPlans(backendPlans);
          try { localStorage.setItem(key, JSON.stringify(backendPlans)); } catch (_) {}
          return;
        }
      } catch (e) {
        console.warn('Backend plans sync fallback to local cache:', e);
      }

      // 3. LocalStorage fallback
      try {
        const cached = localStorage.getItem(key);
        setWeeklyPlans(cached ? JSON.parse(cached) : []);
      } catch {
        setWeeklyPlans([]);
      }
    };
    syncPlans();
  }, [user, isSupabaseConfigured]);

  // Persist weeklyPlans to user-isolated localStorage
  useEffect(() => {
    const key = getPlansKey(user);
    try {
      localStorage.setItem(key, JSON.stringify(weeklyPlans));
    } catch (_) {}
  }, [weeklyPlans, user]);

  const addOutfitPlan = async (planData) => {
    const tempId = planData.id || `plan-${Date.now()}`;
    const newPlan = {
      ...planData,
      id: tempId,
      status: planData.status || 'planned',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic UI update
    setWeeklyPlans(prev => {
      // Replace existing plan for same date or prepend
      const filtered = prev.filter(p => p.id !== tempId && p.planned_date !== newPlan.planned_date);
      return [...filtered, newPlan].sort((a, b) => a.planned_date.localeCompare(b.planned_date));
    });

    showToast(`Outfit planned for ${newPlan.planned_date}!`, 'success');

    // 1. Supabase Cloud
    if (isSupabaseConfigured && user) {
      try {
        const cloudSaved = await insertSupabaseOutfitPlan(newPlan, user.id);
        if (cloudSaved && cloudSaved.id) {
          setWeeklyPlans(prev => prev.map(p => p.id === tempId ? cloudSaved : p));
        }
      } catch (err) {
        console.warn('Supabase outfit plan save note:', err);
      }
    }

    // 2. Backend SQLite
    try {
      await createOutfitPlanAPI(newPlan);
    } catch (err) {
      console.warn('Backend outfit plan save note:', err.message);
    }

    return newPlan;
  };

  const updateOutfitPlan = async (planId, updates) => {
    setWeeklyPlans(prev => prev.map(p => p.id === planId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p));
    showToast('Outfit plan updated!', 'success');

    if (isSupabaseConfigured && user) {
      try {
        await updateSupabaseOutfitPlan(planId, updates, user.id);
      } catch (err) {
        console.warn('Supabase outfit plan update note:', err);
      }
    }

    try {
      await updateOutfitPlanAPI(planId, updates);
    } catch (err) {
      console.warn('Backend outfit plan update note:', err.message);
    }
  };

  const deleteOutfitPlan = async (target, plannedDate = null) => {
    const planId = (typeof target === 'object' ? target?.id : target) || null;
    const dateKey = (typeof target === 'object' ? (target?.planned_date || target?.dateKey) : plannedDate) || null;

    setWeeklyPlans(prev => {
      const remaining = prev.filter(p => {
        if (!p) return false;
        if (planId && (String(p.id) === String(planId) || String(p.plan_id) === String(planId))) return false;
        if (dateKey && String(p.planned_date) === String(dateKey)) return false;
        return true;
      });
      const key = getPlansKey(user);
      try { localStorage.setItem(key, JSON.stringify(remaining)); } catch (_) {}
      return remaining;
    });

    showToast('Outfit plan removed.', 'info');

    if (isSupabaseConfigured && user && planId) {
      try {
        await deleteSupabaseOutfitPlan(planId, user.id);
      } catch (err) {
        console.warn('Supabase outfit plan delete note:', err);
      }
    }

    if (planId || dateKey) {
      try {
        await deleteOutfitPlanAPI(planId || dateKey, dateKey);
      } catch (err) {
        console.warn('Backend outfit plan delete note:', err.message);
      }
    }
  };

  const togglePlanStatus = async (planId) => {
    const existing = weeklyPlans.find(p => String(p.id) === String(planId));
    if (!existing) return;
    const newStatus = existing.status === 'worn' ? 'planned' : 'worn';

    setWeeklyPlans(prev => prev.map(p => String(p.id) === String(planId) ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p));
    showToast(newStatus === 'worn' ? 'Marked as worn!' : 'Marked as planned!', 'success');

    if (isSupabaseConfigured && user) {
      try {
        await updateSupabaseOutfitPlan(planId, { status: newStatus }, user.id);
      } catch (err) {
        console.warn('Supabase plan status update note:', err);
      }
    }

    try {
      await toggleOutfitPlanStatusAPI(planId, newStatus);
    } catch (err) {
      console.warn('Backend plan status toggle note:', err.message);
    }
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
    const stringId = String(id);
    const itemToDelete = wardrobe.find(item => String(item.id) === stringId);

    // 1. Permanently register in tombstone set so it can NEVER be resurrected by syncWardrobe
    try {
      const raw = localStorage.getItem('fashion_vista_deleted_item_ids');
      const list = raw ? JSON.parse(raw) : [];
      if (!list.includes(stringId)) {
        list.push(stringId);
        localStorage.setItem('fashion_vista_deleted_item_ids', JSON.stringify(list));
      }
    } catch (_) {}

    // 2. Remove immediately from React state
    setWardrobe(prev => prev.filter(item => String(item.id) !== stringId));

    // 3. Remove immediately from user and guest localStorage caches
    try {
      const key = getWardrobeKey(user);
      const userCached = localStorage.getItem(key);
      if (userCached) {
        const filtered = JSON.parse(userCached).filter(i => String(i.id) !== stringId);
        localStorage.setItem(key, JSON.stringify(filtered));
      }
      const guestCached = localStorage.getItem('fashion_vista_wardrobe_guest');
      if (guestCached) {
        const filtered = JSON.parse(guestCached).filter(i => String(i.id) !== stringId);
        localStorage.setItem('fashion_vista_wardrobe_guest', JSON.stringify(filtered));
      }
    } catch (_) {}

    showToast(`Removed "${itemToDelete?.name || 'Item'}" from your wardrobe`, 'info');

    // 4. Delete from Supabase if logged in
    if (isSupabaseConfigured && user) {
      try {
        await deleteSupabaseWardrobeItem(stringId);
      } catch (sbErr) {
        console.warn('Supabase wardrobe delete note:', sbErr.message);
      }
    }

    // 5. Delete from SQLite backend
    try {
      await deleteWardrobeItemAPI(stringId);
    } catch (err) {
      console.warn('Backend SQLite delete note:', err.message);
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

    let mlRec = null;
    try {
      mlRec = await generateMLRecommendation(newPrefs, wardrobe, 8);
    } catch (err) {
      console.warn("Backend ML recommendation unavailable, falling back to local curation:", err);
    }

    let rawOutfits = [];
    if (mlRec && Array.isArray(mlRec.recommendations) && mlRec.recommendations.length > 0) {
      rawOutfits = mlRec.recommendations;
    } else if (mlRec && Array.isArray(mlRec) && mlRec.length > 0) {
      rawOutfits = mlRec;
    } else if (mlRec && mlRec.items && mlRec.items.length >= 3) {
      rawOutfits = [mlRec, ...(mlRec.alternatives || [])];
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
      .slice(0, 10)
      .map((o, idx) => normalizeOutfitObject(o, idx, newPrefs, wardrobe))
      .filter(Boolean);

    const finalOutfits = cleanOutfits.length > 0
      ? cleanOutfits
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
        weeklyPlans,
        addOutfitPlan,
        updateOutfitPlan,
        deleteOutfitPlan,
        togglePlanStatus,
        generateSmartWardrobeCombinations,
        checkOutfitRepetition,
      }}
    >
      {children}
    </FashionContext.Provider>
  );
};


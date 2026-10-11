import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { ClothingCard } from '../components/ClothingCard';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ArrowRight, ShoppingBag, CheckCircle2, Shirt, Layers } from 'lucide-react';

export const TryExisting = () => {
  const navigate = useNavigate();
  const {
    wardrobe,
    currentRecommendation,
    tryExistingSelection,
    selectTryExistingItem
  } = useFashion();

  // Garments from wardrobe grouped by category for slot selection
  const tops = wardrobe.filter(i => i.category === 'Tops');
  const bottoms = wardrobe.filter(i => i.category === 'Bottoms');
  const shoes = wardrobe.filter(i => i.category === 'Shoes');
  const dresses = wardrobe.filter(i => i.category === 'Dresses');
  const layers = wardrobe.filter(i => i.category === 'Accessories' || (i.category === 'Tops' && (i.name.includes('Jacket') || i.name.includes('Coat') || i.name.includes('Blazer') || i.name.includes('Hoodie'))));

  const topRec = currentRecommendation?.items?.find(i => (i.slot || i.category || '').toLowerCase().includes('top'));
  const bottomRec = currentRecommendation?.items?.find(i => (i.slot || i.category || '').toLowerCase().includes('bottom'));
  const shoesRec = currentRecommendation?.items?.find(i => (i.slot || i.category || '').toLowerCase().includes('shoe'));
  const layerRec = currentRecommendation?.items?.find(i => (i.slot || i.category || '').toLowerCase().includes('layer'));

  // Calculate selected count
  const selectedSlots = Object.values(tryExistingSelection).filter(Boolean);
  const selectedCount = selectedSlots.length;
  const totalSlots = 4;

  const renderSlotSection = (title, slotKey, availableItems, recommendedName, isMissing = false) => {
    const selectedId = tryExistingSelection[slotKey];

    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 shadow-subtle space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-taupe-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-taupe-100 text-charcoal-700 px-2 py-0.5 rounded">
                SLOT: {title}
              </span>
              {selectedId ? (
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Item Selected
                </span>
              ) : (
                <span className="text-xs text-roseAccent-600 font-medium">
                  {isMissing ? "Not in your wardrobe" : "Selection required"}
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-500 mt-1">
              AI Recommendation: <strong className="text-charcoal-900">{recommendedName}</strong>
            </p>
          </div>

          {isMissing && (
            <div className="flex items-center gap-2 bg-roseAccent-50 border border-roseAccent-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-roseAccent-700 font-medium">Missing piece</span>
              <Button
                variant="accent"
                size="sm"
                onClick={() => navigate('/shop-new')}
                iconRight={<ArrowRight className="w-3 h-3" />}
              >
                Shop this item →
              </Button>
            </div>
          )}
        </div>

        {/* Garments available for this slot */}
        {availableItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableItems.map((item) => (
              <ClothingCard
                key={item.id}
                item={{
                  ...item,
                  inWardrobe: true
                }}
                selectable={true}
                selected={selectedId === item.id}
                onSelect={() => selectTryExistingItem(slotKey, item.id)}
                showStatus={false}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#FAF8F5] rounded-xl border border-dashed border-taupe-300">
            <p className="text-xs sm:text-sm text-charcoal-600 mb-3 font-medium">
              You don't currently have a matching {title.toLowerCase()} in your wardrobe.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/shop-new')}
              iconLeft={<ShoppingBag className="w-3.5 h-3.5" />}
            >
              Upload / Shop Missing Item →
            </Button>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-taupe-200">
        <div>
          <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200">
            Step 03 / Closet Assembly
          </span>
          <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900 mt-2">
            Build your outfit from what you own.
          </h1>
          <p className="text-sm sm:text-base text-charcoal-500 mt-1">
            Recommended: <span className="font-semibold text-charcoal-900">{currentRecommendation.name}</span>. Select pieces from your closet to assemble your look.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="inWardrobe" size="md">
            {selectedCount} / {totalSlots} Selected
          </Badge>
        </div>
      </div>

      {/* Sections for Top, Bottom, Shoes, Layer */}
      <div className="space-y-8">
        {renderSlotSection(
          "TOP",
          "top",
          tops,
          topRec?.name || "Recommended Top",
          !topRec?.inWardrobe || tops.length === 0
        )}

        {renderSlotSection(
          "BOTTOM",
          "bottom",
          bottoms,
          bottomRec?.name || "Recommended Bottom",
          !bottomRec?.inWardrobe || bottoms.length === 0
        )}

        {renderSlotSection(
          "SHOES",
          "shoes",
          shoes,
          shoesRec?.name || "Recommended Shoes",
          !shoesRec?.inWardrobe || shoes.length === 0
        )}

        {renderSlotSection(
          "LAYER / OUTERWEAR",
          "layer",
          layers,
          layerRec?.name || "Recommended Layer (Optional)",
          !layerRec?.inWardrobe || layers.length === 0
        )}
      </div>

      {/* STICKY BOTTOM BAR FOR PROGRESSION */}
      <div className="sticky bottom-6 z-30 bg-charcoal-900 text-cream-50 rounded-2xl p-4 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-charcoal-700">
        <div>
          <div className="flex items-center gap-2">
            <span className="editorial-heading text-xl font-bold">
              {selectedCount} / {totalSlots} items selected
            </span>
            {selectedCount >= 3 ? (
              <span className="text-xs bg-emerald-900/80 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-700">
                Ready for Virtual Try-On
              </span>
            ) : (
              <span className="text-xs bg-taupe-700 text-taupe-200 px-2.5 py-0.5 rounded-full">
                Select remaining items
              </span>
            )}
          </div>
          <p className="text-xs text-taupe-300 mt-0.5">
            {tryExistingSelection.layer ? "Full ensemble ready." : "Missing layer will use simulated product screenshot."}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!tryExistingSelection.layer && (
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/shop-new')}
              className="text-white border-taupe-500 hover:bg-white/10 w-full sm:w-auto"
            >
              Shop Missing Item
            </Button>
          )}

          <Button
            variant="white"
            size="md"
            onClick={() => navigate('/try-on/upload')}
            className="w-full sm:w-auto font-semibold"
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            Continue to Try-On →
          </Button>
        </div>
      </div>

    </div>
  );
};

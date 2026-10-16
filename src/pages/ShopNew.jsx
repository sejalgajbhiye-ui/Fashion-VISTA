import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFashion } from '../context/FashionContext';
import { UploadBox } from '../components/UploadBox';
import { ImagePreview } from '../components/ImagePreview';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ShoppingBag, ArrowRight, Sparkles, AlertCircle, Info, ExternalLink, Check } from 'lucide-react';

export const ShopNew = () => {
  const navigate = useNavigate();
  const {
    currentRecommendation,
    missingItemPhoto,
    setMissingItemPhoto,
    setCustomGarmentPhoto,
    setCustomGarmentName,
    showToast
  } = useFashion();

  // Extract missing items dynamically from active recommendation
  const missingItems = (currentRecommendation?.items || []).filter(item => !item.inWardrobe && !item.owned);

  const fallbackItem = {
    name: "Denim Jacket",
    category: "Layer",
    colour: "Indigo Blue",
    price: 1899,
    retailer: "Myntra",
    buy_link: "https://www.myntra.com/women-jackets",
    reason: "Adds architectural structure over tops while shielding from air-conditioned lecture halls.",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80"
  };

  const displayMissingItems = missingItems.length > 0 ? missingItems : [fallbackItem];

  const [currentImage, setCurrentImage] = useState(missingItemPhoto);

  const handleImageUploaded = (dataUrl) => {
    setCurrentImage(dataUrl);
    setMissingItemPhoto(dataUrl);
    showToast("Product screenshot loaded successfully!", "success");
  };

  const handleReplace = () => {
    setCurrentImage(null);
    setMissingItemPhoto(null);
  };

  const handleTryItemInStudio = (item) => {
    if (item.image) {
      setCustomGarmentPhoto(item.image);
      setCustomGarmentName(item.name);
    }
    navigate('/try-on');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="text-[11px] uppercase font-bold tracking-widest text-charcoal-500 bg-white px-3 py-1 rounded-full border border-taupe-200 shadow-xs">
          Targeted Gap Fill • Dynamic Online Retailer Discovery
        </span>
        <h1 className="editorial-heading text-3xl sm:text-4xl md:text-5xl font-semibold text-charcoal-900">
          Shop Missing Outfit Pieces
        </h1>
        <p className="text-sm text-charcoal-600">
          Real products matching your recommendation from Myntra. Buy directly or test on yourself in the AI Try-On Studio.
        </p>
      </div>

      {/* DYNAMIC MISSING PRODUCTS FROM MYNTRA */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-taupe-200">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-charcoal-900" />
            <h3 className="editorial-heading text-xl sm:text-2xl font-bold text-charcoal-900">
              Missing from Your Wardrobe ({displayMissingItems.length})
            </h3>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
            Real Retail Products (Myntra)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayMissingItems.map((item, idx) => {
            const buyUrl = item.buy_link || item.buy_url || `https://www.myntra.com/${encodeURIComponent(item.name || '').replace(/%20/g, '-')}`;

            return (
              <div
                key={item.id || idx}
                className="bg-white rounded-2xl p-6 border border-taupe-200 shadow-card flex flex-col justify-between space-y-5 hover:border-taupe-400 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-24 h-32 rounded-xl overflow-hidden bg-taupe-100 shrink-0 border border-taupe-200">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="bg-amber-100 text-amber-900 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-300">
                        🛍️ Shop Online
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-500">
                        {item.slot || item.category}
                      </span>
                    </div>

                    <h4 className="editorial-heading text-lg font-bold text-charcoal-900 line-clamp-2">
                      {item.name}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-charcoal-900">
                        ₹{item.price || 999}
                      </span>
                      {item.mrp && item.mrp > (item.price || 999) && (
                        <span className="text-xs line-through text-charcoal-400">
                          ₹{item.mrp}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {item.retailer || 'Myntra'}
                      </span>
                    </div>

                    <p className="text-xs text-charcoal-500 line-clamp-2">
                      {item.description || item.reason || `Tailored ${item.colour} piece to complete your coordinated ensemble.`}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-taupe-100 flex items-center justify-between gap-3">
                  <a
                    href={buyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm text-center"
                  >
                    <span>Buy on {item.retailer || 'Myntra'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleTryItemInStudio(item)}
                    iconRight={<ArrowRight className="w-3.5 h-3.5" />}
                    className="text-xs font-bold"
                  >
                    Try in Studio
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UPLOAD CUSTOM SCREENSHOT / PRODUCT PHOTO */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-taupe-200 shadow-card space-y-6">
        <div>
          <h3 className="editorial-heading text-xl font-bold text-charcoal-900 mb-1">
            Have a different piece in mind? Upload any screenshot
          </h3>
          <p className="text-xs sm:text-sm text-charcoal-500">
            Found something on Zara, H&M, or Pinterest? Upload a screenshot here to simulate virtual try-on on your own photo.
          </p>
        </div>

        {currentImage ? (
          <div className="max-w-md mx-auto space-y-4">
            <ImagePreview
              src={currentImage}
              alt="Uploaded Product Screenshot"
              onReplace={handleReplace}
              onRemove={handleReplace}
              badge="Product Screenshot Attached"
              aspectRatio="aspect-[4/3]"
            />
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Garment extracted. Ready to merge into your virtual try-on studio.</span>
            </div>
          </div>
        ) : (
          <UploadBox
            title="Upload a product screenshot"
            subtitle="Shop on any platform, take a screenshot and drop it here."
            onImageSelected={handleImageUploaded}
            requirements={[
              "Supported: JPG, PNG, WEBP",
              "Maximum size: 10 MB",
              "Front-facing product photo"
            ]}
          />
        )}

        {/* Clear Notice: No commerce / cart */}
        <div className="p-4 bg-[#FAF8F5] rounded-xl border border-taupe-200 text-xs text-charcoal-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-taupe-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-charcoal-900">Zero Middleman Markup:</strong> Fashion VISTA does not hold retailer inventory or add markups. We find genuine live products directly on permitted platforms so you make conscious wardrobe choices.
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-taupe-200">
          <Button
            variant="ghost"
            size="md"
            onClick={() => navigate('/recommendations')}
          >
            ← Back to Recommendations
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => navigate('/try-on')}
            iconRight={<ArrowRight className="w-4 h-4" />}
          >
            Proceed to Virtual Try-On Studio →
          </Button>
        </div>

      </div>

    </div>
  );
};

import React from 'react';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from './Badge';
import { resolveGarmentImageUrl, getCategoryFallback } from '../utils/imageUtils';

export const OutfitCard = ({
  outfit = {},
  onView,
  actionText = "View Outfit →",
  isHistory = false,
  textOnly = false
}) => {
  outfit = outfit || {};
  const ownedCount = outfit.ownedCount ?? outfit.wardrobe_match?.matched_count ?? 2;
  const totalCount = outfit.totalCount ?? outfit.wardrobe_match?.required_count ?? (outfit.items?.length || 3);
  const missingCount = Math.max(0, totalCount - ownedCount);

  if (textOnly) {
    return (
      <div className="group bg-white rounded-2xl overflow-hidden border border-taupe-200 hover:border-taupe-400 hover:shadow-card transition-all duration-300 flex flex-col p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-taupe-100">
          <div className="flex items-center gap-2">
            {outfit.number && (
              <span className="bg-charcoal-900 text-cream-50 text-[10px] font-bold tracking-widest px-2.5 py-0.5 rounded">
                OUTFIT {outfit.number}
              </span>
            )}
            <span className="text-[10px] font-semibold tracking-wider uppercase text-charcoal-500">
              Styling Blueprint
            </span>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {ownedCount}/{totalCount} in Closet
          </span>
        </div>

        <div>
          <h4 className="editorial-heading text-xl font-bold text-charcoal-900 group-hover:text-black">
            {outfit.name || outfit.outfitName}
          </h4>
          <p className="text-xs text-charcoal-500 mt-1 line-clamp-2 leading-relaxed">
            {outfit.description || outfit.subtitle || "Curated coordination matching your preference guidelines."}
          </p>
        </div>

        {/* Garment Piece Text Breakdown */}
        <div className="bg-taupe-50/70 rounded-xl p-3.5 border border-taupe-200/60 space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-charcoal-700">
            What to wear:
          </div>
          {outfit.items && outfit.items.length > 0 ? (
            <div className="space-y-1.5">
              {outfit.items.map((it, idx) => {
                const isOwned = it.inWardrobe ?? it.owned ?? false;
                return (
                  <div key={it.id || idx} className="flex items-center justify-between text-xs">
                    <span className="text-charcoal-800 font-medium truncate max-w-[190px]">
                      • {it.name}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      isOwned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {isOwned ? 'In Closet' : 'Need to Buy'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-charcoal-700 font-medium">
              {outfit.itemsSummary || outfit.outfitSummary}
            </p>
          )}
        </div>

        {/* Match summary footer */}
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-cream-50 border border-taupe-200/60">
          <span className="text-charcoal-600 font-medium">Closet Status</span>
          <span className="font-semibold text-charcoal-900">
            {ownedCount} in Closet • {missingCount > 0 ? `${missingCount} Needed to Buy` : 'Complete!'}
          </span>
        </div>

        <button
          onClick={() => onView && onView(outfit)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-charcoal-900 text-white text-xs font-semibold hover:bg-black transition-all shadow-subtle"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-taupe-200 hover:border-taupe-300 hover:shadow-card transition-all duration-300 flex flex-col">
      <div className="relative aspect-[4/3] bg-taupe-100 overflow-hidden">
        <img
          src={resolveGarmentImageUrl(outfit.image, 'Dresses', outfit.name || outfit.outfitName)}
          alt={outfit.name || outfit.outfitName}
          onError={(e) => {
            e.target.src = getCategoryFallback('Dresses', outfit.name || outfit.outfitName);
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {outfit.number && (
          <div className="absolute top-3 left-3 bg-charcoal-900 text-cream-50 text-[10px] font-bold tracking-widest px-2.5 py-1 rounded">
            OUTFIT {outfit.number}
          </div>
        )}
        {outfit.date && (
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-charcoal-800 text-xs font-semibold px-2.5 py-1 rounded shadow-sm">
            {outfit.date}
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4 className="editorial-heading text-lg font-semibold text-charcoal-900 group-hover:text-black">
              {outfit.name || outfit.outfitName}
            </h4>
          </div>

          <p className="text-xs text-charcoal-500 mb-3 leading-relaxed">
            {outfit.itemsSummary || outfit.outfitSummary}
          </p>

          {/* Wardrobe Match status */}
          <div className="flex items-center justify-between text-xs py-2 px-3 bg-taupe-50 rounded-lg border border-taupe-200/60 mb-4">
            <span className="text-charcoal-600 font-medium">Wardrobe Match</span>
            <div className="flex items-center gap-1.5 font-semibold text-charcoal-900">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {outfit.wardrobeMatch || `${ownedCount} / ${totalCount} owned`}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onView && onView(outfit)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#FAF8F5] text-charcoal-900 text-xs font-semibold border border-taupe-300 hover:bg-charcoal-900 hover:text-white transition-all group-hover:border-charcoal-900"
        >
          <span>{actionText}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

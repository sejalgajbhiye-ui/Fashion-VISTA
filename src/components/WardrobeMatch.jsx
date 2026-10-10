import React from 'react';
import { ProgressBar } from './ProgressBar';
import { Check, Circle } from 'lucide-react';

export const WardrobeMatch = ({
  ownedCount = 3,
  totalCount = 4,
  percentage = 75,
  statusText = "You're almost ready.",
  subtext = "Only 1 item may need to be purchased.",
  items = [],
  className = ""
}) => {
  return (
    <div className={`bg-gradient-to-br from-[#FCFAF7] to-[#F5EFE6] border border-taupe-300/80 rounded-2xl p-6 sm:p-8 shadow-sm ${className}`}>
      
      {/* Top Banner / Label */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs uppercase font-bold tracking-widest text-charcoal-700 bg-white/90 px-3 py-1 rounded-full border border-taupe-200">
          Wardrobe Match
        </span>
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          {percentage}% closet-ready
        </span>
      </div>

      {/* Main Metric Hero */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-4">
        <div className="flex items-baseline gap-2">
          <span className="editorial-heading text-5xl sm:text-6xl font-bold text-charcoal-900 tracking-tight">
            {ownedCount} / {totalCount}
          </span>
          <span className="text-sm font-semibold text-charcoal-600 uppercase tracking-wider">
            items owned
          </span>
        </div>
        <p className="editorial-sub text-lg sm:text-xl italic text-charcoal-800 font-medium">
          "{statusText}"
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <ProgressBar
          value={percentage}
          max={100}
          height="h-3"
          barColor="bg-charcoal-900"
          trackColor="bg-taupe-200"
        />
        <div className="flex justify-between items-center text-xs text-charcoal-600 font-medium mt-2">
          <span>{percentage}% complete</span>
          <span className="text-charcoal-900 font-semibold">{subtext}</span>
        </div>
      </div>

      {/* Item Checklist */}
      {items && items.length > 0 && (
        <div className="mt-6 pt-5 border-t border-taupe-300/60 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {items.map((item, idx) => {
            const isOwned = item.inWardrobe ?? item.owned ?? false;
            return (
              <div
                key={item.id || idx}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium border ${
                  isOwned
                    ? 'bg-white/80 border-emerald-200/80 text-charcoal-800'
                    : 'bg-amber-50/70 border-amber-200 text-charcoal-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isOwned ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-amber-400 bg-white text-amber-600 flex items-center justify-center shrink-0">
                      <Circle className="w-2 h-2 fill-amber-400" />
                    </div>
                  )}
                  <span className="truncate max-w-[170px] sm:max-w-[190px]">{item.name}</span>
                </div>
                <span className={`text-[11px] font-semibold shrink-0 uppercase tracking-wider ${
                  isOwned ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {isOwned ? 'In Closet' : 'Needed to Buy'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

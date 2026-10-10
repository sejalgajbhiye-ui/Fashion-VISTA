import React from 'react';
import { Badge } from './Badge';
import { Check, AlertCircle } from 'lucide-react';

export const ClothingCard = ({
  item,
  selectable = false,
  selected = false,
  onSelect,
  showStatus = true,
  actionButton,
  className = ''
}) => {
  return (
    <div
      onClick={selectable && onSelect ? () => onSelect(item) : undefined}
      className={`group relative bg-white rounded-xl overflow-hidden border transition-all duration-300 ${
        selected
          ? 'border-charcoal-900 ring-2 ring-charcoal-900 shadow-md'
          : 'border-taupe-200 hover:border-taupe-400 hover:shadow-card'
      } ${selectable ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Image container */}
      <div className="relative aspect-[3/4] bg-taupe-100 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />

        {/* Selected badge overlay */}
        {selectable && selected && (
          <div className="absolute top-3 right-3 bg-charcoal-900 text-cream-50 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
            <Check className="w-3.5 h-3.5" />
            <span>Selected</span>
          </div>
        )}

        {/* Wardrobe status badge */}
        {showStatus && !selectable && (
          <div className="absolute top-3 left-3">
            {(item.inWardrobe ?? item.owned ?? false) ? (
              <Badge variant="inWardrobe" size="sm">
                <Check className="w-3 h-3 stroke-[2.5]" /> ALREADY IN CLOSET
              </Badge>
            ) : (
              <Badge variant="missing" size="sm">
                <AlertCircle className="w-3 h-3 stroke-[2.5]" /> NEEDED TO BUY
              </Badge>
            )}
          </div>
        )}

        {/* Category pill */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-charcoal-900/80 backdrop-blur-sm text-white px-2 py-0.5 rounded text-[11px] font-medium tracking-wide">
            {item.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 bg-white">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-sm text-charcoal-900 group-hover:text-black line-clamp-1">
            {item.name}
          </h4>
        </div>

        <div className="flex items-center justify-between text-xs text-charcoal-500">
          <span>{item.colour}</span>
          {item.style && <span className="text-taupe-500">{item.style}</span>}
        </div>

        {item.description && (
          <p className="text-xs text-charcoal-500 mt-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {actionButton && (
          <div className="mt-3 pt-3 border-t border-taupe-100">
            {actionButton}
          </div>
        )}
      </div>
    </div>
  );
};

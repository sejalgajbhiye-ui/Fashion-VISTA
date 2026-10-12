import React, { useState, useEffect } from 'react';
import { Trash2, Edit3, Tag } from 'lucide-react';
import { Badge } from './Badge';
import { resolveGarmentImageUrl, getCategoryFallback } from '../utils/imageUtils';

export const WardrobeCard = ({
  item,
  onEdit,
  onDelete
}) => {
  const [imgSrc, setImgSrc] = useState(() =>
    resolveGarmentImageUrl(item?.image, item?.category, item?.name)
  );

  useEffect(() => {
    setImgSrc(resolveGarmentImageUrl(item?.image, item?.category, item?.name));
  }, [item?.image, item?.category, item?.name]);

  const handleImageError = () => {
    const fallback = getCategoryFallback(item?.category, item?.name);
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    }
  };

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-taupe-200 hover:border-taupe-300 hover:shadow-card transition-all duration-300 flex flex-col">
      {/* Image Area */}
      <div className="relative aspect-[3/4] bg-taupe-100 overflow-hidden">
        <img
          src={imgSrc}
          alt={item.name}
          onError={handleImageError}
          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        
        {/* Category Pill */}
        <div className="absolute top-3 left-3">
          <Badge variant="tag" size="xs" className="shadow-sm font-semibold">
            {item.category}
          </Badge>
        </div>

        {/* Brand Tag if present */}
        {item.brand && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-charcoal-900/75 backdrop-blur-sm text-cream-50 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded font-medium">
              {item.brand}
            </span>
          </div>
        )}
      </div>

      {/* Details Area */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-semibold text-sm text-charcoal-900 line-clamp-1 group-hover:text-black">
            {item.name}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-charcoal-500">
            <span>{item.colour}</span>
            <span>•</span>
            <span>{item.style}</span>
            {item.season && (
              <>
                <span>•</span>
                <span className="text-taupe-500">{item.season}</span>
              </>
            )}
          </div>
          {item.description && (
            <p className="text-xs text-charcoal-400 mt-2 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-taupe-100 text-xs">
          <button
            onClick={() => onEdit && onEdit(item)}
            className="inline-flex items-center gap-1 text-charcoal-600 hover:text-charcoal-900 font-medium transition-colors p-1"
            title="Edit item details"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => onDelete && onDelete(item.id)}
            className="inline-flex items-center gap-1 text-roseAccent-500 hover:text-roseAccent-700 font-medium transition-colors p-1"
            title="Remove from wardrobe"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

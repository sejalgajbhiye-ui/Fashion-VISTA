import React from 'react';
import { Trash2, Edit3, Tag } from 'lucide-react';
import { Badge } from './Badge';

export const WardrobeCard = ({
  item,
  onEdit,
  onDelete
}) => {
  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-taupe-200 hover:border-taupe-300 hover:shadow-card transition-all duration-300 flex flex-col">
      {/* Image Area */}
      <div className="relative aspect-[3/4] bg-taupe-100 overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
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
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onEdit) onEdit(item);
            }}
            className="inline-flex items-center gap-1 text-charcoal-600 hover:text-charcoal-900 font-medium transition-colors p-1 rounded hover:bg-taupe-100 cursor-pointer"
            title="Edit item details"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(item);
            }}
            className="inline-flex items-center gap-1 text-roseAccent-600 hover:text-roseAccent-700 hover:bg-roseAccent-50 font-medium transition-colors px-2 py-1 rounded cursor-pointer"
            title="Remove from wardrobe"
          >
            <Trash2 className="w-3.5 h-3.5 text-roseAccent-600" />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
};

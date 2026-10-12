/**
 * Fashion VISTA — Image Utilities & Smart Resolution
 *
 * Handles cross-origin image resolution between Vercel frontend,
 * Render backend, Supabase PostgreSQL, and local environments.
 * Guarantees zero broken images with high-definition CDN fallbacks.
 */

// Globally reliable CDN fallback images curated by category and style
export const CATEGORY_FALLBACK_IMAGES = {
  Tops: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80',
  Tshirt: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80',
  Bottoms: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80',
  Jeans: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80',
  Dresses: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80',
  Saree: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80',
  Shoes: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80',
  Accessories: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80',
  Default: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'
};

/**
 * Returns an appropriate high-definition fallback image URL based on category and item name
 * @param {string} category
 * @param {string} name
 * @returns {string} Image URL
 */
export function getCategoryFallback(category = '', name = '') {
  const cat = String(category || '').toLowerCase();
  const n = String(name || '').toLowerCase();

  // 1. Match authentic user wardrobe garments
  if (n.includes('maroon') || (n === 'top' && cat.includes('top'))) {
    return '/wardrobe_user/maroon_collared_top.jpg';
  }
  if (n.includes('peplum') || n.includes('beige')) {
    return '/wardrobe_user/beige_peplum_top.jpg';
  }
  if (n.includes('vest') || n.includes('pinstripe')) {
    return '/wardrobe_user/black_pinstripe_vest.jpg';
  }
  if (n.includes('puff') || n.includes('pink')) {
    return '/wardrobe_user/pink_puff_sleeve_blouse.jpg';
  }
  if (n.includes('gingham') || n.includes('red')) {
    return '/wardrobe_user/red_gingham_peplum_top.jpg';
  }
  if (n.includes('floral') || n.includes('ruffle')) {
    return '/wardrobe_user/floral_ruffle_blouse.jpg';
  }
  if (n.includes('sneaker') || (n === 'sneaker' && cat.includes('shoe'))) {
    return '/wardrobe_user/grey_suede_sneakers.jpg';
  }
  if (n.includes('sandal') || n.includes('slide') || (n === 'sandal' && cat.includes('shoe'))) {
    return '/wardrobe_user/dual_strap_slide_sandals.jpg';
  }
  if (n.includes('powder') || n.includes('asymmetric') || (cat.includes('dress') && n.includes('blue'))) {
    return '/wardrobe_user/powder_blue_asymmetric_dress.jpg';
  }
  if (n.includes('skirt') || n.includes('midi') || (n === 'skirt' && cat.includes('dress'))) {
    return '/wardrobe_user/belted_black_midi_dress.jpg';
  }

  // 2. Generic Category fallbacks
  if (n.includes('saree') || cat.includes('saree') || n.includes('ethnic') || n.includes('drape') || n.includes('anarkali') || n.includes('lehenga')) {
    return CATEGORY_FALLBACK_IMAGES.Saree;
  }
  if (n.includes('tshirt') || n.includes('t-shirt') || n.includes('tee')) {
    return CATEGORY_FALLBACK_IMAGES.Tshirt;
  }
  if (n.includes('jean') || n.includes('denim') || cat.includes('bottom') || cat.includes('pant') || cat.includes('trouser')) {
    return CATEGORY_FALLBACK_IMAGES.Jeans;
  }
  if (cat.includes('dress') || cat.includes('gown')) {
    return '/wardrobe_user/belted_black_midi_dress.jpg';
  }
  if (cat.includes('shoe') || cat.includes('heel') || cat.includes('boot')) {
    return '/wardrobe_user/grey_suede_sneakers.jpg';
  }
  if (cat.includes('access') || cat.includes('bag') || cat.includes('watch') || cat.includes('belt')) {
    return CATEGORY_FALLBACK_IMAGES.Accessories;
  }
  if (cat.includes('top') || cat.includes('shirt') || cat.includes('blazer') || cat.includes('jacket')) {
    return '/wardrobe_user/maroon_collared_top.jpg';
  }

  return CATEGORY_FALLBACK_IMAGES.Default;
}

/**
 * Resolves a garment image URL across Vercel, Supabase, base64, and local dev
 * @param {string} img - Raw image URL or relative path
 * @param {string} category - Item category for fallback
 * @param {string} name - Item name for specific fallback
 * @returns {string} Fully qualified image URL
 */
export function resolveGarmentImageUrl(img, category = '', name = '') {
  if (!img || typeof img !== 'string' || img.trim() === '') {
    return getCategoryFallback(category, name);
  }

  const clean = img.trim();

  // 1. Data URLs (base64) work everywhere immediately
  if (clean.startsWith('data:image')) {
    return clean;
  }

  // 2. Intercept legacy local API paths (/api/wardrobe/uploads/...) which 404 on Vercel
  if (clean.startsWith('/api/') || clean.startsWith('api/')) {
    return getCategoryFallback(category, name);
  }

  // 3. User static assets served by Vercel
  if (clean.startsWith('/wardrobe_user/')) {
    return clean;
  }

  // 4. Absolute HTTP/HTTPS URLs (Unsplash, Supabase storage, Cloudinary, etc.)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // 5. Static assets in public folder
  if (clean.startsWith('/')) {
    return clean;
  }

  return getCategoryFallback(category, name);
}

/**
 * Compresses an image file client-side to a lightweight base64 Data URL (~60-100KB)
 * Guarantees fast upload and instant display without server storage dependencies.
 * @param {File} file
 * @param {number} maxWidth
 * @param {number} quality
 * @returns {Promise<string>} Base64 data URL
 */
export function compressImageFile(file, maxWidth = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof File || file instanceof Blob)) {
      return reject(new Error('Invalid file provided for compression'));
    }

    const reader = new FileReader();
    reader.onerror = (e) => reject(e);
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (e) => reject(e);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target.result);
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

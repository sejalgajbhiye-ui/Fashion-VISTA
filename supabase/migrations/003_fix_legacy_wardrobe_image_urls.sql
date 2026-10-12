-- ==============================================================================
-- Fashion VISTA — Migration 003: Fix Legacy Wardrobe Image URLs
-- Replaces unreachable local relative upload paths (/api/wardrobe/uploads/...)
-- with permanent, high-definition Unsplash CDN images matching category & style.
-- ==============================================================================

UPDATE public.wardrobe_items
SET image = CASE 
    WHEN name ILIKE '%saree%' OR name ILIKE '%ethnic%' OR name ILIKE '%drape%' THEN 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80'
    WHEN name ILIKE '%tshirt%' OR name ILIKE '%t-shirt%' OR name ILIKE '%tee%' OR (category = 'Tops' AND name ILIKE '%top%') THEN 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80'
    WHEN name ILIKE '%jean%' OR name ILIKE '%denim%' OR category = 'Bottoms' THEN 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80'
    WHEN category = 'Dresses' THEN 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80'
    WHEN category = 'Tops' THEN 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'
    WHEN category = 'Shoes' THEN 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80'
    WHEN category = 'Accessories' THEN 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80'
    ELSE 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80'
END
WHERE image LIKE '/api/wardrobe/uploads/%' 
   OR image IS NULL 
   OR image = '';

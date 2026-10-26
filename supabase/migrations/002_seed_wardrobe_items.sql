-- ============================================================
-- Fashion VISTA Seed Data Export from SQLite (20261025_214535)
-- Inserts default / existing wardrobe items into Supabase PostgreSQL
-- Safe and idempotent (ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.wardrobe_items (
    id, name, category, colour, style, season, brand, description, image, predicted_category, confidence, model_used, is_sample
) VALUES
    ('item-1', 'Classic White Linen Shirt', 'Tops', 'White', 'Formal', 'Summer', 'Uniqlo', 'Breathable linen shirt for business casual and summer events.', 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80', 'Shirt', 0.95, 'FashionCNN (PyTorch)', TRUE),
    ('item-2', 'Dark Slim-Fit Denim Jeans', 'Bottoms', 'Blue', 'Casual', 'All Season', 'Levi''s', 'Versatile dark wash jeans for everyday styling.', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80', 'Trouser', 0.98, 'FashionCNN (PyTorch)', TRUE),
    ('item-3', 'Tailored Navy Blazer', 'Tops', 'Navy', 'Formal', 'Fall', 'Zara', 'Structured slim-fit single-breasted blazer.', 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=700&q=80', 'Coat', 0.91, 'FashionCNN (PyTorch)', TRUE),
    ('item-4', 'White Minimal Leather Sneakers', 'Shoes', 'White', 'Casual', 'All Season', 'Stan Smith', 'Clean low-profile leather sneakers.', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80', 'Sneaker', 0.96, 'FashionCNN (PyTorch)', TRUE),
    ('item-5', 'Emerald Silk Midi Dress', 'Dresses', 'Green', 'Party', 'Summer', 'Mango', 'Elegant emerald green silk dress with gentle drape.', 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=80', 'Dress', 0.93, 'FashionCNN (PyTorch)', TRUE),
    ('item-6', 'Tan Leather Crossbody Bag', 'Accessories', 'Brown', 'Casual', 'All Season', 'Coach', 'Everyday crossbody bag with brass hardware.', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=700&q=80', 'Bag', 0.97, 'FashionCNN (PyTorch)', TRUE),
    ('item-1791774181932', 'Saree', 'Dresses', 'Red', 'Traditional', 'All Season', '', '', '/api/wardrobe/uploads/garment_808456684a.png', 'Dress', 0.96, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791774614080', 'Jeans', 'Bottoms', 'Blue', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_5a85660023.png', 'Jeans', 0.8122, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791774894177', 'Saree', 'Dresses', 'White', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_4d81c2e930.png', 'Dress', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791774921418', 'Tshirt', 'Tops', 'Black', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_91c9c66172.png', 'Top', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791777624675', 'Saree / Ethnic Drape', 'Dresses', 'Blue', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_984c1b7ad6.png', 'Saree / Ethnic Drape', 0.7518, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791781681414', 'Dress', 'Dresses', 'Red', 'Traditional', 'All Season', '', '', '/api/wardrobe/uploads/garment_b3edcdfe0b.png', 'Dress', 0.96, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782455683', 'Top', 'Tops', 'Red', 'Formal', 'All Season', '', '', '/api/wardrobe/uploads/garment_c5f12f6061.jpg', 'Top', 0.96, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782481677', 'Top', 'Tops', 'White', 'Formal', 'All Season', '', '', '/api/wardrobe/uploads/garment_af87313c8f.jpg', 'Top', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782509296', 'Skirt', 'Dresses', 'Black', 'Western', 'All Season', '', '', '/api/wardrobe/uploads/garment_8049ba8fcf.jpg', 'Skirt', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782533723', 'Top', 'Tops', 'Pink', 'Western', 'All Season', '', '', '/api/wardrobe/uploads/garment_52afd3eebd.jpg', 'Top', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782556195', 'Sneaker', 'Shoes', 'Grey', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_ccf72f9971.jpg', 'Sneaker', 0.7, 'MobileNetV2 Vision (Deep Neural Network)', TRUE),
    ('item-1791782592728', 'Sandal', 'Shoes', 'Brown', 'Casual', 'All Season', '', '', '/api/wardrobe/uploads/garment_3b2da5b001.jpg', 'Sandal', 0.96, 'MobileNetV2 Vision (Deep Neural Network)', TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    colour = EXCLUDED.colour,
    style = EXCLUDED.style,
    season = EXCLUDED.season,
    brand = EXCLUDED.brand,
    description = EXCLUDED.description,
    image = EXCLUDED.image,
    predicted_category = EXCLUDED.predicted_category,
    confidence = EXCLUDED.confidence,
    model_used = EXCLUDED.model_used,
    is_sample = EXCLUDED.is_sample;

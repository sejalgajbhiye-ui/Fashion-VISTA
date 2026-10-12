import base64
from pathlib import Path

items = [
    ('item-u1', 'Maroon Collared Sleeveless Top', 'Tops', 'Maroon', 'Formal', 'Summer', 'Zara', 'Deep maroon collared sleeveless blouse paired with tailored trousers.', 'maroon_collared_top.jpg'),
    ('item-u2', 'Beige Sleeveless Peplum Top', 'Tops', 'Beige', 'Formal', 'All Season', 'Mango', 'Sleek beige sleeveless peplum blouse with elegant round neck silhouette.', 'beige_peplum_top.jpg'),
    ('item-u3', 'Black Pinstripe Tailored Vest', 'Tops', 'Black', 'Formal', 'All Season', 'Massimo Dutti', 'Structured black pinstripe waistcoat vest with button front and V-neckline.', 'black_pinstripe_vest.jpg'),
    ('item-u4', 'Pink Striped Puff Sleeve Blouse', 'Tops', 'Pink', 'Casual', 'Summer', 'H&M', 'Charming pink and white striped puff sleeve top with sweetheart neckline.', 'pink_puff_sleeve_blouse.jpg'),
    ('item-u5', 'Red Gingham Check Peplum Top', 'Tops', 'Red', 'Casual', 'Summer', 'Urbanic', 'Vintage-inspired red and white gingham check puff sleeve square neck top.', 'red_gingham_peplum_top.jpg'),
    ('item-u6', 'Floral Print Ruffle Blouse', 'Tops', 'Blue', 'Casual', 'Spring / Autumn', 'FabIndia', 'Grey-blue printed summer top with coral floral motifs and flutter sleeves.', 'floral_ruffle_blouse.jpg'),
    ('item-u7', 'Grey Suede Low-Top Sneakers', 'Shoes', 'Grey', 'Casual', 'All Season', 'Puma', 'Clean grey suede casual sneakers with contrast white platform sole.', 'grey_suede_sneakers.jpg'),
    ('item-u8', 'Dual-Strap Comfort Slide Sandals', 'Shoes', 'Black', 'Casual', 'Summer', 'Birkenstock', 'Classic double-buckle strap footbed slides in black with cork sole.', 'dual_strap_slide_sandals.jpg'),
    ('item-u9', 'Powder Blue Asymmetric Scarf Dress', 'Dresses', 'Blue', 'Formal', 'Summer', 'Zara', 'Elegant ice-blue one-shoulder midi dress with asymmetrical drape and neck tie.', 'powder_blue_asymmetric_dress.jpg'),
    ('item-u10', 'Belted Black A-Line Midi Dress', 'Dresses', 'Black', 'Formal', 'All Season', 'Marks & Spencer', 'Sophisticated black sleeveless midi dress with boat neck and waist tie.', 'belted_black_midi_dress.jpg')
]

lines = []
lines.append('-- ==============================================================================')
lines.append('-- Fashion VISTA — Migration 005: Insert User Uploaded Wardrobe for shrutiyalamante@gmail.com')
lines.append('-- Directly inserts 10 real uploaded garments with their self-contained Base64 photo data')
lines.append('-- ==============================================================================')
lines.append('')
lines.append('DO $$')
lines.append('DECLARE')
lines.append('    target_user_id UUID;')
lines.append('BEGIN')
lines.append("    -- Find user UUID for shrutiyalamante@gmail.com")
lines.append("    SELECT id INTO target_user_id FROM auth.users WHERE email = 'shrutiyalamante@gmail.com' LIMIT 1;")
lines.append('')
lines.append('    IF target_user_id IS NULL THEN')
lines.append("        RAISE EXCEPTION 'User shrutiyalamante@gmail.com not found in auth.users!';")
lines.append('    END IF;')
lines.append('')
lines.append('    -- Clean up previous broken / placeholder items for this user')
lines.append('    DELETE FROM public.wardrobe_items WHERE user_id = target_user_id;')
lines.append('')
lines.append('    -- Insert all 10 garments with their authentic uploaded images')

for item_id, name, cat, col, sty, sea, brd, desc, fname in items:
    fpath = Path('public/wardrobe_user') / fname
    with open(fpath, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
    data_url = f'data:image/jpeg;base64,{b64}'
    
    desc_escaped = desc.replace("'", "''")
    name_escaped = name.replace("'", "''")
    brd_escaped = brd.replace("'", "''")
    
    lines.append(f"    INSERT INTO public.wardrobe_items (")
    lines.append("        id, user_id, is_sample, name, category, colour, style, season, brand, description, image")
    lines.append("    ) VALUES (")
    lines.append(f"        '{item_id}', target_user_id, FALSE, '{name_escaped}', '{cat}', '{col}', '{sty}', '{sea}', '{brd_escaped}', '{desc_escaped}', '{data_url}'")
    lines.append("    );")
    lines.append('')

lines.append("    RAISE NOTICE 'Successfully added all 10 wardrobe garments for shrutiyalamante@gmail.com!';")
lines.append('END $$;')
lines.append('')

out_path = Path('supabase/migrations/005_insert_user_uploaded_wardrobe.sql')
with open(out_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'Wrote {out_path} ({out_path.stat().st_size} bytes)')

"""
Fashion VISTA — AI Composed Outfit Canvas Generator.

Generates a stylized editorial flat-lay styling canvas (moodboard) using Pillow (PIL),
compositing the recommended garments (Top, Bottom, Footwear, Layer) alongside
color palette indicators, styling tags, and compatibility metrics.
"""

import os
import io
import hashlib
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent.parent
LOOKS_DIR = BASE_DIR / "backend" / "uploads" / "looks"
LOOKS_DIR.mkdir(parents=True, exist_ok=True)

COLOR_HEX_MAP = {
    "black": (26, 26, 26),
    "white": (245, 245, 245),
    "blue": (30, 58, 138),
    "navy": (15, 23, 42),
    "red": (185, 28, 28),
    "pink": (244, 114, 182),
    "green": (22, 101, 52),
    "beige": (229, 217, 196),
    "brown": (120, 53, 15),
    "khaki": (194, 178, 128),
    "grey": (107, 114, 128),
    "gray": (107, 114, 128),
    "charcoal": (45, 45, 45),
    "maroon": (128, 0, 0),
    "yellow": (234, 179, 8),
    "orange": (234, 88, 12),
    "purple": (126, 34, 206)
}


def _get_font(size=14, bold=False):
    """Attempt system font loading or fallback to default."""
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except Exception:
        try:
            font_name = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
            return ImageFont.truetype(font_name, size)
        except Exception:
            return ImageFont.load_default()


def _fetch_thumbnail(image_url, size=(180, 220)):
    """Fetch image from URL or return an elegant color placeholder."""
    if image_url and image_url.startswith("http"):
        try:
            req = urllib.request.Request(image_url, headers={"User-Agent": "Fashion-VISTA/2.0"})
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                data = resp.read()
                img = Image.open(io.BytesIO(data)).convert("RGB")
                img.thumbnail(size, Image.Resampling.LANCZOS)
                # Paste into exact size canvas centered
                bg = Image.new("RGB", size, (246, 244, 240))
                offset_x = (size[0] - img.width) // 2
                offset_y = (size[1] - img.height) // 2
                bg.paste(img, (offset_x, offset_y))
                return bg
        except Exception:
            pass

    # Fallback placeholder
    bg = Image.new("RGB", size, (240, 237, 230))
    d = ImageDraw.Draw(bg)
    d.rectangle([(4, 4), (size[0] - 5, size[1] - 5)], outline=(210, 205, 195), width=1)
    return bg


def generate_composed_outfit_canvas(outfit_data):
    """
    Synthesizes a high-aesthetic editorial flat-lay styling card for the outfit.
    Returns static URL path: /api/wardrobe/uploads/looks/look_<hash>.jpg
    """
    outfit_id = outfit_data.get("id", "curated_look")
    outfit_name = outfit_data.get("name", "Curated Outfit")
    occasion = outfit_data.get("occasion", "Everyday")
    style = outfit_data.get("style", "Curated")
    season = outfit_data.get("season", "All Season")
    score = outfit_data.get("compatibility_score", 92)
    items = outfit_data.get("items", [])

    # Unique hash based on items
    item_keys = "-".join([f"{i.get('name')}_{i.get('colour')}" for i in items])
    digest = hashlib.md5(f"{outfit_id}_{item_keys}".encode("utf-8")).hexdigest()[:12]
    filename = f"look_{digest}.jpg"
    target_path = LOOKS_DIR / filename
    rel_url = f"/api/wardrobe/uploads/looks/{filename}"

    if target_path.exists():
        return rel_url

    # Canvas dimensions
    width, height = 900, 1100
    canvas = Image.new("RGB", (width, height), (252, 250, 246))
    draw = ImageDraw.Draw(canvas)

    font_title = _get_font(26, bold=True)
    font_subtitle = _get_font(14, bold=False)
    font_badge = _get_font(11, bold=True)
    font_item_name = _get_font(13, bold=True)
    font_item_sub = _get_font(11, bold=False)
    font_footer = _get_font(11, bold=False)

    # 1. Outer Border & Header Banner
    draw.rectangle([(20, 20), (width - 20, height - 20)], outline=(225, 220, 210), width=1)
    draw.rectangle([(24, 24), (width - 24, 130)], fill=(247, 244, 238))
    draw.line([(24, 130), (width - 24, 130)], fill=(225, 220, 210), width=1)

    # Brand Title
    draw.text((45, 38), "FASHION VISTA  •  AI STYLIST COMPOSITION", fill=(120, 115, 105), font=font_badge)
    draw.text((45, 58), outfit_name, fill=(25, 25, 25), font=font_title)
    draw.text((45, 96), f"Calibrated for {occasion}  •  {style} Aesthetic  •  {season} Conditioning", fill=(95, 90, 80), font=font_subtitle)

    # Compatibility Badge (Right Header)
    score_text = f"{score}% MATCH"
    draw.rounded_rectangle([(width - 170, 50), (width - 45, 95)], radius=8, fill=(25, 25, 25))
    draw.text((width - 158, 63), score_text, fill=(255, 255, 255), font=_get_font(15, bold=True))

    # 2. Quadrants for 4 Items
    # 2 rows x 2 columns
    positions = [
        (45, 155),                # Top-Left: Top
        (width // 2 + 10, 155),    # Top-Right: Bottom
        (45, 555),                # Bottom-Left: Footwear
        (width // 2 + 10, 555)     # Bottom-Right: Layer / Accessory
    ]

    card_w = width // 2 - 55
    card_h = 370

    for idx, pos in enumerate(positions):
        if idx < len(items):
            item = items[idx]
        else:
            item = {
                "name": "Coordinated Accessory",
                "slot": "Accent",
                "colour": "Neutral",
                "image": None,
                "owned": True
            }

        x, y = pos
        # Card Background
        draw.rounded_rectangle([(x, y), (x + card_w, y + card_h)], radius=12, fill=(255, 255, 255), outline=(230, 226, 218), width=1)

        # Slot Label
        slot_label = f"0{idx + 1} / {item.get('slot', 'PIECE').upper()}"
        draw.text((x + 16, y + 14), slot_label, fill=(150, 140, 130), font=font_badge)

        # Status Tag
        is_owned = item.get("owned", True)
        status_text = "IN WARDROBE" if is_owned else "SHOP ADDITION"
        status_bg = (236, 253, 243) if is_owned else (254, 243, 199)
        status_fg = (22, 101, 52) if is_owned else (146, 64, 14)
        draw.rounded_rectangle([(x + card_w - 110, y + 12), (x + card_w - 14, y + 30)], radius=4, fill=status_bg)
        draw.text((x + card_w - 104, y + 15), status_text, fill=status_fg, font=_get_font(9, bold=True))

        # Thumbnail Image
        thumb = _fetch_thumbnail(item.get("image"), size=(card_w - 32, 240))
        canvas.paste(thumb, (x + 16, y + 38))

        # Item Details below thumbnail
        iname = item.get("name", "Fashion Piece")
        if len(iname) > 34:
            iname = iname[:32] + "..."
        draw.text((x + 16, y + 292), iname, fill=(25, 25, 25), font=font_item_name)

        icolour = item.get("colour", "Neutral").capitalize()
        iart = item.get("article_type", item.get("slot", "")).capitalize()
        desc = f"{icolour}  •  {iart}"
        draw.text((x + 16, y + 314), desc, fill=(120, 115, 105), font=font_item_sub)

        # Tiny color swatch
        col_rgb = COLOR_HEX_MAP.get(icolour.lower(), (180, 180, 180))
        draw.ellipse([(x + 16, y + 338), (x + 30, y + 352)], fill=col_rgb, outline=(200, 200, 200), width=1)
        draw.text((x + 38, y + 339), f"{icolour} tone", fill=(130, 125, 115), font=_get_font(10))

    # 3. Footer Area: Palette Swatches & Protocol Text
    footer_y = height - 120
    draw.line([(24, footer_y), (width - 24, footer_y)], fill=(225, 220, 210), width=1)

    draw.text((45, footer_y + 15), "HARMONIZED COLOR PALETTE", fill=(140, 135, 125), font=font_badge)

    # Draw color swatches row
    swatch_x = 45
    for item in items[:4]:
        cname = item.get("colour", "").lower()
        c_rgb = COLOR_HEX_MAP.get(cname, (160, 160, 160))
        draw.rounded_rectangle([(swatch_x, footer_y + 35), (swatch_x + 65, footer_y + 60)], radius=6, fill=c_rgb, outline=(210, 205, 195), width=1)
        # text color depending on darkness
        fg = (255, 255, 255) if cname in ("black", "navy", "brown", "maroon", "charcoal", "green", "blue") else (30, 30, 30)
        draw.text((swatch_x + 8, footer_y + 42), cname.capitalize()[:7], fill=fg, font=_get_font(10, bold=True))
        swatch_x += 75

    # Legal / Signature
    sig_text = "FASHION VISTA  |  SLOT-COMPLETE PERSONALIZED AI OUTFIT PROTOCOL"
    draw.text((width - 480, footer_y + 44), sig_text, fill=(140, 135, 125), font=font_footer)

    try:
        canvas.save(str(target_path), "JPEG", quality=90)
        return rel_url
    except Exception as e:
        print(f"Error saving outfit canvas: {e}")
        return None

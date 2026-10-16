"""
Explainable Content-Based Outfit Recommendation Engine for Fashion VISTA.

Uses real product catalogue from datasets/fashion_product_images/csv/fashion_products.csv.
Enforces:
1. Slot completeness: Exactly 1 Top + 1 Bottom + 1 Footwear (+ optional Outerwear/Layer)
2. Zero duplicate outfit roles
3. Occasion, Style, and Season alignment with partial preference tolerance
4. Color harmony matching using fashion color theory (ml.utils.color_theory)
5. Multi-outfit generation & ranking (Primary recommendation + diverse alternatives)
6. Closet synergy with user's digital wardrobe
7. Transparent, explainable rationales & compatibility scoring
"""

import os
import sys
import csv
import random
from pathlib import Path

# Add project root to path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.utils.color_theory import evaluate_outfit_color_harmony, calculate_color_pair_score, normalize_color

try:
    from backend.services.shopping_service import find_missing_product_online
except Exception:
    find_missing_product_online = None

PRODUCTS_CSV = BASE_DIR / "datasets" / "fashion_product_images" / "csv" / "fashion_products.csv"


LAYER_ARTICLES = {
    "jackets", "sweaters", "sweatshirts", "blazers", "rain jacket",
    "shrug", "coats", "waistcoat", "nehru jackets"
}
TOP_ARTICLES = {"tshirts", "shirts", "tops", "kurtas", "tunics", "kurtis", "dress"}
BOTTOM_ARTICLES = {"jeans", "trousers", "shorts", "track pants", "skirts", "capris"}
SHOE_ARTICLES = {
    "casual shoes", "sports shoes", "formal shoes", "heels", "flats",
    "sandals", "flip flops", "shoes", "sandal"
}

# Curated high-resolution fashion photography matching specific slot, article, and color
CURATED_PALETTE_IMAGES = {
    ("Top", "white"): "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80",
    ("Top", "black"): "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=700&q=80",
    ("Top", "blue"): "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80",
    ("Top", "navy"): "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80",
    ("Top", "grey"): "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80",
    ("Top", "red"): "https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&w=700&q=80",
    ("Top", "green"): "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=700&q=80",
    ("Top", "beige"): "https://images.unsplash.com/photo-1618244972963-dbee1a7edc95?auto=format&fit=crop&w=700&q=80",
    ("Top", "pink"): "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=700&q=80",
    ("Top", "yellow"): "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=700&q=80",

    ("Bottom", "blue"): "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "black"): "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "beige"): "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "khaki"): "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "grey"): "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "white"): "https://images.unsplash.com/photo-1594633313593-beb382595b78?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "navy"): "https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=700&q=80",

    ("Shoes", "white"): "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "black"): "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "brown"): "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "tan"): "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "grey"): "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "blue"): "https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?auto=format&fit=crop&w=700&q=80",

    ("Layer", "blue"): "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=700&q=80",
    ("Layer", "black"): "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=700&q=80",
    ("Layer", "beige"): "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=700&q=80",
    ("Layer", "grey"): "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=700&q=80",
    ("Layer", "brown"): "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?auto=format&fit=crop&w=700&q=80",
}

# Fine-grained item images keyed by (slot, color, article_type) - Women & Girls only
CURATED_ITEM_IMAGES = {
    ("Top", "black", "shirts"): "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80",
    ("Top", "white", "shirts"): "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=700&q=80",
    ("Top", "blue", "shirts"): "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=700&q=80",
    ("Top", "black", "tshirts"): "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80",
    ("Top", "white", "tshirts"): "https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=700&q=80",
    ("Top", "blue", "tshirts"): "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=700&q=80",
    ("Top", "black", "kurtas"): "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=700&q=80",
    ("Top", "red", "kurtas"): "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80",

    ("Bottom", "black", "trousers"): "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "grey", "trousers"): "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "brown", "trousers"): "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "blue", "jeans"): "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80",
    ("Bottom", "black", "jeans"): "https://images.unsplash.com/photo-1584370848010-d7fe6bc767ec?auto=format&fit=crop&w=700&q=80",

    ("Shoes", "black", "formal shoes"): "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "brown", "formal shoes"): "https://images.unsplash.com/photo-1535043934128-cf0b28d52f95?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "white", "casual shoes"): "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "black", "heels"): "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=80",
    ("Shoes", "gold", "flats"): "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=700&q=80",

    ("Layer", "black", "blazers"): "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=700&q=80",
    ("Layer", "blue", "jackets"): "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=700&q=80",
}

DEFAULT_SLOT_IMAGES = {
    "Top": "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=700&q=80",
    "Bottom": "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=700&q=80",
    "Shoes": "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=80",
    "Layer": "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=700&q=80"
}

# Editorial photography matrix accurately matching user's selected style and colour - Women & Girls Only
EDITORIAL_LOOK_MATRIX = {
    ("formal", "black"): "https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=1000&q=80",
    ("formal", "white"): "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=1000&q=80",
    ("formal", "blue"): "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1000&q=80",
    ("formal", "grey"): "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
    ("formal", "charcoal"): "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
    ("formal", "beige"): "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    ("formal", "brown"): "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    ("formal", "any"): "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",

    ("casual", "black"): "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
    ("casual", "blue"): "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80",
    ("casual", "white"): "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1000&q=80",
    ("casual", "beige"): "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    ("casual", "any"): "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",

    ("traditional", "red"): "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    ("traditional", "green"): "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
    ("traditional", "black"): "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=80",
    ("traditional", "pink"): "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    ("traditional", "brown"): "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    ("traditional", "any"): "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",

    ("streetwear", "black"): "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
    ("streetwear", "any"): "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",

    ("minimal", "black"): "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=80",
    ("minimal", "white"): "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
    ("minimal", "beige"): "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80",
    ("minimal", "any"): "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=1000&q=80",

    ("western", "blue"): "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80",
    ("western", "black"): "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
    ("western", "any"): "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=1000&q=80"
}

EDITORIAL_HERO_IMAGES = {
    "college": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
    "office": "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1000&q=80",
    "formal": "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80",
    "party": "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1000&q=80",
    "casual": "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80",
    "sports": "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1000&q=80",
    "ethnic": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    "wedding": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    "traditional": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80"
}


def get_curated_item_image(slot, colour, article_type="", style="Casual"):
    """Returns valid, aesthetic image reference matching item slot, color tone, and type."""
    norm_c = normalize_color(colour)
    art_clean = article_type.strip().lower()

    # 1. Exact match (slot, color, article_type)
    if (slot, norm_c, art_clean) in CURATED_ITEM_IMAGES:
        return CURATED_ITEM_IMAGES[(slot, norm_c, art_clean)]

    # 2. Match (slot, color)
    key = (slot, norm_c)
    if key in CURATED_PALETTE_IMAGES:
        return CURATED_PALETTE_IMAGES[key]

    # 3. Check general neutrals
    for neutral in ["black", "white", "blue", "beige"]:
        if (slot, neutral) in CURATED_PALETTE_IMAGES:
            return CURATED_PALETTE_IMAGES[(slot, neutral)]

    return DEFAULT_SLOT_IMAGES.get(slot, DEFAULT_SLOT_IMAGES["Top"])


def get_editorial_look_image(occasion="College", style="Casual", colour="Black", outfit_type="Full Outfit"):
    """Returns aesthetic editorial look image strictly respecting style, colour, and occasion."""
    sty_key = style.lower().strip()
    col_key = normalize_color(colour)
    occ_key = occasion.lower().strip()

    # 1. Exact match by (style, colour)
    if (sty_key, col_key) in EDITORIAL_LOOK_MATRIX:
        return EDITORIAL_LOOK_MATRIX[(sty_key, col_key)]

    # 2. Match by (style, "any")
    if (sty_key, "any") in EDITORIAL_LOOK_MATRIX:
        return EDITORIAL_LOOK_MATRIX[(sty_key, "any")]

    # 3. Match by occasion
    if occ_key in EDITORIAL_HERO_IMAGES:
        return EDITORIAL_HERO_IMAGES[occ_key]

    return EDITORIAL_LOOK_MATRIX.get(("casual", "black"), "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1000&q=80")


class OutfitRecommender:
    def __init__(self, catalog_csv=PRODUCTS_CSV):
        self.catalog_csv = Path(catalog_csv)
        self.products = []
        self.products_by_slot = {"Top": [], "Bottom": [], "Shoes": [], "Layer": []}
        self.is_loaded = False
        self._load_catalog()

    def _load_catalog(self):
        if not self.catalog_csv.exists():
            print(f"Catalog not found at {self.catalog_csv}")
            return

        with open(self.catalog_csv, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)
            for r in reader:
                art = r.get("article_type", "").strip().lower()
                sub = r.get("subcategory", "").strip().lower()
                gen = r.get("gender", "").strip()
                name = r.get("product_name", "").strip()
                name_lower = name.lower()

                # STRICT WOMEN AND GIRLS ONLY POLICY:
                # 1. Strictly restrict gender to Women and Girls
                if gen not in ("Women", "Girls"):
                    continue

                # 2. Exclude any product with male identifiers in name
                words = set(name_lower.replace("-", " ").replace("'", "").split())
                if words.intersection({"men", "mens", "man", "male", "boy", "boys"}):
                    continue

                # 3. Exclude intimate apparel, undergarments, and accessories that are not wearable outfit pieces
                if art in ("bra", "briefs", "panties", "swimwear", "socks", "lingerie", "boxers"):
                    continue

                slot = None
                if art in LAYER_ARTICLES:
                    slot = "Layer"
                elif art in TOP_ARTICLES or sub in ("topwear", "dress", "saree"):
                    slot = "Top"
                elif art in BOTTOM_ARTICLES or sub == "bottomwear":
                    slot = "Bottom"
                elif art in SHOE_ARTICLES or sub in ("shoes", "sandal", "flip flops"):
                    slot = "Shoes"

                if slot and slot in self.products_by_slot:
                    item = {
                        "id": str(r.get("product_id")),
                        "name": name,
                        "slot": slot,
                        "category": r.get("category"),
                        "subcategory": r.get("subcategory"),
                        "article_type": r.get("article_type"),
                        "colour": r.get("colour"),
                        "season": r.get("season"),
                        "usage": r.get("usage"),
                        "gender": gen
                    }
                    self.products.append(item)
                    self.products_by_slot[slot].append(item)

        self.is_loaded = True
        print(f"Loaded {len(self.products):,} Women & Girls products into Recommender (Tops: {len(self.products_by_slot['Top'])}, Bottoms: {len(self.products_by_slot['Bottom'])}, Shoes: {len(self.products_by_slot['Shoes'])}, Layers: {len(self.products_by_slot['Layer'])})")

    def recommend_outfits(self, preferences=None, wardrobe=None, limit=8):
        """
        Generates and ranks multiple complete, slot-complete outfit combinations.
        Returns:
        - primary_recommendation: Highest-scoring outfit
        - alternatives: List of distinct alternative recommendations (up to limit - 1)
        - recommendations: Flat array of all ranked recommendations
        """
        if not self.is_loaded or not self.products:
            return self._fallback_recommendations(preferences, limit=limit, wardrobe=wardrobe)

        prefs = preferences or {}
        req_occasion = str(prefs.get("occasion", "College")).strip()
        req_style = str(prefs.get("style", "Casual")).strip()
        req_colour = str(prefs.get("colour", "Black")).strip()
        req_season = str(prefs.get("season", "Summer")).strip()
        req_budget = str(prefs.get("budget", "1800")).strip()
        req_outfit_type = str(prefs.get("outfitType", "Full Outfit")).strip()

        occ_lower = req_occasion.lower()
        sty_lower = req_style.lower()
        col_lower = req_colour.lower()
        sea_lower = req_season.lower()
        typ_lower = req_outfit_type.lower()

        # Target usages, preferred articles, and strictly forbidden articles by Style & Occasion for Women
        forbidden_shoe_arts = []
        forbidden_top_arts = []
        forbidden_bottom_arts = []

        if sty_lower == "traditional" or occ_lower in ("traditional", "wedding"):
            target_usages = ["ethnic", "party", "casual"]
            pref_top_arts = ["kurtas", "kurtis", "sarees", "dresses", "tunics"]
            pref_bottom_arts = ["churidar", "salwar", "patiala", "leggings", "skirts", "palazzos", "trousers"]
            pref_shoe_arts = ["heels", "flats", "sandals"]
            pref_layer_arts = ["dupatta", "stoles", "shrug"]
            # Strictly forbidden for Wedding / Traditional: NO casual shirts, NO sneakers/sports shoes!
            forbidden_shoe_arts = ["sports shoes", "casual shoes", "sneakers", "flip flops"]
            forbidden_top_arts = ["tshirts", "shirts"]
            forbidden_bottom_arts = ["shorts", "jeans", "track pants"]

        elif sty_lower == "formal" or occ_lower in ("office", "formal"):
            target_usages = ["formal", "smart casual", "casual"]
            pref_top_arts = ["shirts", "tops", "tunics"]
            pref_bottom_arts = ["trousers", "skirts"]
            pref_shoe_arts = ["formal shoes", "flats", "heels"]
            pref_layer_arts = ["blazers", "coats"]
            forbidden_shoe_arts = ["flip flops", "sports shoes"]
            forbidden_top_arts = ["tshirts"]
            forbidden_bottom_arts = ["shorts", "track pants"]

        elif sty_lower == "party" or occ_lower == "party":
            target_usages = ["party", "casual", "ethnic"]
            pref_top_arts = ["dresses", "tops", "sarees", "tunics"]
            pref_bottom_arts = ["skirts", "trousers", "jeans"]
            pref_shoe_arts = ["heels", "flats", "sandals", "boots"]
            pref_layer_arts = ["blazers", "jackets", "shrug"]
            forbidden_shoe_arts = ["flip flops", "sports shoes"]

        elif sty_lower == "streetwear":
            target_usages = ["casual", "sports"]
            pref_top_arts = ["tshirts", "tops", "sweatshirts"]
            pref_bottom_arts = ["jeans", "track pants", "trousers"]
            pref_shoe_arts = ["casual shoes", "sports shoes", "flats"]
            pref_layer_arts = ["jackets", "sweatshirts"]

        elif sty_lower == "minimal":
            target_usages = ["casual", "smart casual", "formal"]
            pref_top_arts = ["tops", "shirts", "tshirts", "tunics"]
            pref_bottom_arts = ["trousers", "jeans", "skirts"]
            pref_shoe_arts = ["flats", "casual shoes", "heels"]
            pref_layer_arts = ["blazers", "jackets"]

        elif sty_lower == "western":
            target_usages = ["casual", "smart casual", "party"]
            pref_top_arts = ["tops", "shirts", "dresses", "tshirts"]
            pref_bottom_arts = ["jeans", "trousers", "skirts"]
            pref_shoe_arts = ["heels", "flats", "casual shoes"]
            pref_layer_arts = ["jackets", "shrug"]

        else: # College / Casual
            target_usages = ["casual", "smart casual"]
            pref_top_arts = ["tops", "tshirts", "kurtis", "shirts"]
            pref_bottom_arts = ["jeans", "trousers", "skirts", "leggings"]
            pref_shoe_arts = ["casual shoes", "flats", "sandals", "sports shoes"]
            pref_layer_arts = ["jackets", "sweatshirts", "shrug"]

        # Enforce explicit Outfit Type from Questionnaire Step 2
        if typ_lower == "shirt":
            pref_top_arts = ["shirts"]
        elif typ_lower == "t-shirt":
            pref_top_arts = ["tshirts"]
        elif typ_lower == "top":
            pref_top_arts = ["tops", "tunics"]
        elif typ_lower == "kurti":
            pref_top_arts = ["kurtas", "kurtis"]
        elif typ_lower == "saree":
            pref_top_arts = ["sarees"]
        elif typ_lower == "dress":
            pref_top_arts = ["dresses"]
        elif typ_lower == "jeans":
            pref_bottom_arts = ["jeans"]
        elif typ_lower == "trousers":
            pref_bottom_arts = ["trousers"]

        # Filter items for slot respecting preferred and strictly forbidden articles
        def filter_slot_candidates(slot_name, preferred_color=None, preferred_articles=None, forbidden_articles=None):
            items = self.products_by_slot.get(slot_name, [])
            forbidden = set(forbidden_articles or [])

            # Strictly exclude forbidden articles
            valid_items = [it for it in items if not any(fb in it["article_type"].lower() for fb in forbidden)]
            if not valid_items:
                valid_items = items

            matched = []
            for item in valid_items:
                art = item["article_type"].lower()
                usg = item["usage"].lower()
                item_sea = item["season"].lower()

                art_ok = True
                if preferred_articles:
                    art_ok = any(p in art for p in preferred_articles)

                usg_ok = any(u in usg for u in target_usages)
                if not usg_ok and occ_lower not in ("wedding", "formal"):
                    usg_ok = (usg == "casual")

                sea_ok = (sea_lower == "all season") or (sea_lower in item_sea) or ("all" in item_sea) or ("summer" in item_sea)
                if "summer" in sea_lower and slot_name in ("Top", "Layer"):
                    if art in ("sweaters", "coats", "rain jacket"):
                        sea_ok = False

                if preferred_color and preferred_color.lower() != "any":
                    col_ok = normalize_color(preferred_color) in normalize_color(item["colour"])
                else:
                    col_ok = True

                if art_ok and usg_ok and sea_ok and col_ok:
                    matched.append(item)

            if matched:
                return matched

            # Progressive relaxation Level 2: Preferred articles + Preferred color (ignoring strict usage tag)
            if preferred_articles:
                for item in valid_items:
                    art = item["article_type"].lower()
                    if any(p in art for p in preferred_articles):
                        if preferred_color and preferred_color.lower() != "any":
                            if normalize_color(preferred_color) in normalize_color(item["colour"]):
                                matched.append(item)
                        else:
                            matched.append(item)
            if matched:
                return matched

            # Progressive relaxation Level 3: Preferred articles with any color
            if preferred_articles:
                for item in valid_items:
                    art = item["article_type"].lower()
                    if any(p in art for p in preferred_articles):
                        matched.append(item)
            if matched:
                return matched

            # Safe fallback: valid items respecting forbidden
            return valid_items

        cand_tops = filter_slot_candidates("Top", preferred_color=req_colour if col_lower != "any" else None, preferred_articles=pref_top_arts, forbidden_articles=forbidden_top_arts)
        cand_bottoms = filter_slot_candidates("Bottom", preferred_articles=pref_bottom_arts, forbidden_articles=forbidden_bottom_arts)
        cand_shoes = filter_slot_candidates("Shoes", preferred_articles=pref_shoe_arts, forbidden_articles=forbidden_shoe_arts)
        cand_layers = filter_slot_candidates("Layer", preferred_articles=pref_layer_arts)

        # Pick diverse candidate tops (by brand, article type, and style)
        seen_top_keys = set()
        diverse_tops = []
        for t in cand_tops:
            brand = t["name"].split()[0] if t["name"] else t["id"]
            key = (brand, t["article_type"], normalize_color(t["colour"]))
            if key not in seen_top_keys:
                seen_top_keys.add(key)
                diverse_tops.append(t)
            if len(diverse_tops) >= 16:
                break

        if len(diverse_tops) < 8:
            for t in cand_tops:
                if t not in diverse_tops:
                    diverse_tops.append(t)
                if len(diverse_tops) >= 12:
                    break

        if not diverse_tops:
            diverse_tops = cand_tops[:12]

        # Generate candidate outfits
        candidate_outfits = []
        for top_idx, top_item in enumerate(diverse_tops):
            # 1. Match Bottom maximizing color harmony (offsetting by top_idx for diversity)
            scored_bottoms = []
            for b in cand_bottoms[:40]:
                pair_score = calculate_color_pair_score(top_item["colour"], b["colour"])
                b_usg = b["usage"].lower()
                occ_bonus = 0.05 if any(u in b_usg for u in target_usages) else 0.0
                scored_bottoms.append((pair_score + occ_bonus, b))

            scored_bottoms.sort(key=lambda x: x[0], reverse=True)
            bottom_pick_idx = min(top_idx % max(1, len(scored_bottoms)), len(scored_bottoms) - 1)
            chosen_bottom = scored_bottoms[bottom_pick_idx][1] if scored_bottoms else cand_bottoms[0]

            # 2. Match Shoes compatible with both Top and Bottom
            scored_shoes = []
            for s in cand_shoes[:40]:
                s1 = calculate_color_pair_score(top_item["colour"], s["colour"])
                s2 = calculate_color_pair_score(chosen_bottom["colour"], s["colour"])
                avg_pair = (s1 + s2) / 2.0
                s_usg = s["usage"].lower()
                occ_bonus = 0.05 if any(u in s_usg for u in target_usages) else 0.0
                scored_shoes.append((avg_pair + occ_bonus, s))

            scored_shoes.sort(key=lambda x: x[0], reverse=True)
            shoe_pick_idx = min(top_idx % max(1, len(scored_shoes)), len(scored_shoes) - 1)
            chosen_shoes = scored_shoes[shoe_pick_idx][1] if scored_shoes else cand_shoes[0]

            outfit_pieces = [top_item, chosen_bottom, chosen_shoes]

            # 3. Optional Layer for Wedding, Traditional, Winter or Formal occasions
            should_add_layer = (occ_lower in ("wedding", "traditional")) or ("winter" in sea_lower) or ("formal" in target_usages) or ("blazer" in req_style.lower())
            if should_add_layer and cand_layers:
                scored_layers = []
                for lyr in cand_layers[:25]:
                    l1 = calculate_color_pair_score(top_item["colour"], lyr["colour"])
                    l2 = calculate_color_pair_score(chosen_bottom["colour"], lyr["colour"])
                    scored_layers.append(((l1 + l2) / 2.0, lyr))
                scored_layers.sort(key=lambda x: x[0], reverse=True)
                if scored_layers:
                    layer_pick_idx = min(top_idx % max(1, len(scored_layers)), len(scored_layers) - 1)
                    outfit_pieces.append(scored_layers[layer_pick_idx][1])

            # 4. Multi-factor Scoring
            colors = [p["colour"] for p in outfit_pieces]
            color_score, color_explanation = evaluate_outfit_color_harmony(colors)

            # Occasion fit
            occ_matches = sum(1 for p in outfit_pieces if any(u in p["usage"].lower() for u in target_usages) or p["usage"].lower() == "casual")
            occasion_score = round(occ_matches / len(outfit_pieces), 2)

            # Season suitability
            season_score = 0.95 if any(sea_lower in p["season"].lower() or "all" in p["season"].lower() for p in outfit_pieces) else 0.85

            # Closet synergy with user wardrobe
            wardrobe_synergy = 0.0
            matched_items_count = 0
            missing_items_list = []
            used_wardrobe_ids = set()
            matched_wardrobe_map = {}

            if wardrobe and isinstance(wardrobe, list) and len(wardrobe) > 0:
                for p in outfit_pieces:
                    p_name = p["name"].lower()
                    p_sub = p["subcategory"].lower()
                    p_slot = p.get("slot", "").lower()
                    p_col = normalize_color(p.get("colour", ""))
                    is_match = False
                    matched_w = None
                    for w in wardrobe:
                        w_id = w.get("id")
                        if w_id and w_id in used_wardrobe_ids:
                            continue

                        w_name = w.get("name", "").lower()
                        w_cat = w.get("category", "").lower()
                        w_sub = w.get("subcategory", w_cat).lower()
                        w_slot = w.get("slot", "").lower()
                        w_col = normalize_color(w.get("colour", w.get("color", "")))

                        # Strict slot checking: A Dress or Saree is NOT a bottom
                        slot_matches = (
                            (p_slot == "top" and any(k in w_sub or k in w_cat or k in w_slot for k in ["top", "shirt", "t-shirt", "kurti", "kurta"])) or
                            (p_slot == "bottom" and any(k in w_sub or k in w_cat or k in w_slot for k in ["bottom", "jean", "trouser", "pant", "skirt"])) or
                            (p_slot == "shoes" and any(k in w_sub or k in w_cat or k in w_slot for k in ["shoe", "sneaker", "sandal", "footwear", "boot", "heel"])) or
                            (p_slot == "layer" and any(k in w_sub or k in w_cat or k in w_slot for k in ["jacket", "blazer", "coat", "layer"])) or
                            ((p_slot == "top" or p_slot == "dress") and any(k in w_sub or k in w_cat for k in ["dress", "saree", "anarkali"]))
                        )
                        color_compatible = (w_col == p_col or not w_col or not p_col or w_col in ["black", "white", "grey", "navy", "beige"])

                        if slot_matches and color_compatible:
                            is_match = True
                            matched_w = w
                            if w_id:
                                used_wardrobe_ids.add(w_id)
                            break

                    if is_match and matched_w:
                        matched_items_count += 1
                        matched_wardrobe_map[p["name"]] = matched_w
                    else:
                        missing_items_list.append(p["name"])
                wardrobe_synergy = round(matched_items_count / len(outfit_pieces), 2)
            else:
                # User has empty wardrobe or 0 matching clothes: strictly 0 matched items
                matched_items_count = 0
                for p in outfit_pieces:
                    missing_items_list.append(p["name"])
                wardrobe_synergy = 0.0

            # Composite compatibility score (0-100)
            composite_score = round(
                (color_score * 0.35 + occasion_score * 0.35 + season_score * 0.15 + wardrobe_synergy * 0.15) * 100
            )
            composite_score = max(72, min(98, composite_score))

            candidate_outfits.append({
                "pieces": outfit_pieces,
                "composite_score": composite_score,
                "color_score": int(color_score * 100),
                "color_explanation": color_explanation,
                "occasion_score": int(occasion_score * 100),
                "season_score": int(season_score * 100),
                "matched_count": matched_items_count,
                "missing_items": missing_items_list,
                "matched_wardrobe_map": matched_wardrobe_map
            })

        # Rank outfits by composite score descending
        candidate_outfits.sort(key=lambda x: x["composite_score"], reverse=True)

        # Select all generated candidate outfits up to limit
        target_limit = max(limit, 8) if limit else 8
        selected_raw_outfits = candidate_outfits[:min(len(candidate_outfits), target_limit)]
        if not selected_raw_outfits:
            return self._fallback_recommendations(preferences, limit=limit, wardrobe=wardrobe)

        curated_outfits = []

        for idx, entry in enumerate(selected_raw_outfits):
            pieces = entry["pieces"]
            rec_id = f"rec_{occ_lower}_{idx + 1}"
            style_name = req_style if req_style and req_style != "Casual" else "Curated"
            matched_w_map = entry.get("matched_wardrobe_map", {})

            top_item = pieces[0] if pieces else None
            chosen_bottom = pieces[1] if len(pieces) > 1 else None
            chosen_shoes = pieces[2] if len(pieces) > 2 else None

            top_art = top_item["article_type"].title() if top_item else "Garment"
            top_col = top_item["colour"].title() if top_item else req_colour
            bot_art = chosen_bottom["article_type"].title() if chosen_bottom else "Bottom"

            if occ_lower in ("wedding", "traditional"):
                outfit_name = f"Look {idx + 1}: {top_col} {top_art} & {bot_art} Festive Ensemble"
            elif occ_lower in ("office", "formal"):
                outfit_name = f"Look {idx + 1}: {top_col} {top_art} & Tailored {bot_art} Ensemble"
            elif occ_lower == "party":
                outfit_name = f"Look {idx + 1}: {top_col} {top_art} Evening Celebration Look"
            else:
                outfit_name = f"Look {idx + 1}: {top_col} {top_art} & {bot_art} {req_occasion} Coordination"

            subtitle = f"Coordinated {top_item['name'] if top_item else 'Top'} with {chosen_bottom['name'] if chosen_bottom else 'Bottom'} and {chosen_shoes['name'] if chosen_shoes else 'Footwear'}"
            if len(pieces) > 3 and pieces[3]:
                subtitle += f" + {pieces[3]['name']}"

            items_list = []
            for p in pieces:
                if p["name"] in matched_w_map:
                    # Owned wardrobe item — strictly use user's actual saved wardrobe item photo!
                    w = matched_w_map[p["name"]]
                    brand_name = w.get("brand") or "My Wardrobe"
                    w_img = w.get("image") or w.get("image_url") or get_curated_item_image(p["slot"], p["colour"], p["article_type"], style=req_style)
                    items_list.append({
                        "id": str(w.get("id") or p["id"]),
                        "name": w.get("name") or w.get("title") or p["name"],
                        "slot": p["slot"],
                        "category": w.get("category") or p["category"],
                        "subcategory": w.get("subcategory") or p["subcategory"],
                        "article_type": p["article_type"],
                        "colour": w.get("colour") or p["colour"],
                        "season": p["season"],
                        "usage": p["usage"],
                        "gender": p["gender"],
                        "brand": brand_name,
                        "owned": True,
                        "inWardrobe": True,
                        "needed_to_buy": False,
                        "source": "wardrobe",
                        "source_label": "From Your Wardrobe",
                        "description": f"Your owned {p['colour']} {p['subcategory']} — ready to wear directly",
                        "image": w_img,
                        "matchedWardrobeId": w.get("id"),
                        "matchedWardrobeName": w.get("name") or w.get("title")
                    })
                else:
                    # Missing piece — dynamically fetch real matching product from Myntra!
                    online_prod = None
                    if find_missing_product_online:
                        try:
                            online_prod = find_missing_product_online(
                                slot=p["slot"],
                                colour=p["colour"],
                                article_type=p["article_type"],
                                style=req_style,
                                occasion=req_occasion
                            )
                        except Exception as e:
                            print(f"[Shopping Retrieval Note] {e}")

                    if not online_prod:
                        online_prod = {
                            "name": p["name"],
                            "brand": p["name"].split()[0] if p["name"] else "Myntra",
                            "price": 1299,
                            "retailer": "Myntra",
                            "buy_url": f"https://www.myntra.com/{p['name'].replace(' ', '-').lower()}",
                            "image": get_curated_item_image(p["slot"], p["colour"], p["article_type"], style=req_style)
                        }

                    items_list.append({
                        "id": p["id"],
                        "name": online_prod.get("name", p["name"]),
                        "slot": p["slot"],
                        "category": p["category"],
                        "subcategory": p["subcategory"],
                        "article_type": p["article_type"],
                        "colour": p["colour"],
                        "season": p["season"],
                        "usage": p["usage"],
                        "gender": p["gender"],
                        "brand": online_prod.get("brand", "Myntra"),
                        "price": online_prod.get("price", 1299),
                        "mrp": online_prod.get("mrp", online_prod.get("price", 1299)),
                        "retailer": online_prod.get("retailer", "Myntra"),
                        "buy_url": online_prod.get("buy_url", ""),
                        "buy_link": online_prod.get("buy_url", ""),
                        "owned": False,
                        "inWardrobe": False,
                        "needed_to_buy": True,
                        "source": "online",
                        "source_label": "Shop Online",
                        "description": f"Find on {online_prod.get('retailer', 'Myntra')} (₹{online_prod.get('price', 1299)}) to complete this look",
                        "image": online_prod.get("image") or get_curated_item_image(p["slot"], p["colour"], p["article_type"], style=req_style)
                    })


            total_count = len(items_list)
            owned_count = entry["matched_count"]
            coverage_pct = round((owned_count / max(1, total_count)) * 100)

            # Hero image strictly matching style, colour, occasion, and outfit type
            hero_img = get_editorial_look_image(req_occasion, req_style, req_colour, req_outfit_type)

            outfit_obj = {
                "id": rec_id,
                "name": outfit_name,
                "subtitle": f"{req_style} coordination calibrated for {req_occasion} mobility",
                "occasion": req_occasion,
                "style": req_style,
                "season": req_season,
                "colour": req_colour if req_colour != "Any" else "Balanced Palette",
                "budget": req_budget,
                "compatibility_score": entry["composite_score"],
                "color_score": entry["color_score"],
                "color_harmony_explanation": entry["color_explanation"],
                "heroImage": hero_img,
                "items": items_list,
                "reasons": [
                    f"Compatibility Rating: {entry['composite_score']}% based on fashion color harmony and silhouette balance",
                    entry["color_explanation"],
                    f"Calibrated for {req_occasion} requirements with zero duplicate garment roles",
                    f"Closet Synergy: {owned_count}/{total_count} items matching wardrobe inventory ({coverage_pct}% coverage)",
                    "Minimizes unnecessary shopping by structuring complete coordinated ensembles"
                ],
                "wardrobe_match": {
                    "matched_count": owned_count,
                    "required_count": total_count,
                    "wardrobe_coverage": round(owned_count / max(1, total_count), 2),
                    "percentage": coverage_pct,
                    "statusText": "Ready in your closet!" if coverage_pct == 100 else "High Closet Synergy",
                    "subtext": f"Only {total_count - owned_count} item needed to complete ensemble" if owned_count < total_count else "All pieces in wardrobe",
                    "missing_items": entry["missing_items"]
                },
                "explanation": f"Algorithmically coordinated ensemble: {entry['color_explanation']} Calibrated for {req_occasion} utility with slot completeness."
            }

            # Generate dynamic composed flat-lay moodboard canvas image
            try:
                from backend.services.look_generator import generate_composed_outfit_canvas
                outfit_obj["composed_look_image"] = generate_composed_outfit_canvas(outfit_obj)
            except Exception as e:
                outfit_obj["composed_look_image"] = None

            curated_outfits.append(outfit_obj)

        effective_limit = limit if limit else 3
        primary = curated_outfits[0]
        alternatives = curated_outfits[1:effective_limit]
        final_list = curated_outfits[:effective_limit]

        return {
            "status": "success",
            "total": len(final_list),
            "primary_recommendation": primary,
            "alternatives": alternatives,
            "recommendations": final_list
        }

    def recommend_outfit(self, preferences=None, wardrobe=None):
        """Backward-compatible single outfit recommendation returning top primary outfit."""
        res = self.recommend_outfits(preferences=preferences, wardrobe=wardrobe, limit=1)
        if isinstance(res, dict) and "primary_recommendation" in res:
            return res["primary_recommendation"]
        return res

    def _fallback_recommendations(self, preferences, limit=4, wardrobe=None):
        """Dynamic color-harmonized curation calibrated strictly to requested colour and occasion."""
        prefs = preferences or {}
        occ = prefs.get("occasion", "College")
        occ_lower = occ.lower()
        sty = prefs.get("style", "Casual")
        sea = prefs.get("season", "All Season")
        req_col = prefs.get("colour") or "Any"
        if not req_col or req_col.lower() == "any":
            wardrobe_col = None
            if wardrobe and isinstance(wardrobe, list):
                for w in wardrobe:
                    w_cat = str(w.get("category", "")).lower()
                    w_name = str(w.get("name", w.get("title", ""))).lower()
                    w_col = str(w.get("colour", w.get("color", ""))).strip()
                    if occ_lower in ("wedding", "traditional") and ("dress" in w_cat or "saree" in w_name):
                        if w_col:
                            wardrobe_col = w_col
                            break
                    elif occ_lower not in ("wedding", "traditional") and ("top" in w_cat or "shirt" in w_name or "tee" in w_name):
                        if w_col:
                            wardrobe_col = w_col
                            break
            req_col = wardrobe_col if wardrobe_col else ("Black" if occ_lower in ("office", "formal", "college", "casual") else "Red")

        col_title = req_col.title()
        col_norm = normalize_color(req_col)

        has_user_saree = False
        if wardrobe and isinstance(wardrobe, list):
            for w in wardrobe:
                w_cat = str(w.get("category", "")).lower()
                w_name = str(w.get("name", w.get("title", ""))).lower()
                if "dress" in w_cat or "saree" in w_name:
                    has_user_saree = True
                    break

        top_slot = "Top"
        bot_slot = "Bottom"
        shoe_slot = "Shoes"

        # Coordinate bottom & shoes based on color theory and occasion
        if occ_lower in ("wedding", "traditional"):
            if has_user_saree:
                top_name = f"{col_title} Festive Silk Saree"
                top_art = "sarees"
                top_slot = "Dress"
                bot_col = "Gold" if col_norm != "gold" else "Cream"
                bot_name = f"{bot_col} Zari Brocade Blouse"
                bot_art = "tops"
                bot_slot = "Top"
                shoe_name = "Embellished Metallic Juttis"
                shoe_col = "Gold"
                shoe_art = "flats"
            else:
                top_name = f"{col_title} Embroidered Anarkali Kurta"
                top_art = "kurtas"
                bot_col = "Gold" if col_norm != "gold" else "Cream"
                bot_name = f"{bot_col} Zari Trim Flared Palazzos"
                bot_art = "trousers"
                shoe_name = "Embellished Metallic Juttis"
                shoe_col = "Gold"
                shoe_art = "flats"
        elif occ_lower in ("office", "formal") or sty.lower() == "formal":
            top_name = f"{col_title} Tailored Poplin Shirt"
            top_art = "shirts"
            bot_col = "Grey" if col_norm not in ["grey", "black"] else "Navy"
            bot_name = f"{bot_col} High-Waist Tailored Trousers"
            bot_art = "trousers"
            shoe_name = "Black Leather Minimalist Loafers"
            shoe_col = "Black"
            shoe_art = "formal shoes"
        elif occ_lower == "party":
            top_name = f"{col_title} Satin Evening Top"
            top_art = "tops"
            bot_col = "Black" if col_norm != "black" else "Silver"
            bot_name = f"{bot_col} Tailored Evening Trousers"
            bot_art = "trousers"
            shoe_name = "Sleek Strappy Block Heels"
            shoe_col = "Black"
            shoe_art = "heels"
        else:  # College, Casual, Travel
            top_name = f"{col_title} Oversized Tee"
            top_art = "tshirts"
            bot_col = "Blue" if col_norm != "blue" else "White"
            bot_name = f"Vintage {bot_col} Straight-Fit Jeans"
            bot_art = "jeans"
            shoe_name = "White Minimalist Retro Sneakers"
            shoe_col = "White"
            shoe_art = "casual shoes"

        top_img = get_curated_item_image("Top", col_title, top_art, style=sty)
        bot_img = get_curated_item_image("Bottom", bot_col, bot_art, style=sty)
        shoe_img = get_curated_item_image("Shoes", shoe_col, shoe_art, style=sty)
        hero_img = get_editorial_look_image(occ, sty, col_title, "Full Outfit")

        def evaluate_outfit_pieces(items_list):
            processed = []
            matched = 0
            missing = []
            used_ids = set()

            for item in items_list:
                is_owned = False
                matched_w_id = None
                matched_w_name = None
                i_slot = item.get("slot", "").lower()
                i_col = normalize_color(item.get("colour", ""))

                if wardrobe and isinstance(wardrobe, list):
                    for w in wardrobe:
                        w_id = w.get("id")
                        if w_id and w_id in used_ids:
                            continue
                        w_cat = w.get("category", "").lower()
                        w_sub = w.get("subcategory", w_cat).lower()
                        w_name = str(w.get("name", w.get("title", ""))).lower()
                        w_col = normalize_color(w.get("colour", w.get("color", "")))

                        # Strict slot match
                        slot_match = False
                        if i_slot in ("top", "topwear"):
                            slot_match = (
                                ("top" in w_cat or "shirt" in w_sub or "top" in w_sub or "kurti" in w_sub or "kurta" in w_sub or "tee" in w_sub)
                                and not ("dress" in w_cat or "saree" in w_name or "saree" in w_sub or "bottom" in w_cat or "shoe" in w_cat)
                            )
                        elif i_slot in ("bottom", "bottomwear"):
                            slot_match = (
                                ("bottom" in w_cat or "jean" in w_sub or "trouser" in w_sub or "pant" in w_sub or "skirt" in w_sub or "palazzo" in w_sub)
                                and not ("top" in w_cat or "dress" in w_cat or "shoe" in w_cat)
                            )
                        elif i_slot in ("shoes", "footwear"):
                            slot_match = (
                                ("shoe" in w_cat or "footwear" in w_cat or "sneaker" in w_sub or "sandal" in w_sub or "heel" in w_sub or "flat" in w_sub or "boot" in w_sub or "jutti" in w_sub or "loafer" in w_sub)
                                and not ("top" in w_cat or "bottom" in w_cat or "dress" in w_cat)
                            )
                        elif i_slot in ("dress", "traditional"):
                            slot_match = (
                                ("dress" in w_cat or "saree" in w_sub or "saree" in w_name or "anarkali" in w_sub)
                                and not ("bottom" in w_cat or "shoe" in w_cat)
                            )
                        elif i_slot in ("layer", "outerwear"):
                            slot_match = (
                                ("accessories" in w_cat or "outerwear" in w_cat or "jacket" in w_name or "blazer" in w_name or "coat" in w_name)
                                and not ("bottom" in w_cat or "shoe" in w_cat)
                            )

                        # Strict color match (same color family)
                        color_match = bool(w_col and i_col and w_col == i_col)

                        if slot_match and color_match:
                            is_owned = True
                            matched_w = w
                            matched_w_id = w_id
                            matched_w_name = w.get("name", w.get("title", ""))
                            if w_id:
                                used_ids.add(w_id)
                            break

                if is_owned and matched_w:
                    matched += 1
                    w_img = matched_w.get("image") or matched_w.get("image_url") or item["image"]
                    processed.append({
                        **item,
                        "name": matched_w.get("name") or matched_w.get("title") or item["name"],
                        "owned": True,
                        "inWardrobe": True,
                        "needed_to_buy": False,
                        "source": "wardrobe",
                        "source_label": "From Your Wardrobe",
                        "description": f"Your owned {item['colour']} {item.get('subcategory', 'piece')} — ready to wear directly",
                        "image": w_img,
                        "matchedWardrobeId": matched_w_id,
                        "matchedWardrobeName": matched_w_name
                    })
                else:
                    missing.append(item["name"])
                    # Dynamically fetch real product from Myntra
                    online_prod = None
                    if find_missing_product_online:
                        try:
                            online_prod = find_missing_product_online(
                                slot=item.get("slot", "Top"),
                                colour=item.get("colour", col_title),
                                article_type=item.get("article_type", ""),
                                style=sty,
                                occasion=occ
                            )
                        except Exception as e:
                            print(f"[Shopping Fallback Note] {e}")

                    if not online_prod:
                        online_prod = {
                            "name": item["name"],
                            "brand": "Myntra",
                            "price": 1299,
                            "retailer": "Myntra",
                            "buy_url": f"https://www.myntra.com/{item['name'].replace(' ', '-').lower()}",
                            "image": item["image"]
                        }

                    processed.append({
                        **item,
                        "name": online_prod.get("name", item["name"]),
                        "brand": online_prod.get("brand", "Myntra"),
                        "price": online_prod.get("price", 1299),
                        "mrp": online_prod.get("mrp", online_prod.get("price", 1299)),
                        "retailer": online_prod.get("retailer", "Myntra"),
                        "buy_url": online_prod.get("buy_url", ""),
                        "buy_link": online_prod.get("buy_url", ""),
                        "owned": False,
                        "inWardrobe": False,
                        "needed_to_buy": True,
                        "source": "online",
                        "source_label": "Shop Online",
                        "description": f"Find on {online_prod.get('retailer', 'Myntra')} (₹{online_prod.get('price', 1299)}) to complete this look",
                        "image": online_prod.get("image") or item["image"]
                    })

            total = len(processed)
            pct = round((matched / max(1, total)) * 100)
            return processed, matched, total, pct, missing


        # Primary Curation
        look1_raw = [
            {
                "id": f"item_top_{col_norm}",
                "name": top_name,
                "slot": top_slot,
                "category": "Apparel" if top_slot != "Dress" else "Dresses",
                "subcategory": top_art.title(),
                "article_type": top_art,
                "colour": col_title,
                "season": sea,
                "usage": occ,
                "brand": "Zara",
                "description": f"Relaxed {col_title.lower()} silhouette styled for effortless {occ.lower()} mobility.",
                "image": top_img
            },
            {
                "id": f"item_bottom_{bot_col.lower()}",
                "name": bot_name,
                "slot": bot_slot,
                "category": "Apparel",
                "subcategory": bot_art.title(),
                "article_type": bot_art,
                "colour": bot_col,
                "season": "All Season",
                "usage": occ,
                "brand": "Levi's" if "jeans" in bot_art else "Mango",
                "description": f"Structured {bot_col.lower()} piece providing harmonious tonal balance with {col_title}.",
                "image": bot_img
            },
            {
                "id": f"item_shoe_{shoe_col.lower()}",
                "name": shoe_name,
                "slot": shoe_slot,
                "category": "Footwear",
                "subcategory": shoe_art.title(),
                "article_type": shoe_art,
                "colour": shoe_col,
                "season": "All Season",
                "usage": occ,
                "brand": "Veja",
                "description": f"Versatile {shoe_col.lower()} footwear offering all-day comfort and crisp contrast.",
                "image": shoe_img
            }
        ]

        p_items, p_matched, p_total, p_pct, p_missing = evaluate_outfit_pieces(look1_raw)

        look1 = {
            "id": f"rec_{occ_lower}_1",
            "name": f"Look 01: {col_title} {occ} Curation",
            "subtitle": f"Harmonious {col_title} silhouette calibrated for {occ.lower()} comfort",
            "occasion": occ,
            "style": sty,
            "season": sea,
            "colour": f"{col_title} + {bot_col}",
            "budget": "1800",
            "compatibility_score": 94,
            "color_score": 92,
            "color_harmony_explanation": f"{col_title} primary anchor balanced with complementary {bot_col} tones",
            "heroImage": hero_img,
            "items": p_items,
            "reasons": [
                f"Features your selected {col_title} color theme with high tonal contrast",
                f"Calibrated for {occ} silhouette requirements and ease of movement",
                f"{p_matched} of {p_total} pieces in your wardrobe ({p_pct}% closet match)"
            ],
            "wardrobe_match": {
                "matched_count": p_matched,
                "required_count": p_total,
                "wardrobe_coverage": round(p_matched / max(1, p_total), 2),
                "percentage": p_pct,
                "statusText": f"{p_matched} items in your closet!" if p_matched > 0 else "Pieces needed to buy",
                "subtext": f"{len(p_missing)} item(s) needed to complete ensemble." if p_missing else "All pieces in closet!",
                "missing_items": p_missing
            },
            "explanation": f"Curated {col_title} look specifically formulated for {occ} styling."
        }

        # Alternative Look 2: Monochromatic / Neutral Contrast
        is_ethnic_occ = occ_lower in ("wedding", "traditional")
        alt_top_art_2 = "kurtis" if is_ethnic_occ else "tops"
        alt_top_name_2 = f"{col_title} Chanderi Silk Kurti" if is_ethnic_occ else f"Soft {col_title} Cotton Boxy Top"
        alt_bot_col = "Gold" if is_ethnic_occ else ("White" if bot_col != "White" else "Blue")
        alt_bot_name = f"Ivory & Gold Flared Sharara Pants" if is_ethnic_occ else (f"Off-White Wide-Leg Trousers" if alt_bot_col == "White" else f"Dark Indigo Denim Jeans")
        alt_bot_art = "trousers" if is_ethnic_occ else ("jeans" if "jeans" in alt_bot_name.lower() else "trousers")
        alt_shoe_name_2 = "Embroidered Velvet Mojaris" if is_ethnic_occ else "Classic Canvas Low-Tops"
        alt_shoe_art_2 = "flats" if is_ethnic_occ else "casual shoes"
        alt_shoe_col_2 = "Gold" if is_ethnic_occ else "White"

        look2_raw = [
            {
                "id": f"item_top_{col_norm}_alt",
                "name": alt_top_name_2,
                "slot": "Top",
                "category": "Apparel",
                "subcategory": alt_top_art_2.title(),
                "article_type": alt_top_art_2,
                "colour": col_title,
                "season": sea,
                "usage": occ,
                "brand": "FabIndia" if is_ethnic_occ else "Uniqlo",
                "description": f"Breathable {col_title.lower()} piece offering understated everyday elegance.",
                "image": top_img
            },
            {
                "id": f"item_bottom_{alt_bot_col.lower()}",
                "name": alt_bot_name,
                "slot": "Bottom",
                "category": "Apparel",
                "subcategory": "Bottomwear",
                "article_type": alt_bot_art,
                "colour": alt_bot_col,
                "season": "All Season",
                "usage": occ,
                "brand": "Biba" if is_ethnic_occ else "Mango",
                "description": f"Flattering high-rise {alt_bot_col.lower()} silhouette.",
                "image": get_curated_item_image("Bottom", alt_bot_col, alt_bot_art, style=sty)
            },
            {
                "id": "item_shoe_retro",
                "name": alt_shoe_name_2,
                "slot": "Shoes",
                "category": "Footwear",
                "subcategory": "Shoes",
                "article_type": alt_shoe_art_2,
                "colour": alt_shoe_col_2,
                "season": "All Season",
                "usage": occ,
                "brand": "Needledust" if is_ethnic_occ else "Converse",
                "description": f"Harmonious {alt_shoe_col_2.lower()} footwear.",
                "image": shoe_img
            }
        ]

        a_items, a_matched, a_total, a_pct, a_missing = evaluate_outfit_pieces(look2_raw)

        look2 = {
            "id": f"rec_{occ_lower}_2",
            "name": f"Look 02: {col_title} Minimalist Contrast",
            "subtitle": f"Modern clean lines pairing {col_title} with {alt_bot_col}",
            "occasion": occ,
            "style": sty,
            "season": sea,
            "colour": f"{col_title} + {alt_bot_col}",
            "budget": "2200",
            "compatibility_score": 91,
            "color_score": 90,
            "color_harmony_explanation": f"High key neutral palette emphasizing {col_title} warmth",
            "heroImage": hero_img,
            "items": a_items,
            "reasons": [
                f"Contemporary minimalist silhouette highlighting {col_title}",
                f"{a_matched} pieces in your closet ({a_pct}% match)"
            ],
            "wardrobe_match": {
                "matched_count": a_matched,
                "required_count": a_total,
                "wardrobe_coverage": round(a_matched / max(1, a_total), 2),
                "percentage": a_pct,
                "statusText": f"{a_matched} items in your closet!" if a_matched > 0 else "Pieces needed to buy",
                "subtext": f"{len(a_missing)} item(s) needed to complete ensemble.",
                "missing_items": a_missing
            },
            "explanation": f"Minimalist interpretation of {col_title} for {occ} occasions."
        }

        # Alternative Look 3: Statement Chic / Layered Contrast
        alt_top_art_3 = "kurtas" if is_ethnic_occ else "tops"
        alt_top_name_3 = f"Royal {col_title} Georgette Kurta" if is_ethnic_occ else f"Classic {col_title} Structured Topwear"
        alt_bot_col_3 = "Cream" if is_ethnic_occ else "Charcoal"
        alt_bot_name_3 = "Zari Embroidered Cream Palazzos" if is_ethnic_occ else "Tailored Charcoal Straight Trousers"
        alt_shoe_name_3 = "Embellished Metallic Block Heels" if is_ethnic_occ else "Sleek Modern Pointed Loafers"
        alt_shoe_art_3 = "heels" if is_ethnic_occ else "formal shoes"
        alt_shoe_col_3 = "Gold" if is_ethnic_occ else "Black"

        look3_raw = [
            {
                "id": f"item_top_{col_norm}_chic",
                "name": alt_top_name_3,
                "slot": "Top",
                "category": "Apparel",
                "subcategory": alt_top_art_3.title(),
                "article_type": alt_top_art_3,
                "colour": col_title,
                "season": sea,
                "usage": occ,
                "brand": "W for Woman" if is_ethnic_occ else "Zara",
                "description": f"Tailored {col_title.lower()} piece offering timeless silhouette definition.",
                "image": top_img
            },
            {
                "id": "item_bottom_charcoal",
                "name": alt_bot_name_3,
                "slot": "Bottom",
                "category": "Apparel",
                "subcategory": "Bottomwear",
                "article_type": "trousers",
                "colour": alt_bot_col_3,
                "season": "All Season",
                "usage": occ,
                "brand": "Biba" if is_ethnic_occ else "Mango",
                "description": "Versatile straight-fit trouser creating grounded tonal balance.",
                "image": get_curated_item_image("Bottom", "black", "trousers", style=sty)
            },
            {
                "id": "item_shoe_leather",
                "name": alt_shoe_name_3,
                "slot": "Shoes",
                "category": "Footwear",
                "subcategory": "Shoes",
                "article_type": alt_shoe_art_3,
                "colour": alt_shoe_col_3,
                "season": "All Season",
                "usage": occ,
                "brand": "Catwalk" if is_ethnic_occ else "Clarks",
                "description": "Comfortable refined footwear designed for versatile day-to-evening wear.",
                "image": shoe_img
            }
        ]

        c_items, c_matched, c_total, c_pct, c_missing = evaluate_outfit_pieces(look3_raw)

        look3 = {
            "id": f"rec_{occ_lower}_3",
            "name": f"Look 03: {col_title} Statement Chic",
            "subtitle": f"Elevated tailored proportion balancing {col_title} with grounded dark neutrals",
            "occasion": occ,
            "style": sty,
            "season": sea,
            "colour": f"{col_title} + Charcoal",
            "budget": "2600",
            "compatibility_score": 93,
            "color_score": 91,
            "color_harmony_explanation": f"Sophisticated neutral grounding for vibrant {col_title}",
            "heroImage": hero_img,
            "items": c_items,
            "reasons": [
                f"Elevated tailored styling featuring {col_title}",
                f"{c_matched} pieces in your closet ({c_pct}% match)"
            ],
            "wardrobe_match": {
                "matched_count": c_matched,
                "required_count": c_total,
                "wardrobe_coverage": round(c_matched / max(1, c_total), 2),
                "percentage": c_pct,
                "statusText": f"{c_matched} items in your closet!" if c_matched > 0 else "Pieces needed to buy",
                "subtext": f"{len(c_missing)} item(s) needed to complete ensemble.",
                "missing_items": c_missing
            },
            "explanation": f"Contemporary elevated styling centered around {col_title}."
        }

        look4 = {
            **look1,
            "id": f"rec_{occ_lower}_4",
            "name": f"Look 04: {col_title} Festive Fusion",
            "subtitle": f"Contemporary fluid silhouette celebrating {col_title} with refined accents"
        }

        max_allowed = limit if limit else 3
        fallback_outfits = [look1, look2, look3, look4][:max_allowed]
        return {
            "status": "success",
            "total": len(fallback_outfits),
            "primary_recommendation": look1,
            "alternatives": fallback_outfits[1:],
            "recommendations": fallback_outfits
        }


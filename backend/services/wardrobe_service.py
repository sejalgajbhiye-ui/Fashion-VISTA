"""
Wardrobe Matching and Missing-Item Detection Service for Fashion VISTA.

Matches recommended outfit items against user wardrobe closet items:
- Category alignment (Tops, Bottoms, Shoes, Outerwear/Layers)
- Color compatibility matching
- Calculates:
  - matched_count
  - required_count
  - missing_items
  - wardrobe_coverage
  - detailed match breakdown and explanations
"""

from ml.utils.color_theory import calculate_color_pair_score

CATEGORY_MAP = {
    "top": ["tops", "topwear", "shirts", "tshirts", "dress"],
    "bottom": ["bottoms", "bottomwear", "jeans", "trousers", "pants", "shorts", "skirt"],
    "shoes": ["shoes", "footwear", "sneakers", "flip flops", "sandals"],
    "layer": ["outerwear", "layers", "jackets", "blazers", "sweaters", "coats"],
    "accessory": ["accessories", "watches", "bags", "belts"]
}


def normalize_category(cat_str):
    if not cat_str:
        return "top"
    c = str(cat_str).strip().lower()
    for standard_slot, variations in CATEGORY_MAP.items():
        if c == standard_slot or any(v in c for v in variations):
            return standard_slot
    return "top"


def match_outfit_against_wardrobe(outfit_items, user_wardrobe):
    """
    Compares a list of outfit items against the user's wardrobe items.
    outfit_items: list of dicts with 'name', 'slot'/'category', 'colour'
    user_wardrobe: list of dicts with 'id', 'name', 'category', 'colour', 'owned'
    """
    if not outfit_items:
        return {
            "matched_count": 0,
            "required_count": 0,
            "missing_items": [],
            "wardrobe_coverage": 0.0,
            "matches": [],
            "explanation": "No outfit items to match."
        }

    owned_items = [w for w in (user_wardrobe or []) if w.get("owned", True)]
    matched_items = []
    missing_items = []
    used_wardrobe_ids = set()

    for item in outfit_items:
        slot = normalize_category(item.get("slot") or item.get("category"))
        color = item.get("colour", "")
        item_name = item.get("name", "Clothing Item")

        best_match = None
        best_score = 0.0

        for w in owned_items:
            if w.get("id") in used_wardrobe_ids:
                continue

            w_slot = normalize_category(w.get("category"))
            if slot != w_slot:
                continue

            # Category matches! Check color compatibility
            w_color = w.get("colour", "")
            color_sim = calculate_color_pair_score(color, w_color)

            # Name similarity boost
            name_boost = 0.1 if any(word in w.get("name", "").lower() for word in item_name.lower().split() if len(word) > 3) else 0.0
            total_sim = min(1.0, color_sim + name_boost)

            if total_sim > best_score:
                best_score = total_sim
                best_match = w

        # Threshold for considering it an owned match (>= 0.80)
        if best_match and best_score >= 0.80:
            used_wardrobe_ids.add(best_match.get("id"))
            matched_items.append({
                "outfit_item": item_name,
                "slot": slot,
                "matched_wardrobe_id": best_match.get("id"),
                "matched_wardrobe_name": best_match.get("name"),
                "match_score": round(best_score * 100),
                "status": "owned"
            })
        else:
            missing_items.append({
                "outfit_item": item_name,
                "slot": slot,
                "suggested_colour": color,
                "status": "missing"
            })

    total_required = len(outfit_items)
    matched_count = len(matched_items)
    coverage = round(matched_count / total_required, 2) if total_required > 0 else 0.0

    missing_names = [m["outfit_item"] for m in missing_items]
    if missing_names:
        explanation = f"You already own {matched_count} of {total_required} items ({int(coverage * 100)}% coverage). Missing piece(s) to acquire: {', '.join(missing_names)}."
    else:
        explanation = f"Full closet coverage! All {matched_count} outfit components are already present in your wardrobe."

    return {
        "matched_count": matched_count,
        "required_count": total_required,
        "missing_items": missing_names,
        "missing_details": missing_items,
        "wardrobe_coverage": coverage,
        "matches": matched_items,
        "explanation": explanation
    }

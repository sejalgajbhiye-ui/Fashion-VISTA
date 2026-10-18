"""
Fashion VISTA — Outfit Compatibility & Constraint Layer.

Reuses:
1. Product Attribute Model (models/product_attribute_model.joblib)
   - TF-IDF Vectorizer + Multi-Target Logistic Regression for usage/occasion and category inference.
2. Color Theory Engine (ml.utils.color_theory)
   - Pairwise color compatibility and multi-piece harmony scoring.
3. Virtual Wardrobe (backend/database.py and backend/services/wardrobe_service.py)
   - Real wardrobe cross-referencing, owned item substitutions, and savings calculation.

Architecture:
Outfit score = (0.25 * preference_relevance +
                0.25 * colour_harmony +
                0.20 * occasion_suitability +
                0.15 * style_compatibility +
                0.15 * wardrobe_reuse) * 100

Hard Constraints:
- Excluded colours: strictly filters or disqualifies outfits containing forbidden hues.
- Hard budget limits: evaluates the net purchase cost of MISSING items against the user's budget.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import joblib

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from ml.utils.color_theory import (
    evaluate_outfit_color_harmony,
    calculate_color_pair_score,
    normalize_color,
    NEUTRALS
)

logger = logging.getLogger("outfit_compatibility")

# Cache attribute model singleton to prevent redundant disk I/O
_ATTRIBUTE_MODEL_CACHE = None
ATTRIBUTE_MODEL_PATH = BASE_DIR / "models" / "product_attribute_model.joblib"


def get_attribute_model():
    """Loads and returns the trained product attribute understanding model."""
    global _ATTRIBUTE_MODEL_CACHE
    if _ATTRIBUTE_MODEL_CACHE is None and ATTRIBUTE_MODEL_PATH.exists():
        try:
            _ATTRIBUTE_MODEL_CACHE = joblib.load(ATTRIBUTE_MODEL_PATH)
            logger.info("Loaded product_attribute_model.joblib into Compatibility Layer.")
        except Exception as e:
            logger.warning(f"Failed to load product_attribute_model.joblib: {e}")
            _ATTRIBUTE_MODEL_CACHE = None
    return _ATTRIBUTE_MODEL_CACHE


class OutfitCompatibilityLayer:
    """
    Evaluates multi-piece outfit compatibility, wardrobe synergy, and hard constraints
    across Dress, Jewellery, Footwear, and Handbag (0 hairstyle).
    """

    def __init__(self):
        self.attr_bundle = get_attribute_model()

    def predict_garment_usage_and_category(self, text: str) -> Dict[str, str]:
        """
        Uses existing product_attribute_model.joblib to infer category and usage
        from item title or description.
        """
        if not self.attr_bundle or not text:
            return {"category": "Apparel", "subcategory": "Topwear", "usage": "Casual", "season": "All Season"}

        try:
            vec = self.attr_bundle["vectorizer"].transform([str(text)])
            models = self.attr_bundle["models"]
            return {
                attr: str(models[attr].predict(vec)[0])
                for attr in ["category", "subcategory", "usage", "season"]
                if attr in models
            }
        except Exception as e:
            logger.debug(f"Attribute model inference note: {e}")
            return {"category": "Apparel", "subcategory": "Topwear", "usage": "Casual", "season": "All Season"}

    def evaluate_color_harmony(self, colors: List[str]) -> Tuple[float, str]:
        """
        Calculates color harmony using existing ml.utils.color_theory.
        Returns normalized score in [0.0, 1.0] and qualitative explanation.
        """
        valid_colors = [normalize_color(c) for c in colors if c]
        if not valid_colors:
            return 0.85, "Neutral balanced palette"
        score, explanation = evaluate_outfit_color_harmony(valid_colors)
        return min(1.0, max(0.5, float(score))), explanation

    def evaluate_occasion_suitability(self, items: List[Dict[str, Any]], target_occasion: str) -> float:
        """
        Evaluates whether items match the formality of the requested occasion.
        Reuses product_attribute_model predicted usages where applicable.
        """
        occ_lower = str(target_occasion).lower()
        if not items:
            return 0.85

        scores = []
        for it in items:
            name = it.get("name", "")
            preds = self.predict_garment_usage_and_category(name)
            predicted_usage = preds.get("usage", "Casual").lower()

            if any(k in occ_lower for k in ["wedding", "reception", "sangeet", "festive", "traditional"]):
                # Ethnic or party usage is ideal
                if predicted_usage in ["ethnic", "party", "formal"]:
                    scores.append(0.98)
                elif any(k in name.lower() for k in ["saree", "lehenga", "sharara", "kurta", "anarkali", "silk", "zari", "potli", "juttis"]):
                    scores.append(0.96)
                else:
                    scores.append(0.80)
            elif any(k in occ_lower for k in ["party", "cocktail", "club", "gala", "date"]):
                # Party, evening, or formal usage
                if predicted_usage in ["party", "formal", "smart casual"]:
                    scores.append(0.96)
                elif any(k in name.lower() for k in ["gown", "sequin", "satin", "blazer", "tuxedo", "clutch", "heels", "velvet"]):
                    scores.append(0.95)
                else:
                    scores.append(0.82)
            else:
                # College / Casual / Everyday
                if predicted_usage in ["casual", "smart casual", "travel"]:
                    scores.append(0.95)
                else:
                    scores.append(0.88)

        return float(sum(scores) / len(scores)) if scores else 0.85

    def evaluate_style_compatibility(self, items: List[Dict[str, Any]], target_style: str) -> float:
        """
        Ensures aesthetic cohesion between attire silhouette, jewellery metal, footwear, and handbag.
        E.g., prevents pairing royal silk sarees with sports sneakers or casual backpacks.
        """
        if not items:
            return 0.90

        item_names = " ".join([i.get("name", "").lower() for i in items])
        sty_lower = str(target_style).lower()

        # Check for jarring clashes
        is_traditional = any(k in item_names for k in ["saree", "lehenga", "sharara", "chikankari", "anarkali"])
        has_sneakers = "sneaker" in item_names
        has_backpack = "backpack" in item_names

        if is_traditional and (has_sneakers or has_backpack):
            return 0.60  # Formality clash penalty

        is_gala = any(k in item_names for k in ["gown", "tuxedo", "cowl"])
        if is_gala and "mojaris" in item_names:
            return 0.75  # Minor cross-aesthetic clash

        # Positive style reinforcement
        if "traditional" in sty_lower and is_traditional:
            return 0.96
        if "western" in sty_lower or "modern" in sty_lower:
            return 0.95

        return 0.92

    def evaluate_wardrobe_reuse(
        self,
        ensemble_pieces: List[Dict[str, Any]],
        wardrobe: Optional[List[Dict[str, Any]]]
    ) -> Tuple[float, List[Dict[str, Any]], int]:
        """
        Matches ensemble pieces against the user's digital wardrobe.
        Returns:
        - reuse_ratio: fraction of slots covered by wardrobe [0.0, 1.0]
        - matched_items: detailed list of matched pieces
        - total_savings: rupees saved by reusing existing garments
        """
        if not wardrobe or not isinstance(wardrobe, list) or len(wardrobe) == 0:
            return 0.0, [], 0

        matched_items = []
        total_savings = 0
        used_wardrobe_ids = set()

        for piece in ensemble_pieces:
            slot = piece.get("slot", "").lower()
            p_color = normalize_color(piece.get("colour", piece.get("color", "")))
            p_name = piece.get("name", "").lower()
            base_price = piece.get("base_price") or piece.get("price") or 1499

            for w in wardrobe:
                w_id = w.get("id")
                if w_id and w_id in used_wardrobe_ids:
                    continue

                w_name = str(w.get("name", "")).lower()
                w_cat = str(w.get("category", "")).lower()
                w_sub = str(w.get("subcategory", w_cat)).lower()
                w_color = normalize_color(w.get("colour", w.get("color", "")))

                # Slot and silhouette alignment check
                slot_match = False
                piece_cat = str(piece.get("category", "")).lower()
                if slot in ["dress", "attire", "top"]:
                    if "saree" in piece_cat or "saree" in p_name:
                        slot_match = "saree" in w_cat or "saree" in w_sub or "saree" in w_name
                    elif "lehenga" in piece_cat or "lehenga" in p_name:
                        slot_match = "lehenga" in w_cat or "lehenga" in w_sub or "lehenga" in w_name
                    elif any(k in piece_cat or k in p_name for k in ["anarkali", "sharara", "kurta", "kurti", "suit"]):
                        slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["anarkali", "sharara", "kurta", "kurti", "suit"])
                    elif any(k in piece_cat or k in p_name for k in ["gown", "dress", "slip"]):
                        slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["gown", "dress", "maxi"])
                    elif any(k in piece_cat or k in p_name for k in ["shirt", "top", "tee"]):
                        slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["shirt", "top", "tee"])
                    else:
                        slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["dress", "saree", "kurta"])
                elif slot in ["shoes", "footwear"]:
                    slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["shoe", "footwear", "sandal", "heel", "mojaris", "juttis", "sneaker", "flats"])
                elif slot in ["handbag", "bag"]:
                    slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["bag", "clutch", "potli", "purse", "handbag", "tote"])
                elif slot in ["jewellery", "jewelry"]:
                    slot_match = any(k in w_cat or k in w_sub or k in w_name for k in ["jewel", "necklace", "earring", "choker", "set"])

                if not slot_match:
                    continue

                # Strict color compatibility check: Garments MUST strictly match the exact color family!
                if slot in ["dress", "attire", "top"]:
                    is_color_match = (p_color == w_color) or (p_color in ["yellow", "mustard"] and w_color in ["yellow", "mustard"]) or (p_color in ["red", "maroon", "crimson"] and w_color in ["red", "maroon", "crimson"])
                else:
                    # Shoes, bags, and jewellery can match exact color or harmonized metallics / neutrals
                    is_color_match = (p_color == w_color) or (w_color in NEUTRALS) or (w_color in ["gold", "cream", "metallic"] and p_color in ["gold", "yellow", "cream", "red", "maroon"])

                if is_color_match:
                    if w_id:
                        used_wardrobe_ids.add(w_id)
                    savings = base_price
                    total_savings += savings
                    matched_items.append({
                        "slot": piece.get("slot", "Dress"),
                        "outfit_item": piece.get("name"),
                        "matched_item_id": w_id,
                        "matched_item_name": w.get("name", "Owned Garment"),
                        "matched_item_image": w.get("image") or w.get("image_url", ""),
                        "saves_amount": savings,
                        "reason": f"Reuse your owned {w.get('name')} to save Rs. {savings:,}!"
                    })
                    break

        total_slots = len(ensemble_pieces) if ensemble_pieces else 4
        reuse_ratio = len(matched_items) / float(total_slots)
        return min(1.0, reuse_ratio), matched_items, total_savings

    def check_constraints(
        self,
        pieces: List[Dict[str, Any]],
        preferences: Dict[str, Any],
        total_missing_cost: int
    ) -> Tuple[bool, List[str]]:
        """
        Evaluates hard constraints:
        1. Excluded colours: Any garment in a forbidden hue triggers violation.
        2. Hard budget limit: Evaluates the total purchase price of MISSING items.
        """
        violations = []
        is_valid = True

        # 1. Excluded Colours
        raw_excluded = (
            preferences.get("excluded_colours") or
            preferences.get("excluded_colors") or
            preferences.get("exclude_colors") or
            preferences.get("excluded_colour") or
            []
        )
        if isinstance(raw_excluded, str):
            raw_excluded = [c.strip() for c in raw_excluded.replace(";", ",").split(",") if c.strip()]

        normalized_excluded = {normalize_color(c) for c in raw_excluded if c}

        if normalized_excluded:
            for p in pieces:
                p_color = normalize_color(p.get("colour", p.get("color", "")))
                p_name = p.get("name", "").lower()
                for exc in normalized_excluded:
                    if exc and (p_color == exc or exc in p_name):
                        violations.append(f"Contains excluded colour: {exc.capitalize()} in '{p.get('name')}'")
                        is_valid = False

        # 2. Hard Budget Limit
        raw_budget = preferences.get("budget")
        if raw_budget:
            try:
                # Parse numeric budget
                budget_val = int(str(raw_budget).replace("Rs.", "").replace("₹", "").replace(",", "").strip())
                if total_missing_cost > budget_val:
                    violations.append(
                        f"Net purchase cost (Rs. {total_missing_cost:,}) exceeds user budget of Rs. {budget_val:,}"
                    )
                    is_valid = False
            except (ValueError, TypeError):
                pass

        return is_valid, violations

    def score_ensemble(
        self,
        ensemble: Dict[str, Any],
        preferences: Dict[str, Any],
        wardrobe: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Calculates unified multi-factor compatibility score and evaluates constraints.
        Returns enriched metrics dictionary.
        """
        # Collect pieces
        pieces = ensemble.get("items") or []
        if not pieces:
            if "ensemble_breakdown" in ensemble:
                bd = ensemble["ensemble_breakdown"]
                pieces = [
                    {"slot": "Dress", **bd.get("dress", {})},
                    {"slot": "Jewellery", **bd.get("jewellery", {})},
                    {"slot": "Footwear", **bd.get("footwear", {})},
                    {"slot": "Handbag", **bd.get("handbag", {})}
                ]
            elif "dress" in ensemble:
                pieces = [
                    {"slot": "Dress", **ensemble.get("dress", {})},
                    {"slot": "Jewellery", **ensemble.get("jewellery", {})},
                    {"slot": "Footwear", **ensemble.get("footwear", {})},
                    {"slot": "Handbag", **ensemble.get("handbag", {})}
                ]

        # 1. Preference Relevance (Occasion, Color, Style alignment)
        req_occ = str(preferences.get("occasion", "Wedding")).strip()
        req_col = normalize_color(str(preferences.get("colour", "Red")).strip())
        req_style = str(preferences.get("style", "Traditional")).strip()

        # Check dress color matching preferred color
        dress_color = ""
        for p in pieces:
            if p.get("slot", "").lower() in ["dress", "attire", "top"]:
                dress_color = normalize_color(p.get("colour", p.get("color", "")))
                break

        pref_color_match = 1.0 if (dress_color == req_col or req_col in ["any", "neutral", ""]) else 0.80
        pref_occ_match = 0.95 if req_occ.lower() in ensemble.get("occasion", "").lower() else 0.85
        s_pref = (pref_color_match * 0.6) + (pref_occ_match * 0.4)

        # 2. Color Harmony
        colors = [p.get("colour", p.get("color", "")) for p in pieces]
        s_color, color_rationale = self.evaluate_color_harmony(colors)

        # 3. Occasion Suitability (verified with product_attribute_model)
        s_occ = self.evaluate_occasion_suitability(pieces, req_occ)

        # 4. Style Compatibility
        s_style = self.evaluate_style_compatibility(pieces, req_style)

        # 5. Wardrobe Synergy
        s_wardrobe, matched_items, total_savings = self.evaluate_wardrobe_reuse(pieces, wardrobe)

        # 6. Unified Composite Score:
        # Outfit score = 0.25*relevance + 0.25*color + 0.20*occasion + 0.15*style + 0.15*wardrobe
        composite_raw = (
            0.25 * s_pref +
            0.25 * s_color +
            0.20 * s_occ +
            0.15 * s_style +
            0.15 * s_wardrobe
        )
        composite_score = int(round(composite_raw * 100))
        # Ensure tasteful display scaling between 85 and 99
        display_score = min(99, max(85, composite_score))

        # 7. Calculate Net Missing Cost
        # Missing pieces are those not covered by wardrobe
        matched_slots = {m["slot"].lower() for m in matched_items}
        missing_cost = 0
        for p in pieces:
            if p.get("slot", "").lower() not in matched_slots:
                cost = p.get("base_price") or p.get("price") or 1499
                missing_cost += cost

        # 8. Hard Constraints Evaluation
        passes_constraints, constraint_violations = self.check_constraints(
            pieces=pieces,
            preferences=preferences,
            total_missing_cost=missing_cost
        )

        return {
            "compatibility_score": display_score,
            "passes_constraints": passes_constraints,
            "constraint_violations": constraint_violations,
            "breakdown": {
                "preference_relevance": round(s_pref * 100, 1),
                "colour_harmony": round(s_color * 100, 1),
                "occasion_suitability": round(s_occ * 100, 1),
                "style_compatibility": round(s_style * 100, 1),
                "wardrobe_synergy": round(s_wardrobe * 100, 1)
            },
            "color_explanation": color_rationale,
            "wardrobe_matches": matched_items,
            "total_savings": total_savings,
            "net_purchase_cost": missing_cost,
            "reused_count": len(matched_items),
            "total_count": len(pieces)
        }


# Singleton accessor
_compatibility_singleton = None


def get_compatibility_layer() -> OutfitCompatibilityLayer:
    """Returns or initializes the global OutfitCompatibilityLayer singleton."""
    global _compatibility_singleton
    if _compatibility_singleton is None:
        _compatibility_singleton = OutfitCompatibilityLayer()
    return _compatibility_singleton

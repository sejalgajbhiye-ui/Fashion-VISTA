"""
Color Harmony and Compatibility Engine for Fashion VISTA.

Applies fashion color theory:
- Neutral matching (Black, White, Grey, Beige, Navy, Silver)
- Monochromatic palettes (shades of the same hue)
- Complementary & analogous pairings
- Contrast balance
"""

NEUTRALS = {
    "black", "white", "grey", "gray", "silver", "beige", "cream",
    "off-white", "khaki", "navy", "navy blue", "tan", "charcoal", "brown"
}

COMPATIBILITY_MATRIX = {
    "blue": {"white", "black", "grey", "beige", "silver", "navy", "tan", "brown", "khaki"},
    "navy blue": {"white", "grey", "beige", "silver", "khaki", "tan", "black", "pink", "yellow"},
    "navy": {"white", "grey", "beige", "silver", "khaki", "tan", "black", "pink", "yellow"},
    "black": {"white", "grey", "red", "blue", "yellow", "green", "pink", "beige", "silver", "gold", "purple"},
    "white": {"black", "blue", "navy", "green", "red", "beige", "grey", "pink", "yellow", "brown", "purple"},
    "grey": {"black", "white", "navy", "blue", "pink", "burgundy", "red", "yellow", "purple"},
    "beige": {"white", "black", "navy", "blue", "brown", "green", "tan", "olive"},
    "red": {"black", "white", "grey", "navy", "beige", "silver"},
    "green": {"white", "black", "beige", "grey", "brown", "tan", "navy"},
    "olive": {"beige", "white", "black", "grey", "tan", "brown"},
    "yellow": {"black", "white", "navy", "grey", "blue"},
    "pink": {"white", "grey", "navy", "black", "silver", "beige"},
    "purple": {"white", "black", "grey", "silver", "beige"},
    "brown": {"white", "beige", "cream", "blue", "green", "tan"}
}


def normalize_color(color_name):
    if not color_name:
        return "neutral"
    c = str(color_name).strip().lower()
    for n in ["black", "white", "grey", "gray", "blue", "navy", "beige", "red", "green", "yellow", "pink", "purple", "brown", "silver", "gold", "cream"]:
        if n in c:
            return n if n != "gray" else "grey"
    return c


def calculate_color_pair_score(c1, c2):
    n1 = normalize_color(c1)
    n2 = normalize_color(c2)

    # Identical or near-identical colors (Monochrome harmony)
    if n1 == n2:
        return 0.92

    # Neutral base combinations
    if n1 in NEUTRALS and n2 in NEUTRALS:
        return 0.95

    # One neutral with any accent
    if n1 in NEUTRALS or n2 in NEUTRALS:
        return 0.88

    # Check compatibility matrix
    if n1 in COMPATIBILITY_MATRIX and n2 in COMPATIBILITY_MATRIX[n1]:
        return 0.85
    if n2 in COMPATIBILITY_MATRIX and n1 in COMPATIBILITY_MATRIX[n2]:
        return 0.85

    # Default moderate compatibility
    return 0.65


def evaluate_outfit_color_harmony(color_list):
    """Computes overall color harmony across an ensemble of garments."""
    valid_colors = [normalize_color(c) for c in color_list if c]
    if len(valid_colors) <= 1:
        return 0.90, "Single-tone clean aesthetic"

    pair_scores = []
    for i in range(len(valid_colors)):
        for j in range(i + 1, len(valid_colors)):
            pair_scores.append(calculate_pair_score(valid_colors[i], valid_colors[j]))

    avg_score = sum(pair_scores) / len(pair_scores) if pair_scores else 0.85

    # Qualitative explanation
    unique_tones = set(valid_colors)
    if len(unique_tones) == 1:
        explanation = f"Monochromatic {valid_colors[0].capitalize()} harmony offering a streamlined, elegant silhouette."
    elif all(c in NEUTRALS for c in unique_tones):
        explanation = "Neutral-grounded palette with balanced tonal contrast."
    else:
        accents = [c.capitalize() for c in unique_tones if c not in NEUTRALS]
        neutrals = [c.capitalize() for c in unique_tones if c in NEUTRALS]
        explanation = f"Balanced ensemble coupling {' + '.join(neutrals) if neutrals else 'Neutral'} anchor with {' + '.join(accents)} accents."

    return round(avg_score, 2), explanation


def calculate_pair_score(c1, c2):
    return calculate_color_pair_score(c1, c2)

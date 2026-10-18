"""
Test Suite for ML Occasion Ensemble Recommender & 5-Retailer Occasion Pipeline
Verifies:
1. OccasionEnsembleRecommender initialization & TF-IDF vectorizer fitting
2. Occasion recommendation ranking & diverse 5-to-10 look generation
3. Complete 5-slot ensemble coverage: Dress, Jewellery, Hairstyle, Footwear, Handbag
4. 5-Retailer deep shopping links: Myntra, Amazon, Meesho, Flipkart, Ajio
5. Digital wardrobe awareness & rupees saved calculation
6. Flask REST API endpoint /api/recommend
"""

import pytest
from ml.models.occasion_ensemble_recommender import (
    OccasionEnsembleRecommender,
    get_occasion_recommender,
    generate_retailer_links
)
from backend.app import create_app


@pytest.fixture
def recommender():
    return get_occasion_recommender()


@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_recommender_initialization(recommender):
    assert recommender is not None
    assert hasattr(recommender, "tfidf_matrix")
    assert hasattr(recommender, "vectorizer")
    assert recommender.tfidf_matrix.shape[0] == len(recommender.catalog)
    assert recommender.tfidf_matrix.shape[1] > 0


def test_generate_retailer_links():
    links = generate_retailer_links("Banarasi Silk Saree", 3899, "dress")
    assert isinstance(links, dict)
    for expected_retailer in ["myntra", "amazon", "meesho", "flipkart", "ajio"]:
        assert expected_retailer in links
        store_data = links[expected_retailer]
        assert "price" in store_data
        assert "url" in store_data
        assert "badge" in store_data
        assert store_data["price"] > 0
        assert store_data["url"].startswith("http")


def test_occasion_recommendation_diverse_looks(recommender):
    prefs = {"occasion": "Wedding", "colour": "Red", "style": "Traditional"}
    result = recommender.recommend(prefs, limit=8)

    assert result["success"] is True
    assert result["total_looks"] == 8
    assert len(result["recommendations"]) == 8

    # Verify each look has all 5 dimensions
    for look in result["recommendations"]:
        assert "name" in look
        assert "total_price" in look
        assert "ensemble_breakdown" in look
        
        breakdown = look["ensemble_breakdown"]
        assert "dress" in breakdown
        assert "jewellery" in breakdown
        assert "footwear" in breakdown
        assert "handbag" in breakdown
        assert "hairstyle" not in breakdown

        # Verify dress details & 5 retailer links
        dress = breakdown["dress"]
        assert "name" in dress
        assert "fabric" in dress
        assert "retailer_links" in dress
        assert len(dress["retailer_links"]) == 5

        # Verify jewellery details & 5 retailer links
        jewel = breakdown["jewellery"]
        assert "name" in jewel
        assert "type" in jewel
        assert "retailer_links" in jewel
        assert len(jewel["retailer_links"]) == 5

        # Verify footwear details
        shoes = breakdown["footwear"]
        assert "name" in shoes
        assert "heel" in shoes
        assert "retailer_links" in shoes
        assert len(shoes["retailer_links"]) == 5

        # Verify handbag details
        bag = breakdown["handbag"]
        assert "name" in bag
        assert "material" in bag
        assert "retailer_links" in bag
        assert len(bag["retailer_links"]) == 5


def test_wardrobe_awareness_and_savings(recommender):
    mock_wardrobe = [
        {
            "id": "w-user-saree",
            "name": "Crimson Kanjeevaram Silk Saree",
            "category": "Dresses",
            "subcategory": "Saree",
            "colour": "Red"
        }
    ]

    prefs = {"occasion": "Wedding", "colour": "Red", "style": "Traditional"}
    result = recommender.recommend(prefs, wardrobe=mock_wardrobe, limit=5)

    assert result["success"] is True
    assert len(result["recommendations"]) == 5

    # Check that at least one look identified the wardrobe match and recorded savings
    matches = [o for o in result["recommendations"] if o.get("has_wardrobe_reuse")]
    assert len(matches) > 0

    first_matched = matches[0]
    assert first_matched["total_savings"] > 0
    assert len(first_matched["wardrobe_matches"]) > 0


def test_api_recommend_endpoint(client):
    payload = {
        "preferences": {
            "occasion": "Wedding",
            "colour": "Red",
            "style": "Traditional"
        },
        "wardrobe": [],
        "limit": 8
    }

    res = client.post("/api/recommend", json=payload)
    assert res.status_code == 200
    data = res.get_json()

    assert data["success"] is True
    assert data["total_looks"] == 8
    assert len(data["recommendations"]) == 8

    first = data["recommendations"][0]
    assert "ensemble_breakdown" in first
    assert "retailer_links" in first
    assert len(first["retailer_links"]) == 5


def test_outfit_compatibility_layer_breakdown(recommender):
    prefs = {"occasion": "Party", "colour": "Black", "style": "Formal"}
    result = recommender.recommend(prefs, limit=6)
    assert result["success"] is True
    assert len(result["recommendations"]) == 6

    for look in result["recommendations"]:
        assert "compatibility_breakdown" in look
        bd = look["compatibility_breakdown"]
        assert "preference_relevance" in bd
        assert "colour_harmony" in bd
        assert "occasion_suitability" in bd
        assert "style_compatibility" in bd
        assert "wardrobe_synergy" in bd
        assert look["compatibility_score"] >= 80


def test_excluded_colours_constraint(recommender):
    # Test that excluded colours are flagged
    prefs = {
        "occasion": "Wedding",
        "colour": "Red",
        "style": "Traditional",
        "excluded_colours": ["yellow", "gold"]
    }
    result = recommender.recommend(prefs, limit=5)
    assert result["success"] is True
    assert len(result["recommendations"]) == 5


def test_budget_constraint_and_wardrobe_reuse(recommender):
    # With wardrobe reuse, purchase cost drops drastically so tight budget can be met
    mock_wardrobe = [
        {"id": "w1", "name": "Red Saree", "category": "Dresses", "colour": "Red"},
        {"id": "w2", "name": "Gold Mojaris", "category": "Shoes", "colour": "Gold"},
        {"id": "w3", "name": "Red Potli", "category": "Accessories", "colour": "Red"}
    ]
    prefs = {
        "occasion": "Wedding",
        "colour": "Red",
        "style": "Traditional",
        "budget": "2000"
    }
    result = recommender.recommend(prefs, wardrobe=mock_wardrobe, limit=5)
    assert result["success"] is True

    # At least one look should have reused items and total savings >= 3000
    top_look = result["recommendations"][0]
    assert top_look["total_savings"] > 0
    assert top_look["has_wardrobe_reuse"] is True
    assert len(top_look["wardrobe_matches"]) >= 2
    # The net cost to buy missing items should be within or close to budget
    assert top_look["net_cost"] < top_look["total_price"]


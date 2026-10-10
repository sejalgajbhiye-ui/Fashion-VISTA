export const defaultRecommendation = {
  id: "rec-urban-casual",
  name: "Urban Casual",
  subtitle: "Effortless College Minimalist Layering",
  occasion: "College",
  outfitType: "Full Outfit",
  style: "Casual",
  colour: "Black + Blue",
  season: "Summer",
  budget: "1800",
  heroImage: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1000&q=80",
  vtoPreviewImage: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=80",
  wardrobeMatch: {
    ownedCount: 3,
    totalCount: 4,
    percentage: 75,
    statusText: "You're almost ready.",
    subtext: "Only 1 item may need to be purchased."
  },
  items: [
    {
      id: "item-1",
      wardrobeId: 1,
      name: "Black Oversized Top",
      slot: "Top",
      category: "Top",
      colour: "Charcoal Black",
      inWardrobe: true,
      owned: true,
      needed_to_buy: false,
      image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80",
      description: "Relaxed boxy cut allows breathability for lectures and commute."
    },
    {
      id: "item-2",
      wardrobeId: 2,
      name: "Blue Straight-Fit Jeans",
      slot: "Bottom",
      category: "Bottom",
      colour: "Classic Blue",
      inWardrobe: true,
      owned: true,
      needed_to_buy: false,
      image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=600&q=80",
      description: "Mid-rise vintage wash denim providing structural balance."
    },
    {
      id: "item-3",
      wardrobeId: 3,
      name: "White Sneakers",
      slot: "Shoes",
      category: "Shoes",
      colour: "Clean White",
      inWardrobe: true,
      owned: true,
      needed_to_buy: false,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80",
      description: "All-day campus walking comfort with crisp contrast."
    },
    {
      id: "item-4",
      wardrobeId: null,
      name: "Denim Jacket",
      slot: "Layer",
      category: "Layer",
      colour: "Indigo Blue",
      inWardrobe: false,
      owned: false,
      needed_to_buy: true,
      image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80",
      description: "Structured cotton layer for AC auditoriums and transitional weather.",
      estimatedPrice: "₹1,499 - ₹2,299"
    }
  ],
  missingItem: {
    id: "item-4",
    name: "Denim Jacket",
    category: "Layer",
    colour: "Indigo Blue",
    reason: "Adds architectural structure over oversized tops while shielding from air-conditioned lecture halls.",
    image: "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80"
  },
  reasons: [
    "Matches your college occasion with everyday mobility and durable ease",
    "Matches your casual style while maintaining clean silhouette proportions",
    "Works with your preferred colour palette of Black & Denim Blue",
    "Uses 3 items already in your wardrobe (75% match rate)",
    "Minimizes unnecessary purchases by recommending just 1 optional layer"
  ],
  compatibility: {
    occasion: "Suitable for College",
    style: "Casual",
    colour: "Black + Blue",
    wardrobe: "3 / 4 items owned",
    purchase: "1 item needed"
  },
  alternatives: [
    {
      id: "alt-01",
      number: "01",
      name: "Minimalist Mono Campus",
      itemsSummary: "Black Top + Blue Jeans + White Sneakers",
      ownedCount: 3,
      totalCount: 3,
      percentage: 100,
      image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=600&q=80",
      description: "Pure wardrobe-native outfit requiring zero new purchases."
    },
    {
      id: "alt-02",
      number: "02",
      name: "Crisp Oxford Casual",
      itemsSummary: "White Shirt + Blue Jeans + Sneakers",
      ownedCount: 2,
      totalCount: 3,
      percentage: 67,
      image: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?auto=format&fit=crop&w=600&q=80",
      description: "Slightly elevated tailored look for campus seminar days."
    },
    {
      id: "alt-03",
      number: "03",
      name: "Modern Earth Tones",
      itemsSummary: "Black Top + Beige Trousers + Loafers",
      ownedCount: 2,
      totalCount: 3,
      percentage: 67,
      image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=600&q=80",
      description: "Subtle warm-toned pairing using your existing pleated trousers."
    }
  ]
};

export const alternateCurations = {
  traditional: {
    id: "rec-festive-soiree",
    name: "Festive Silk Elegance",
    subtitle: "Heritage Handcraft for Celebrations",
    occasion: "Traditional",
    outfitType: "Saree",
    style: "Traditional",
    colour: "Green",
    season: "All Season",
    budget: "2500",
    heroImage: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80",
    vtoPreviewImage: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80",
    wardrobeMatch: {
      ownedCount: 3,
      totalCount: 3,
      percentage: 100,
      statusText: "Ready in your closet!",
      subtext: "100% of this look comes from what you own."
    },
    items: [
      {
        id: "item-trad-1",
        wardrobeId: 18,
        name: "Emerald Silk Banarasi Saree",
        category: "Dresses",
        colour: "Green",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80",
        description: "Opulent pure mulberry silk with traditional kadwa motifs."
      },
      {
        id: "item-trad-2",
        wardrobeId: 16,
        name: "Gold Mesh Minimalist Watch",
        category: "Accessories",
        colour: "Gold",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=600&q=80",
        description: "Delicate timepiece adding tasteful modern punctuation."
      },
      {
        id: "item-trad-3",
        wardrobeId: 6,
        name: "Pink Chanderi Dupatta / Stole",
        category: "Accessories",
        colour: "Pink",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
        description: "Harmonious contrasting drape."
      }
    ],
    missingItem: null,
    reasons: [
      "Honors your traditional festive occasion with heritage luxury",
      "Features rich emerald green fabric with gold accent highlights",
      "Uses 100% existing wardrobe pieces",
      "Zero spend required to achieve an elevated festive statement"
    ],
    compatibility: {
      occasion: "Suitable for Traditional / Wedding",
      style: "Traditional Elegance",
      colour: "Emerald & Gold",
      wardrobe: "3 / 3 items owned",
      purchase: "0 items needed"
    },
    alternatives: [
      {
        id: "alt-trad-1",
        number: "01",
        name: "Pink Chanderi Kurti & Trousers",
        itemsSummary: "Pink Kurti + Beige Trousers + Gold Watch",
        ownedCount: 3,
        totalCount: 3,
        percentage: 100,
        image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80",
        description: "A breezy daytime traditional option."
      }
    ]
  },
  formal: {
    id: "rec-executive-tailored",
    name: "Architectural Office Minimal",
    subtitle: "Clean Monochromatic Professional",
    occasion: "Office",
    outfitType: "Full Outfit",
    style: "Formal",
    colour: "Black + Beige",
    season: "All Season",
    budget: "3000",
    heroImage: "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=1000&q=80",
    vtoPreviewImage: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
    wardrobeMatch: {
      ownedCount: 3,
      totalCount: 4,
      percentage: 75,
      statusText: "Almost complete.",
      subtext: "Only 1 tailored accessory or shoes needed."
    },
    items: [
      {
        id: "item-form-1",
        wardrobeId: 5,
        name: "White Crisp Poplin Shirt",
        category: "Top",
        colour: "Crisp White",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=600&q=80",
        description: "Structured cotton poplin base for corporate poise."
      },
      {
        id: "item-form-2",
        wardrobeId: 4,
        name: "Beige Pleated Trousers",
        category: "Bottom",
        colour: "Warm Beige",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=600&q=80",
        description: "Sharp double pleats with fluid wide drape."
      },
      {
        id: "item-form-3",
        wardrobeId: 10,
        name: "Tan Italian Leather Loafers",
        category: "Shoes",
        colour: "Saddle Tan",
        inWardrobe: true,
        image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=600&q=80",
        description: "Burnished calfskin loafers."
      },
      {
        id: "item-form-4",
        wardrobeId: null,
        name: "Leather Minimal Belt",
        category: "Accessories",
        colour: "Saddle Brown",
        inWardrobe: false,
        image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80",
        description: "Clean slim leather belt to tie trousers and footwear together."
      }
    ],
    missingItem: {
      id: "item-form-4",
      name: "Leather Minimal Belt",
      category: "Accessories",
      colour: "Saddle Brown",
      reason: "Anchors high-waisted pleated trousers to loafers.",
      image: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=600&q=80"
    },
    reasons: [
      "Exemplifies sharp modern office tailoring with relaxed comfort",
      "Combines crisp whites, beige pleats, and rich tan leathers",
      "Employs 75% items from your pre-existing wardrobe",
      "Avoids costly corporate shopping sprees"
    ],
    compatibility: {
      occasion: "Suitable for Office / Meetings",
      style: "Formal / Smart Casual",
      colour: "White + Beige + Tan",
      wardrobe: "3 / 4 items owned",
      purchase: "1 accessory needed"
    },
    alternatives: []
  }
};

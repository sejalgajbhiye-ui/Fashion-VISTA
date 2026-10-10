export const stylistStepOptions = {
  occasions: [
    { id: "wedding", label: "Wedding", description: "Grand weddings, sangeet, receptions & ethnic festivities" },
    { id: "traditional", label: "Traditional", description: "Festivals, pujas, family functions & cultural celebrations" },
    { id: "party", label: "Party", description: "Evening socials, cocktails & festive dinner celebrations" },
    { id: "office", label: "Office", description: "Corporate poise, client meetings & smart professional wear" },
    { id: "college", label: "College", description: "Everyday campus, classes, labs & library comfort" },
    { id: "casual", label: "Casual", description: "Cafes, meetups, city strolls & weekend downtime" },
    { id: "travel", label: "Travel", description: "Airport style, road trips & holiday explorations" }
  ],
  outfitTypes: [
    { id: "full-outfit", label: "Full Outfit" }
  ],
  colours: [
    { id: "red", label: "Red", hex: "#9E2A2B" },
    { id: "black", label: "Black", hex: "#1F1F1F" },
    { id: "white", label: "White", hex: "#FFFFFF", border: true },
    { id: "blue", label: "Blue", hex: "#2B4C7E" },
    { id: "pink", label: "Pink", hex: "#E09898" },
    { id: "green", label: "Green", hex: "#386641" },
    { id: "yellow", label: "Yellow", hex: "#E0A928" },
    { id: "maroon", label: "Maroon", hex: "#631726" },
    { id: "navy", label: "Navy", hex: "#1A2E40" },
    { id: "beige", label: "Beige", hex: "#D6CCC2" },
    { id: "brown", label: "Brown", hex: "#6F4E37" },
    { id: "purple", label: "Purple", hex: "#6E4582" },
    { id: "gold", label: "Gold", hex: "#D4AF37" },
    { id: "any", label: "Any", hex: "linear-gradient(135deg, #eee 0%, #aaa 100%)" }
  ],
  styles: [
    { id: "casual", label: "Casual", description: "Relaxed, functional, understated ease" },
    { id: "formal", label: "Formal", description: "Sharp tailoring, structured silhouettes & polish" },
    { id: "traditional", label: "Traditional", description: "Authentic textiles, ethnic drapes & heritage" },
    { id: "western", label: "Western", description: "Contemporary silhouettes and urban outerwear" },
    { id: "streetwear", label: "Streetwear", description: "Bold volumes, graphic cues & athletic edges" },
    { id: "minimal", label: "Minimal", description: "Clean lines, neutral palette & intentional reduction" }
  ],
  seasons: [
    { id: "summer", label: "Summer", description: "Lightweight, breathable linen & airy cotton" },
    { id: "winter", label: "Winter", description: "Merino knits, tailored coats & warm layering" },
    { id: "monsoon", label: "Monsoon", description: "Quick-drying weaves, trench layers & practical shoes" },
    { id: "any", label: "Any", description: "Versatile climate-adaptive all-season capsule" }
  ]
};

export const defaultUserProfile = {
  name: "Shruti Sharma",
  handle: "@shrutistyles",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  bio: "Curating a conscious, high-rotation capsule wardrobe.",
  preferredStyles: ["Casual", "Minimal", "Traditional"],
  preferredColours: ["Black", "Beige", "Blue"],
  location: "Bengaluru, India",
  stats: {
    totalItems: 18,
    outfitsCurated: 12,
    wardrobeUtilization: "84%",
    savedSpend: "₹14,500"
  }
};

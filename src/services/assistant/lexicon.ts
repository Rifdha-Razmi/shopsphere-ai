/**
 * Vocabulary for the rule-based intent parser. Phrases are matched
 * longest-first on normalized text. `keywords` narrow a broad DummyJSON
 * category to a product type (e.g. "headphones" inside mobile-accessories).
 */
export interface LexiconEntry {
  phrases: string[];
  label: string;
  categories: string[];
  keywords?: string[];
}

export const CATEGORY_LEXICON: LexiconEntry[] = [
  { label: "smartphones", categories: ["smartphones"], phrases: ["smartphone", "smartphones", "smart phone", "smart phones", "phone", "phones", "mobile", "mobiles", "mobile phone", "mobile phones", "cellphone"] },
  { label: "iPhones", categories: ["smartphones"], keywords: ["iphone"], phrases: ["iphone", "iphones"] },
  { label: "headphones", categories: ["mobile-accessories"], keywords: ["earphones", "headphones", "airpods", "earbuds"], phrases: ["headphone", "headphones", "earphone", "earphones", "earbud", "earbuds", "airpods", "headset", "headsets"] },
  { label: "speakers", categories: ["mobile-accessories"], keywords: ["speaker", "speakers", "homepod", "echo"], phrases: ["speaker", "speakers", "smart speaker", "smart speakers"] },
  { label: "chargers", categories: ["mobile-accessories"], keywords: ["charger", "battery", "magsafe"], phrases: ["charger", "chargers", "power bank", "battery pack"] },
  { label: "mobile accessories", categories: ["mobile-accessories"], phrases: ["accessories", "mobile accessories", "phone accessories", "phone case", "phone cases"] },
  { label: "laptops", categories: ["laptops"], phrases: ["laptop", "laptops", "notebook", "notebooks", "macbook", "macbooks"] },
  { label: "tablets", categories: ["tablets"], phrases: ["tablet", "tablets", "ipad", "ipads"] },
  { label: "watches", categories: ["mens-watches", "womens-watches"], phrases: ["watch", "watches", "wristwatch", "wrist watch", "timepiece"] },
  { label: "shoes", categories: ["mens-shoes", "womens-shoes"], phrases: ["shoe", "shoes", "sneaker", "sneakers", "footwear", "trainers", "heels", "sandals", "running shoes"] },
  { label: "shirts", categories: ["mens-shirts"], phrases: ["shirt", "shirts", "t shirt", "t shirts", "tshirt", "tshirts", "tee", "tees"] },
  { label: "tops", categories: ["tops"], phrases: ["tops", "crop top", "blouse", "blouses"] },
  { label: "dresses", categories: ["womens-dresses"], phrases: ["dress", "dresses", "gown", "gowns", "frock"] },
  { label: "bags", categories: ["womens-bags"], phrases: ["bag", "bags", "handbag", "handbags", "purse", "purses", "backpack", "backpacks"] },
  { label: "jewellery", categories: ["womens-jewellery"], phrases: ["jewellery", "jewelry", "necklace", "necklaces", "earring", "earrings", "ring", "rings", "bracelet"] },
  { label: "sunglasses", categories: ["sunglasses"], phrases: ["sunglass", "sunglasses", "shades", "glasses", "eyewear"] },
  { label: "perfumes", categories: ["fragrances"], phrases: ["perfume", "perfumes", "fragrance", "fragrances", "cologne", "scent", "deodorant"] },
  { label: "makeup", categories: ["beauty"], phrases: ["makeup", "make up", "mascara", "lipstick", "nail polish", "cosmetics", "beauty", "eyeshadow", "foundation"] },
  { label: "skin care", categories: ["skin-care"], phrases: ["skincare", "skin care", "moisturizer", "moisturiser", "lotion", "serum", "sunscreen", "face wash"] },
  { label: "furniture", categories: ["furniture"], phrases: ["furniture", "sofa", "sofas", "bed", "beds", "chair", "chairs", "table", "tables", "couch"] },
  { label: "home decor", categories: ["home-decoration"], phrases: ["decor", "home decor", "decoration", "decorations", "lamp", "lamps", "vase", "showpiece"] },
  { label: "kitchen items", categories: ["kitchen-accessories"], phrases: ["kitchen", "kitchenware", "cookware", "utensils", "pan", "pans", "knife", "knives", "kitchen accessories"] },
  { label: "groceries", categories: ["groceries"], phrases: ["grocery", "groceries", "food", "fruits", "fruit", "vegetables", "snacks"] },
  { label: "sports gear", categories: ["sports-accessories"], phrases: ["sports", "sport", "sports gear", "sports accessories", "fitness", "ball", "balls"] },
  { label: "cricket gear", categories: ["sports-accessories"], keywords: ["cricket"], phrases: ["cricket", "cricket bat", "cricket gear"] },
  { label: "football gear", categories: ["sports-accessories"], keywords: ["football"], phrases: ["football", "soccer"] },
  { label: "tennis gear", categories: ["sports-accessories"], keywords: ["tennis"], phrases: ["tennis", "racket", "racquet"] },
  { label: "motorcycles", categories: ["motorcycle"], phrases: ["motorcycle", "motorcycles", "motorbike", "motorbikes", "bike", "bikes"] },
  { label: "cars", categories: ["vehicle"], phrases: ["car", "cars", "vehicle", "vehicles", "suv", "suvs"] },
];

export const COLORS = ["black", "white", "blue", "red", "green", "silver", "gold", "brown", "grey", "gray", "pink", "purple", "yellow", "orange"];

export const GENDER_WORDS = {
  men: ["men", "mens", "man", "male", "gents", "boys", "him"],
  women: ["women", "womens", "woman", "female", "ladies", "lady", "girls", "her"],
};

export const STARTER_PROMPTS = [
  "Show me smartphones under 30,000 rupees with good ratings",
  "Headphones under ₹5,000",
  "Best rated perfumes",
  "Women's bags between 2000 and 8000",
];

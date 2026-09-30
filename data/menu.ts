export const CATEGORIES = ["Starters", "Mains", "Desserts", "Beverages"] as const;

export type Category = (typeof CATEGORIES)[number];

export interface MenuItem {
  id: string;
  name: string;
  /** One-line summary shown on cards. */
  description: string;
  /** Longer copy for the item detail page. */
  longDescription: string;
  /** Price in Indian rupees (whole number). */
  price: number;
  category: Category;
  isVeg: boolean;
  image: string;
  featured?: boolean;
}

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1200&q=75`;

export const MENU: MenuItem[] = [
  // Starters
  {
    id: "crispy-samosa",
    name: "Crispy Samosa",
    description: "Flaky pastry filled with spiced potato and peas, with tamarind chutney.",
    longDescription:
      "Hand-folded pastry, fried until blistered and golden, packed with cumin-scented potatoes, green peas and a touch of fresh ginger. Served in pairs with sweet tamarind and bright mint-coriander chutneys.",
    price: 149,
    category: "Starters",
    isVeg: true,
    image: unsplash("photo-1601050690597-df0568f70950"),
    featured: true,
  },
  {
    id: "paneer-tikka",
    name: "Paneer Tikka",
    description: "Cottage cheese, peppers and onion charred in the tandoor.",
    longDescription:
      "Thick cubes of fresh paneer marinated overnight in hung curd, Kashmiri chilli and ajwain, skewered with bell peppers and red onion, then kissed by the tandoor's flame. Finished with chaat masala and a squeeze of lime.",
    price: 279,
    category: "Starters",
    isVeg: true,
    image: unsplash("photo-1567188040759-fb8a883dc6d8"),
  },
  {
    id: "tandoori-wings",
    name: "Tandoori Chicken Wings",
    description: "Smoky, yogurt-marinated wings with a mint dip.",
    longDescription:
      "Chicken wings marinated in yogurt, garlic and a house tandoori spice blend, roasted until the edges char and crisp. Served with a cooling mint and cucumber raita.",
    price: 329,
    category: "Starters",
    isVeg: false,
    image: unsplash("photo-1599487488170-d11ec9c172f0"),
  },
  {
    id: "tomato-basil-soup",
    name: "Roasted Tomato Basil Soup",
    description: "Slow-roasted tomatoes, garlic and basil, finished with cream.",
    longDescription:
      "Vine tomatoes and whole garlic roasted low and slow, blended silky smooth with fresh basil and a swirl of cream. Comes with a slice of toasted sourdough.",
    price: 189,
    category: "Starters",
    isVeg: true,
    image: unsplash("photo-1547592180-85f173990554"),
  },
  {
    id: "garden-greens-salad",
    name: "Garden Greens Salad",
    description: "Crisp greens, avocado, cherry tomatoes and citrus dressing.",
    longDescription:
      "A generous bowl of seasonal greens, ripe avocado, cherry tomatoes, cucumber and toasted seeds, tossed in a light orange-honey vinaigrette.",
    price: 229,
    category: "Starters",
    isVeg: true,
    image: unsplash("photo-1512621776951-a57141f2eefd"),
  },

  // Mains
  {
    id: "butter-chicken",
    name: "Butter Chicken",
    description: "Tandoori chicken simmered in a velvety tomato-butter gravy.",
    longDescription:
      "Our most-loved dish. Chargrilled chicken tikka folded into a slow-cooked gravy of tomatoes, butter, cream and kasuri methi, gently sweet and mildly spiced. Best with butter naan or jeera rice.",
    price: 449,
    category: "Mains",
    isVeg: false,
    image: unsplash("photo-1603894584373-5ac82b2ae398"),
    featured: true,
  },
  {
    id: "chicken-biryani",
    name: "Hyderabadi Chicken Biryani",
    description: "Fragrant basmati layered with spiced chicken, cooked dum-style.",
    longDescription:
      "Aged basmati rice and marinated chicken layered with fried onions, saffron milk and fresh mint, sealed and slow-cooked on dum. Served with burani raita and mirchi ka salan.",
    price: 399,
    category: "Mains",
    isVeg: false,
    image: unsplash("photo-1563379091339-03b21ab4a4f8"),
    featured: true,
  },
  {
    id: "paneer-butter-masala",
    name: "Paneer Butter Masala",
    description: "Soft paneer in a rich, mildly spiced tomato and cashew gravy.",
    longDescription:
      "Pillowy cubes of paneer in a smooth gravy of tomatoes, cashews and butter, finished with a drizzle of cream and crushed fenugreek leaves. Comforting, mellow and made for mopping up with naan.",
    price: 349,
    category: "Mains",
    isVeg: true,
    image: unsplash("photo-1631452180519-c014fe946bc7"),
  },
  {
    id: "masala-dosa",
    name: "Masala Dosa",
    description: "Golden rice-lentil crêpe with potato masala, sambar and chutney.",
    longDescription:
      "A thin, crisp dosa made from a slow-fermented rice and urad dal batter, wrapped around a mustard-seed and curry-leaf potato masala. Served with lentil sambar and fresh coconut chutney.",
    price: 219,
    category: "Mains",
    isVeg: true,
    image: unsplash("photo-1668236543090-82eba5ee5976"),
  },
  {
    id: "margherita-pizza",
    name: "Wood-fired Margherita",
    description: "San Marzano tomato, fresh mozzarella and basil on a blistered crust.",
    longDescription:
      "48-hour fermented dough stretched thin and baked hot, topped with crushed San Marzano tomatoes, torn fior di latte, fresh basil and a thread of olive oil.",
    price: 429,
    category: "Mains",
    isVeg: true,
    image: unsplash("photo-1574071318508-1cdbab80d002"),
  },
  {
    id: "grilled-chicken-burger",
    name: "Grilled Chicken Burger",
    description: "Herb-grilled chicken, slaw and chipotle mayo in a brioche bun.",
    longDescription:
      "Juicy herb-marinated chicken thigh grilled over high heat, layered with crunchy slaw, pickled onions and smoky chipotle mayo in a toasted brioche bun. Comes with a side of masala fries.",
    price: 379,
    category: "Mains",
    isVeg: false,
    image: unsplash("photo-1568901346375-23c9450c58cd"),
  },

  // Desserts
  {
    id: "chocolate-lava-cake",
    name: "Chocolate Lava Cake",
    description: "Warm dark-chocolate cake with a molten centre.",
    longDescription:
      "Baked to order with 70% dark chocolate so the centre stays molten. Dusted with cocoa and served with a scoop of vanilla bean ice cream.",
    price: 249,
    category: "Desserts",
    isVeg: true,
    image: unsplash("photo-1606313564200-e75d5e30476c"),
    featured: true,
  },
  {
    id: "tiramisu",
    name: "Classic Tiramisu",
    description: "Espresso-soaked savoiardi layered with mascarpone cream.",
    longDescription:
      "Ladyfingers dipped in freshly pulled espresso, layered with light whipped mascarpone and finished with a generous dusting of cocoa. Eggless and made in-house daily.",
    price: 299,
    category: "Desserts",
    isVeg: true,
    image: unsplash("photo-1571877227200-a0d98ea607e9"),
  },
  {
    id: "berry-parfait",
    name: "Berry Yogurt Parfait",
    description: "Greek yogurt, honey granola and fresh mixed berries.",
    longDescription:
      "Layers of thick Greek yogurt, crunchy honey-oat granola and a compote of seasonal berries. Light, bright and not too sweet.",
    price: 219,
    category: "Desserts",
    isVeg: true,
    image: unsplash("photo-1488477181946-6428a0291777"),
  },
  {
    id: "gulab-jamun",
    name: "Gulab Jamun",
    description: "Soft milk dumplings in cardamom and rose syrup.",
    longDescription:
      "Khoya dumplings fried slowly until deep golden, then soaked in a warm syrup scented with green cardamom and rose water. Served warm, two to a portion.",
    price: 149,
    category: "Desserts",
    isVeg: true,
    image: unsplash("photo-1666190092159-3171cf0fbb12"),
  },

  // Beverages
  {
    id: "masala-chai",
    name: "Masala Chai",
    description: "Assam tea brewed with milk, ginger and whole spices.",
    longDescription:
      "Strong Assam tea simmered with milk, fresh ginger, cardamom, cinnamon and cloves, the way it's made at home. Lightly sweetened; ask for no sugar in the order notes.",
    price: 79,
    category: "Beverages",
    isVeg: true,
    image: unsplash("photo-1571934811356-5cc061b6821f"),
  },
  {
    id: "cold-brew",
    name: "Cold Brew Coffee",
    description: "18-hour steeped coffee, smooth and low in acidity.",
    longDescription:
      "Single-origin Chikmagalur beans steeped cold for 18 hours for a smooth, chocolatey cup. Served over ice with milk on the side.",
    price: 169,
    category: "Beverages",
    isVeg: true,
    image: unsplash("photo-1461023058943-07fcbe16d735"),
  },
  {
    id: "fresh-lime-soda",
    name: "Fresh Lime Soda",
    description: "Freshly squeezed lime with soda — sweet, salted or both.",
    longDescription:
      "Hand-squeezed limes topped with chilled soda and a pinch of black salt. Made sweet, salted or mixed — the perfect partner to anything spicy.",
    price: 99,
    category: "Beverages",
    isVeg: true,
    image: unsplash("photo-1556679343-c7306c1976bc"),
  },
  {
    id: "mango-lassi",
    name: "Mango Lassi",
    description: "Alphonso mango blended with chilled yogurt and cardamom.",
    longDescription:
      "Ripe Alphonso mango pulp blended with thick, chilled yogurt and a hint of cardamom. Creamy, cooling and just sweet enough.",
    price: 139,
    category: "Beverages",
    isVeg: true,
    image: unsplash("photo-1553530666-ba11a7da3888"),
  },
];

export function getMenuItem(id: string): MenuItem | undefined {
  return MENU.find((item) => item.id === id);
}

export const FEATURED_ITEMS = MENU.filter((item) => item.featured);

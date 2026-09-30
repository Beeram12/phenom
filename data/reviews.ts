export interface Review {
  id: string;
  itemId: string;
  name: string;
  rating: number;
  comment: string;
  /** ISO date string */
  createdAt: string;
}

/** A small set of starter reviews so ratings aren't empty on first visit. */
export const SEED_REVIEWS: Review[] = [
  r(
    "crispy-samosa",
    "Ananya",
    5,
    "Perfectly crisp and not greasy at all. The tamarind chutney is lovely.",
    "2026-08-14",
  ),
  r("crispy-samosa", "Rohit", 4, "Great filling, would love a little more spice.", "2026-09-02"),
  r(
    "paneer-tikka",
    "Meera",
    5,
    "Soft paneer with real tandoor smokiness. Ordering again.",
    "2026-08-21",
  ),
  r("paneer-tikka", "Karan", 4, "Generous portion and well marinated.", "2026-09-10"),
  r("tandoori-wings", "Arjun", 4, "Smoky and juicy. The mint dip is a nice touch.", "2026-08-30"),
  r(
    "tomato-basil-soup",
    "Priya",
    5,
    "Tastes homemade. The sourdough was still warm when it arrived.",
    "2026-09-05",
  ),
  r(
    "garden-greens-salad",
    "Sneha",
    4,
    "Fresh and light, dressing is on the side which I appreciated.",
    "2026-08-11",
  ),
  r(
    "butter-chicken",
    "Vikram",
    5,
    "Best butter chicken in town — silky gravy and properly charred chicken.",
    "2026-08-19",
  ),
  r("butter-chicken", "Fatima", 5, "Rich but not heavy. My go-to comfort order.", "2026-09-12"),
  r("butter-chicken", "Dev", 4, "Delicious, slightly on the sweeter side.", "2026-09-20"),
  r(
    "chicken-biryani",
    "Imran",
    5,
    "Fragrant rice, tender chicken and the salan is spot on.",
    "2026-08-25",
  ),
  r(
    "chicken-biryani",
    "Lakshmi",
    4,
    "Very good biryani, portion is easily enough for two.",
    "2026-09-15",
  ),
  r("paneer-butter-masala", "Neha", 5, "Creamy and mellow — my kids loved it.", "2026-09-01"),
  r("masala-dosa", "Suresh", 4, "Crisp dosa, sambar had a lovely tang.", "2026-08-28"),
  r("margherita-pizza", "Aditi", 4, "Surprisingly good crust for delivery.", "2026-09-08"),
  r(
    "grilled-chicken-burger",
    "Rahul",
    4,
    "Juicy chicken and the chipotle mayo works well.",
    "2026-09-18",
  ),
  r("chocolate-lava-cake", "Ishita", 5, "Still molten when it arrived. Heaven.", "2026-08-16"),
  r(
    "chocolate-lava-cake",
    "Nikhil",
    5,
    "Rich dark chocolate, perfect with the ice cream.",
    "2026-09-22",
  ),
  r("tiramisu", "Sara", 4, "Light and not too sweet, good coffee flavour.", "2026-09-03"),
  r("gulab-jamun", "Pooja", 5, "Soft, warm and perfectly soaked.", "2026-09-09"),
  r("masala-chai", "Amit", 5, "Just like home. The ginger comes through nicely.", "2026-09-11"),
  r("cold-brew", "Tanvi", 4, "Smooth and strong, great value.", "2026-08-27"),
  r("mango-lassi", "Kabir", 5, "Thick, cold and full of real mango.", "2026-09-14"),
];

function r(itemId: string, name: string, rating: number, comment: string, date: string): Review {
  return {
    id: `seed-${itemId}-${name.toLowerCase()}`,
    itemId,
    name,
    rating,
    comment,
    createdAt: new Date(`${date}T12:00:00+05:30`).toISOString(),
  };
}

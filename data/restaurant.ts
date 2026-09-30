export const RESTAURANT = {
  name: "Saffron & Sage",
  tagline: "Slow-cooked comfort, delivered warm.",
  about:
    "We're a small neighbourhood kitchen cooking the food we grew up with — slow gravies, fresh breads and desserts made in-house every morning. Everything is prepared to order and packed to arrive the way it left our pass.",
  address: "14 Residency Road, Bengaluru 560025",
  phone: "+91 80 4000 1234",
  hours: [
    { days: "Monday – Friday", time: "11:30 am – 10:30 pm" },
    { days: "Saturday – Sunday", time: "11:00 am – 11:00 pm" },
  ],
  deliveryEta: "30–40 min",
} as const;

/** GST on restaurant food in India. */
export const TAX_RATE = 0.05;

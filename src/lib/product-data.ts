const IMG = "https://lh3.googleusercontent.com/aida-public/";

export type GalleryView = {
  label: string;
  ariaLabel: string;
  /** Image shown in the main stage when this view is selected. */
  image: string;
  thumb: string;
  alt: string;
};

export type ProductColor = { name: string; hex: string };

export type ProductSize = { size: string; lowStock?: boolean; soldOut?: boolean; left?: number };

export type ProductDetail = {
  slug: string;
  name: string;
  breadcrumbCategory: string;
  breadcrumbName: string;
  edition: string;
  workshop: string;
  eyebrow: string;
  rating: number;
  reviewCount: number;
  /** Price in PKR (after any discount). */
  price: number;
  compareAt?: number;
  discountPercent?: number;
  /** "N sold" (online orders + other channels). */
  sold?: number;
  badges: { label: string; className: string }[];
  gallery: GalleryView[];
  quote: string;
  certificate: string;
  colors: ProductColor[];
  defaultColor: string;
  sizes: ProductSize[];
  defaultSize: string;
  fitInsight: string;
  guarantees: { icon: string; title: string; text: string }[];
  specs: { label: string; value: string }[];
  care: string[];
  shipping: string[];
};

export const products: Record<string, ProductDetail> = {
  "aurelia-stiletto": {
    slug: "aurelia-stiletto",
    name: "The Aurelia Stiletto 95mm",
    breadcrumbCategory: "Heels",
    breadcrumbName: "The Aurelia 95mm",
    edition: "Edition 08/250",
    workshop: "Karachi Workshop No. 4",
    eyebrow: "Heels • Handmade in Karachi",
    rating: 4.9,
    reviewCount: 42,
    price: 151_200,
    badges: [
      { label: "Limited Edition", className: "bg-surface/90 backdrop-blur-md text-on-surface" },
      { label: "Pure Silk Satin", className: "bg-secondary-fixed text-on-secondary-fixed" },
    ],
    gallery: [
      {
        label: "01 Arch",
        ariaLabel: "View from the side",
        image: IMG + "AB6AXuBvAAt4DYPkH_UjSnLVrHX85zF59qHwUHiZrU8VQb70VwP_U8RdgULVgiL_eF9k5kNKu1BDk-_0Moj77SKRMT0zQed6w2-EK7ZNqKeJM0MyAKsTs14ug-tqoy3gCMfX0yVhjBKsuXqwPsaupzRAX35FgkJOUuIYJsrnvQ5Y6SsVTUAKHyLWyohpHw6ezvwYXSYZkaPkTkoQFD-unq8pGfMOt-U9m0Rx6b2tUYoZYCk",
        thumb: IMG + "AB6AXuC1Hgeu8zK77JYdYFH0zcfzpSW7gk42JSeg3UUlK7hCPOmorbmt203O8d7WI25J61ZqIcOMofgrSFBDy9lH35JCarUeR5Q2kx2dHKONt23OgrAgmfx3X2uPaV91VdDRnpzxCxXGEg0fH2owLN3yCf15FvVQIIRINCe2x-mmeQV-Y6siOguGDhF1O2gkVUddqAgnxmO-qxr_a1xWsHYYT_r0RuxK060DDg-nJDpWnjY",
        alt: "The Aurelia Stiletto 95mm in Champagne Gold Satin",
      },
      {
        label: "02 Styled",
        ariaLabel: "View on a model",
        image: IMG + "AB6AXuApIiwtaMb_juSJmTwjY0g_Ld3HhWfrELFd4XlpEAVzIvKXk2Y69Q-NehE3FUUJPOKM_-x823ZVfEocp3imSFrtNRZgGluh_r-Ol66W-2feOzEaT6cGoXoqTjHXDzduJhYAY53NhVlE6OnXVlrzIYc2JgSoov8r7t9bA-Sk4Mckr_gpEeF4ayW4qwXq5Kz0v1ZCptqe6vU--trYKZhz-ht8DgKeCgw0uc7o14qf5w0",
        thumb: IMG + "AB6AXuApIiwtaMb_juSJmTwjY0g_Ld3HhWfrELFd4XlpEAVzIvKXk2Y69Q-NehE3FUUJPOKM_-x823ZVfEocp3imSFrtNRZgGluh_r-Ol66W-2feOzEaT6cGoXoqTjHXDzduJhYAY53NhVlE6OnXVlrzIYc2JgSoov8r7t9bA-Sk4Mckr_gpEeF4ayW4qwXq5Kz0v1ZCptqe6vU--trYKZhz-ht8DgKeCgw0uc7o14qf5w0",
        alt: "Model wearing the Aurelia champagne stiletto with ivory silk palazzo trousers on terrazzo",
      },
      {
        label: "03 Sole",
        ariaLabel: "View the sole and buckle",
        image: IMG + "AB6AXuCpUsAUxHp2fxiAIKY5_jxK6utx2HLYLwPOQqq6a52PvVQ470_JxWoIcyy7QYxzzhZA5w6uDJ6vLse4WU8zyrEP-kdE4DvA5jm6s8cCnpurjRvochU6Mn3CL7C5g8rMfDxm4VOtx9ZhOwQwHqYQSaESTukSRxtp7sCo0iTJNkoLspPluc0DZA6pqTGb7Py5cUfKaeaw99zwUYZGatSgbRYEU8A6dx8VH34_WWKxE5A",
        thumb: IMG + "AB6AXuCpUsAUxHp2fxiAIKY5_jxK6utx2HLYLwPOQqq6a52PvVQ470_JxWoIcyy7QYxzzhZA5w6uDJ6vLse4WU8zyrEP-kdE4DvA5jm6s8cCnpurjRvochU6Mn3CL7C5g8rMfDxm4VOtx9ZhOwQwHqYQSaESTukSRxtp7sCo0iTJNkoLspPluc0DZA6pqTGb7Py5cUfKaeaw99zwUYZGatSgbRYEU8A6dx8VH34_WWKxE5A",
        alt: "Macro view of the hand-buffed leather sole with a gold Rose Atelier logo",
      },
      {
        label: "04 Vamp",
        ariaLabel: "View the front and straps",
        image: IMG + "AB6AXuBoNXB7G5icdvJCkAcHpT5-QXCkyO6ai991q4GOI0KHrucKCMI6df4hDs-yfEKAdfwk5slG6iQYhxj05yyaxj-Vyrq3dOkdGEFT-VR_RyJIXAzKLsk8--BmMXiaAn1J1ky0SjgV8181vbIpcXa06dQrFsseY4j_YT8J8MlUqxzkyyTfMNGfNbldabZcf19lbWAQWEUq1rFPojGUSY8KoQsXVI06E8Uegi66M2XLEVs",
        thumb: IMG + "AB6AXuBoNXB7G5icdvJCkAcHpT5-QXCkyO6ai991q4GOI0KHrucKCMI6df4hDs-yfEKAdfwk5slG6iQYhxj05yyaxj-Vyrq3dOkdGEFT-VR_RyJIXAzKLsk8--BmMXiaAn1J1ky0SjgV8181vbIpcXa06dQrFsseY4j_YT8J8MlUqxzkyyTfMNGfNbldabZcf19lbWAQWEUq1rFPojGUSY8KoQsXVI06E8Uegi66M2XLEVs",
        alt: "Top-down view of the open-toe vamp with crossover satin straps and gold buckle",
      },
    ],
    quote: "“Perfectly balanced. Made to look beautiful and feel comfortable.”",
    certificate: "Certificate of Origin No. 4192",
    colors: [
      { name: "Champagne Gold Satin", hex: "#E5D1B8" },
      { name: "Tuscan Noir Patent", hex: "#111111" },
      { name: "Muted Rose Suede", hex: "#C99D98" },
      { name: "Deep Espresso Calfskin", hex: "#2C1D18" },
    ],
    defaultColor: "Champagne Gold Satin",
    sizes: [
      { size: "35" },
      { size: "36" },
      { size: "36.5" },
      { size: "37" },
      { size: "37.5", lowStock: true },
      { size: "38" },
      { size: "38.5" },
      { size: "39" },
      { size: "40" },
      { size: "41" },
    ],
    defaultSize: "37.5",
    fitInsight:
      "Fits true to size. If you have wide feet, we suggest taking half a size bigger.",
    // Shown on every product page: keep to facts the business actually offers.
    guarantees: [
      { icon: "payments", title: "Cash on Delivery:", text: "Pay the courier in cash when your order arrives." },
      { icon: "local_shipping", title: "Delivery across Pakistan:", text: "Options and charges are shown at checkout." },
      { icon: "chat", title: "Need help choosing?", text: "Message us on WhatsApp before you order." },
    ],
    specs: [
      { label: "Heel Height", value: "95mm (3.74 inches)" },
      { label: "Upper Material", value: "100% silk satin" },
      { label: "Insole", value: "Soft two-layer memory foam" },
      { label: "Sole", value: "Hand-polished Italian leather" },
      { label: "Hardware", value: "Brass buckle with 24k gold coating" },
      { label: "Origin", value: "Handmade in Karachi, Pakistan" },
    ],
    care: [
      "Keep away from water, oil and rough surfaces. Clean satin gently with a soft, dry microfiber cloth.",
      "Keep each shoe in its Ŕose Atelier silk shoe bag, filled with tissue paper, so it keeps its shape.",
    ],
    shipping: [
      "We deliver across Pakistan. Delivery options, times and charges are shown at checkout before you place your order.",
      "Our team confirms every order and shares your courier tracking number. See Delivery & Returns for exchanges.",
    ],
  },
};

export const craftImage = IMG + "AB6AXuBSAQf0OAFNaWjaR9x27mWkbE0JIWEkvLBNYWBW_GRdaChN0DxQeKiQkZ0oAcS-trbEbEVZJIDybiqT3sijJKMlOjA3jpflDSaOABuRBmbpd5Albv9565tn2m_Tn55T_6wx6gAnmlQFl__1zY_9xN7ztVeHnIOVlPv5EP4Z-A3W5Njw89-92vq6W3p_x1tbO7iYfbSQdSxyw3OSNz42URcMnLg7HxRXF_n25yqWgSY";


/**
 * Women's size chart for the Pakistani market. Pakistani retailers label
 * women's shoes with UK-style numbers (EU 38 = size 5). Every EU size the
 * store sells (35–41) is listed.
 */
export const sizeChart = [
  { eu: "35", pk: "2", uk: "2.5", us: "5", cm: "22.5", inch: "8.9" },
  { eu: "36", pk: "3", uk: "3.5", us: "6", cm: "23.0", inch: "9.1" },
  { eu: "37", pk: "4", uk: "4", us: "6.5", cm: "23.5", inch: "9.3" },
  { eu: "38", pk: "5", uk: "5", us: "7.5", cm: "24.5", inch: "9.6" },
  { eu: "39", pk: "6", uk: "6", us: "8.5", cm: "25.0", inch: "9.8" },
  { eu: "40", pk: "7", uk: "6.5", us: "9", cm: "25.5", inch: "10.0" },
  { eu: "41", pk: "8", uk: "7.5", us: "10", cm: "26.5", inch: "10.4" },
];

/** "38" → "5" (Pakistani size for an EU size), or undefined. */
export const pkSize = (eu: string | number) => sizeChart.find((r) => r.eu === String(eu))?.pk;

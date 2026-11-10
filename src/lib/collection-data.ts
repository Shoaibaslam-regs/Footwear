const IMG = "https://lh3.googleusercontent.com/aida-public/";

export type CatalogProduct = {
  name: string;
  href?: string;
  badge?: string;
  badgeClass?: string;
  spec: string;
  tag: string;
  tagClass?: string;
  material: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  /** Full Tailwind class strings for the color dots. */
  swatches: string[];
  quickSizes: number[];
  quickSelected?: number;
  image: string;
  alt: string;
};

export const catalogProducts: CatalogProduct[] = [
  {
    name: "The Aurelia Stiletto",
    href: "/products/aurelia-stiletto",
    spec: "Sculptural Heel • 95mm",
    tag: "New Atelier",
    tagClass: "text-secondary font-medium",
    material: "Lustrous Champagne Satin",
    price: 151_200,
    swatches: ["bg-secondary-fixed", "bg-primary", "bg-surface-container-high"],
    quickSizes: [36, 37, 38, 39],
    quickSelected: 38,
    alt: "Stiletto sandal in luminous champagne silk satin with delicate ankle straps",
    image: IMG + "AB6AXuBidbJ3jZjKHL6vkXeEKF0dgj9HeAfCDtM7WFGzMxpSqaFGE0iiujlXv47HQ6VsngG30rF95rHxHqyaR-8yGiZadbJiSocZu2QJWy1nfHvANBbY46py8kSHu8WMIIoqgxg4fUXJUDY9VHix4r35OsZ3iuHmit5lPuR6LLF7at8u7luSaOZxJYK3p0vLpDNV5ChK6WQ4ARJmLtyYJQYBQk898-c3jD3Ye81KxxTCBxc",
  },
  {
    name: "Sienna Architectural Mule",
    badge: "Best Seller",
    badgeClass: "bg-primary text-on-primary",
    spec: "Midi Mule • 75mm",
    tag: "Low Stock",
    tagClass: "text-on-tertiary-container font-medium",
    material: "Espresso Calf Nappa",
    price: 134_400,
    swatches: ["bg-primary", "bg-secondary"],
    quickSizes: [36, 37, 38, 39],
    alt: "Espresso brown Italian nappa leather mule with a sculpted 75mm wooden heel",
    image: IMG + "AB6AXuBRg-Zdl3OTCL5wWUcKWsQH87k5fDBptfLx5iVHDje_B7DevXjpPLhd2v6Hk8_VkuLeqE6lXfAA_rjKUpKc8BneLGqoBggkcpmlnSxfaSF50RZ6meJCqAb2IB6jeCRduqy4gSflENdAbZlDZrHW-jRHcgqBkYx6NddnospDubQhbscCZjgbLnmIg_FofhJgPyW5ZjrFE64vNQJjnjgNaSOmScLdqjXMxiCD23DqUgA",
  },
  {
    name: "Genevieve Lace-Up Sandal",
    spec: "Artisan Flat • 15mm",
    tag: "Handmade",
    material: "Tuscan Burnished Tan",
    price: 142_800,
    swatches: ["bg-secondary", "bg-surface-container-highest"],
    quickSizes: [35, 37, 38, 40],
    alt: "Tuscan tan leather lace-up gladiator sandal",
    image: IMG + "AB6AXuDzryFFimdAMiB1HcS55pMeGCZDlJu-1iL6IhOCuNmuKF9Yuf2d2d4h84gVls-LGi6Hgb72cJR5lAr9rzPUlPnJKRBa2n9ljmfBMOJ-0LXwjaJgCeg9QM_V_PeIH7I2C_Qg0TEAA0aLoAsz47Rt9tgJCccm875fLvJc52bnHVKflQViPHLxP-3pqPHQQbZe_9a0kBuyJAZR3ilRWT2kA-wVYkDaa2HgpLghAXwRt7c",
  },
  {
    name: "Lumière Pearl Slingback",
    badge: "Bridal Suite",
    badgeClass: "bg-secondary-fixed text-on-secondary-fixed",
    spec: "Midi Slingback • 65mm",
    tag: "Couture",
    material: "Ivory Silk & River Pearl",
    price: 162_400,
    swatches: ["bg-surface-container-lowest border border-outline-variant", "bg-secondary-fixed"],
    quickSizes: [36, 37, 38, 39],
    alt: "Pointed-toe bridal slingback in ivory silk crepe with freshwater pearls",
    image: IMG + "AB6AXuCcZZrV7BXmm47zAzJojtXpbi8EBVJYBS5CP_lnTXY2R0xLMpMoe9VLGnx0nfB298UUDGqnMnCbyABBGbM-84avGypUDHdOI3GZgvCpBB1bmH50Kpx959U-7MJ0XXQfDjzKHGz-O0SDLx6lZU1sO2xm4x0yEy6UlBxvHENTVMRelyHpm_KhtEU1d9Xm2mzB0mzrEoWFBUc504z0YPof-_iXhack475An2NUXfT7kw4",
  },
  {
    name: "Vesper Minimalist Strap",
    spec: "High Heel • 90mm",
    tag: "Signature",
    material: "Noir Patent Calfskin",
    price: 138_600,
    swatches: ["bg-primary", "bg-on-tertiary-container"],
    quickSizes: [36, 37, 38, 39],
    alt: "Noir patent leather ankle strap evening stiletto",
    image: IMG + "AB6AXuDNK5w3xRDUt6wxtwtxW6Ws9jMdVWdseYRKHFaElAJC7-g6EAps5NPAx7vdhIpO0-opVuhEMn2dRAI0c9fCDN95YPTiVE1N4jmwcq2LoJD0gQnoBSrmaTor4T42z6x4f2DYuk0k352zYu5YWE2AtVj8yI2BSZ1wpsYI8WI7_YE_WW0XdA36A1f1iBhFPjTfDFox_5idOQ48FStuFd6tsQC_jPS9A2Lk3NG7RYDI74w",
  },
  {
    name: "Camille Woven Ballerina",
    spec: "Ballet Flat • 10mm",
    tag: "Daily Essential",
    material: "Hand-Woven Soft Beige Nappa",
    price: 120_400,
    swatches: ["bg-secondary-fixed", "bg-secondary", "bg-primary"],
    quickSizes: [36, 37, 38, 39],
    alt: "Hand-woven beige nappa leather square-toe ballerina flat",
    image: IMG + "AB6AXuCdrH7liENG1JYcdw9Oi1OVbvnV9KDkQDYOYptvz9NHk1yiHEn_kQishYyz71iexqq3dqJ-e5DXaP48lgYDgy2_IFnCDwwpd2WM8uNpO-yQK9_ZNiLWp-b96jNj05DcT5Fu151ZG51braC2p3zyT_10khzRPxqF8O85RmiAFphfxYvjYztKQmgn8iSmoLo2PP5DUhltqdUITdsyPR0P_HoXJdVPKJqqWYCurBLBFsM",
  },
  {
    name: "Olympia Sculpted Wedge",
    badge: "Limited Edition",
    badgeClass: "bg-tertiary-fixed text-on-tertiary-fixed",
    spec: "Wedge Heel • 80mm",
    tag: "Limited (100 Pairs)",
    material: "Champagne Metallic Foil",
    price: 145_600,
    swatches: ["bg-secondary-fixed", "bg-primary"],
    quickSizes: [36, 37, 38, 39],
    alt: "Sculptural wedge sandal in champagne metallic foil leather",
    image: IMG + "AB6AXuDhhjXQ-6ODs8BQ-b7qu6uxDlfep_7fKJ_bvcSOyir54zvgU1vg5e7_pkCtKPvwlNpzvY6LCNMetQK5FemxoZvszpudymjL8C-DkMmDWep7Fnkcv2TCT8WnkrDdOAKDXvlC_mVcjRtjkSFEDRAEYTE_1MjRUCtDPZk2feRWteklpWB8GwMzK2lIxNfrLY2d6gGMfBR0NcXXOgBEh44RrYzqrM0YtWmPCwk4xVXrXdY",
  },
  {
    name: "Elise Pointed Loafer",
    spec: "Loafer Flat • 20mm",
    tag: "Classic",
    material: "Deep Chocolate Suede",
    price: 128_800,
    swatches: ["bg-secondary", "bg-primary"],
    quickSizes: [36, 37, 38, 39],
    alt: "Pointed-toe loafer in deep chocolate velour suede with gold hardware",
    image: IMG + "AB6AXuBhYAVpsi7kH4vRZrvu8HOmL5MSA3iSf9BgAruz7I__2kkq8vVr8fD6deqp1KR1LSr2QJAfkiz6JNzgs-_kAYBD6XycU9qAJ2gvxNJ4idpjK9BJEySPMKl4v3259xkXW6cz5aoThseT77fsr-PJraFrEYthsIST_top7PZWgYAs-zCgpQwzkcPlZRdl7KXBybjK-eTSfLOjfu5G6cH2u2hLavHmimwNTJmDAW6-mQ0",
  },
];

export const assurances = [
  {
    icon: "published_with_changes",
    title: "Perfect Fit Promise",
    text: "Free size exchange within 30 days. Our courier picks up the pair from your door at no cost.",
  },
  {
    icon: "support_agent",
    title: "Personal Styling Help",
    text: "Talk to our shoe experts in Karachi on video call or chat. They help with sizing and choosing shoes for any event.",
  },
  {
    icon: "workspace_premium",
    title: "Made in Karachi",
    text: "Made in certified family workshops in Karachi, checked for eco-friendly practices.",
  },
];

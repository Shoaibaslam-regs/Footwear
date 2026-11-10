const IMG = "https://lh3.googleusercontent.com/aida-public/";


export const navLinks = [
  { label: "Shop", href: "/collections", activePrefixes: ["/collections", "/products"] },
  { label: "Collections", href: "/#collection" },
  { label: "New Arrivals", href: "/#new-arrivals" },
  { label: "Bridal", href: "/#appointment" },
  { label: "Our Story", href: "/#craft" },
];

/** Client concierge WhatsApp (Pakistan, 0314 842 8115). */
export const whatsappNumber = "923148428115";
export const whatsappUrl = `https://wa.me/${whatsappNumber}`;

export const heroImage =
  IMG +
  "AB6AXuCqFsZ6lySdyCTJlLxyQ6N-engD_vuD51yh_IRgWfK-iRekA_XUIm4_vhnBvI6j2z7IWMXWsXDqgNDFCF7wG5CoFzbkmdtoOQTIrnuXKvUPsP0LlZRw08DUhw8Tq8IqSY80njg5kypbcgKPYyzTPKZt9P2hYoRG7fhNJ1i_fJPygDSlM-1ijNT6S1U4zRSRIfcR_KNAz-6yPIL6lFR71s6BOPBdfvFliqeZvq9OtCI";

/** Homepage hero slideshow (first slide is the LCP image, loaded with priority). */
export const heroSlides = () => [
  {
    image: heroImage,
    alt: "Sculpted Italian stiletto heels in deep espresso patent leather with a champagne gold heel on a marble ledge",
    position: "center",
  },
  ...[0, 4, 1].map((i) => ({ image: categories[i].image, alt: categories[i].alt, position: "center" })),
  { image: campaignImage, alt: "Rose Atelier campaign photo", position: "center 30%" },
];

export type Category = {
  href: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string;
  alt: string;
  /** CSS object-position, so the shoes stay in view when a wide tile crops the photo. */
  position?: string;
  span: "lg:col-span-7" | "lg:col-span-5" | "lg:col-span-4";
  /** Tile height from tablet up (phones use compact tiles). */
  height: "md:h-[460px]" | "md:h-[380px]";
  large: boolean;
};

export const categories: Category[] = [
  {
    href: "/collections",
    eyebrow: "Our Signature",
    title: "Heels",
    subtitle: "Stilettos, Slingbacks & Block Heels",
    image: "/home/heels.jpeg",
    alt: "Tan leather pointed stiletto pumps on a white display shelf",
    position: "center 60%",
    span: "lg:col-span-7",
    height: "md:h-[460px]",
    large: true,
  },
  {
    href: "/collections",
    eyebrow: "For Summer",
    title: "Sandals",
    subtitle: "Strappy Sandals & Metallic Slides",
    image: "/home/sandals.jpeg",
    alt: "Woman wearing nude ankle-strap heeled sandals on a stone street",
    position: "center 82%",
    span: "lg:col-span-5",
    height: "md:h-[460px]",
    large: true,
  },
  {
    href: "/collections",
    eyebrow: "Easy & Comfortable",
    title: "Flats",
    subtitle: "Ballet Flats, Mules & Pointed Loafers",
    image: "/home/flats.jpeg",
    alt: "Cream knit pointed flats with a bow, on a soft beige blanket",
    position: "center 45%",
    span: "lg:col-span-4",
    height: "md:h-[380px]",
    large: false,
  },
  {
    href: "/collections",
    eyebrow: "Everyday Style",
    title: "Sneakers",
    subtitle: "Leather Sneakers & Fur-Lined Slip-ons",
    image: "/home/sneakers.jpeg",
    alt: "Cream leather sneakers with beige stripes and a gum sole",
    position: "center 55%",
    span: "lg:col-span-4",
    height: "md:h-[380px]",
    large: false,
  },
  {
    href: "/collections",
    eyebrow: "For Weddings",
    title: "Bridal Shoes",
    subtitle: "Ivory Satin & Pearl Details",
    image: "/home/bridal.jpeg",
    alt: "Ivory bridal sandals with pearl and crystal straps, beside a matching clutch",
    position: "center 62%",
    span: "lg:col-span-4",
    height: "md:h-[380px]",
    large: false,
  },
];

export type Product = {
  name: string;
  href?: string;
  shortName: string;
  badge: string;
  badgeClass: string;
  spec: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  material: string;
  image: string;
  alt: string;
  swatches: { color: string; title: string }[];
  moreColors: string;
};

export const newArrivals: Product[] = [
  {
    name: "The Aurelia Stiletto",
    href: "/products/aurelia-stiletto",
    shortName: "Aurelia Stiletto",
    badge: "New In",
    badgeClass: "bg-primary text-on-primary",
    spec: "95mm Heel",
    price: 151_200,
    material: "Cashmere Rose & Espresso Nappa",
    image:
      IMG +
      "AB6AXuByA2YLIcicJEiarS4jzQr7w-s0JzSxRKLaN0gF_IVu7c4kz_4r4QKQsxdA7gGKsadWnMGgJSszsKTV9BXJyUNodRfoe3iLlsKt3TLxDHN1l_ZlAZEhFApMlYdmfUq0wTrx2fbeCsCMAjCMRiDQxPaYKsN4sXklnII0WE3FUliIJuyg_YRcXT0rAd0OJlJ3_7-jk9JCQ3dLcwE84nnJXs3We9DHLjad1sMJ1JfDzSU",
    alt: "The Aurelia Stiletto 95mm in cashmere rose calf leather with espresso trim",
    swatches: [
      { color: "#D4A39D", title: "Cashmere Rose" },
      { color: "#211B19", title: "Espresso" },
      { color: "#D8C2A5", title: "Champagne Gold" },
    ],
    moreColors: "+2 colors",
  },
  {
    name: "Seraphina Silk Knot Mule",
    shortName: "Seraphina Mule",
    badge: "Atelier Knot",
    badgeClass: "bg-secondary text-on-secondary",
    spec: "65mm Kitten Heel",
    price: 128_800,
    material: "Champagne Gold Silk Crepe",
    image:
      IMG +
      "AB6AXuBmiDzl67Ae8jWoCc7Rnzv2zFyCUav0vtpAqwY1Eu2TQJVWz1ty-MN9Jx3J2UvoGuAzyqnQp4QTq_zbYDaJ3G5jf81GADymnPvfWTY5NdNT1LNah1KogbW7UVEFLEJ2EkiwtjSI_YmqsRWQ2loaTkFQXI4yBs9yI5Na_gmD7UDUJEKispZZwrlEjQNOEy13kBiBhm-GV18JSqK2mMcwtaW93hQFL5B9oK8sPpQGGWQ",
    alt: "Seraphina Silk Knot Mule in champagne gold woven Italian silk satin",
    swatches: [
      { color: "#E5D2BA", title: "Champagne Gold" },
      { color: "#030101", title: "Onyx Black" },
      { color: "#F5EDE3", title: "Ivory Cream" },
    ],
    moreColors: "+1 color",
  },
  {
    name: "Paloma Sculpted Slingback",
    shortName: "Paloma Slingback",
    badge: "Limited Edition",
    badgeClass: "bg-tertiary-container text-tertiary-fixed",
    spec: "75mm Angled Heel",
    price: 142_800,
    material: "Tuscan Noir Gloss Patent",
    image:
      IMG +
      "AB6AXuA30UJh4mYHQx4YY9s7tJ14ahyRa5H33lzUiDVyPqTpK2O4_KmLa-0qYiM7q4m_WRj4d7nMbqpjJbXB6ed28PFuWq2tYW9pNIesa09dkCiDhR-R_1q-GqbEx7D6ytDwWSnuMmCykw70fwDCCHpRJz4uXVC1pjx8WU_6_g2piio9A69RuIgOHRNB9T7qjH9uvfroB0WO91EdVVvvhTsq9JpgGCoIQ0EV4WyaauBeVpg",
    alt: "Paloma Sculpted Point-Toe Slingback in Tuscan Noir patent leather",
    swatches: [
      { color: "#1b1c1a", title: "Tuscan Noir" },
      { color: "#7B2E2E", title: "Barolo Red" },
    ],
    moreColors: "2 colors",
  },
  {
    name: "Celeste Satin Ballerina",
    shortName: "Celeste Ballerina",
    badge: "Trending",
    badgeClass: "bg-secondary-fixed text-on-secondary-fixed",
    spec: "15mm Micro-Heel",
    price: 117_600,
    material: "Ivory Pearl & Grosgrain Ribbon",
    image:
      IMG +
      "AB6AXuDsC1tA9hBFypHBRHjKhxKr8KsnDWwSGWsXJLk9RyANFw-dnfDJ3aSjlfG5xZl1b4YrUdjMuWUXr-bTPouB2NiLB2roYZgB-Sqvx8NuGUWcelAf0HGygDEhnkR3mKHQ1k0WIgfPqjXwtvGUHmy4g6PbZ0s5LaWm0dW0yvp585QpxXfxhMeuc_n3ObNq3ejOzSycwpZpv1-BLe0V1IahAGHHmhHfbqDH_5-OTiF6mDQ",
    alt: "Celeste Satin Ribbon Ballerina in ivory pearl duchess satin",
    swatches: [
      { color: "#FAF5EE", title: "Ivory Pearl" },
      { color: "#DBC6B6", title: "Nude Blush" },
      { color: "#201A18", title: "Midnight Black" },
    ],
    moreColors: "+3 colors",
  },
];

export type BestSeller = {
  name: string;
  shortName: string;
  badge: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  detail: string;
  image: string;
  alt: string;
  defaultSize: number;
  soldOut: number[];
};

export const sizes = [35, 36, 37, 38, 39, 40, 41];

export const bestSellers: BestSeller[] = [
  {
    name: "Valeria Sculpted Mule",
    shortName: "Valeria Mule",
    badge: "#1 Best Seller",
    price: 137_200,
    detail: "Chocolate Tuscan Suede • 80mm",
    image:
      IMG +
      "AB6AXuAo1YnU2UahAucT2hgEAl8xOwp6v1fE4ZE8ljwFEdaTD4QVLmANq-DA4xBzIaMinZaGhH3eNPxeHoLeMLkzwVaka5U7mthZPNN-0xna6v5TKYrhG_1VEIZcWoEcPfHRcL9Neq_wD_ulzfAp7cRNAYL-Tn0xqmhV41hiIugOEepJvmn4-m5qltEOCZ-rsiTzTNZbUYDBHYTcYQ4jfoNx27hhEisyMFg4aVxMd7iEB1U",
    alt: "Valeria Architectural Mule in sculpted chocolate suede with brushed bronze heel",
    defaultSize: 37,
    soldOut: [41],
  },
  {
    name: "Genevieve Ankle Pump",
    shortName: "Genevieve Pump",
    badge: "Restocked",
    price: 156_800,
    detail: "Noir Polished Calfskin • 100mm",
    image:
      IMG +
      "AB6AXuDS7VFTtveMwWYy0Dp5Lu9hVZ6Zk1_vEk2nyi1pHIfggbElckc1qmseMxs3GXzBoQpZ-57wSRavsPeDf4O_M0qCvGKAv1kKH3KpTE_Bm2tHlWgqEaXJL-WDWkaep6z5IGIbdmeqJr0CB0K0oOHF_uy6QgTUBVGaoDeFOU09sCEG6f3IVG-il7E2wvfKjxiqOdnBlaiX03UvVQ_UGIMiFh2CJ65QNLWowdzrGdw-42U",
    alt: "Genevieve Ankle-Strap Pump in black Italian boxcalf with thin gold ankle wrap",
    defaultSize: 38,
    soldOut: [],
  },
  {
    name: "Lucia Crossover Slide",
    shortName: "Lucia Slide",
    badge: "Classic",
    price: 106_400,
    detail: "Cognac Vegetable Nappa • 10mm",
    image:
      IMG +
      "AB6AXuDigb8J6EBAinPrgPurmp9HusS9VG-kASVHgkEulfUbvhOPX9YAeO5HCSi2WPClQqu0B3nq3fST-DTqGn7s8L5Rr2PHBPT7k3EXmkUkOSP_xIm89tl7e7aHTyYTZmJu37vM031rxN8ufDuW3lEXHC6rgBmrOWgOLsDT3RITlXznhKHvAMHRrG9lRpm-3Bat1uKQpgghWzvVMmhdvWzUY_j7le4UaQFIBVSFBGz0aco",
    alt: "Lucia Crossover Flat Slide in warm cognac calf nappa leather",
    defaultSize: 39,
    soldOut: [],
  },
];

export const craftPillars = [
  {
    icon: "hourglass_top",
    eyebrow: "Careful Work",
    title: "60 Hours to Make Each Pair",
    text: "Each pair rests on a custom wooden shoe mould for 48 hours so it keeps its shape. Our master shoemakers then finish it by hand in 210 steps.",
  },
  {
    icon: "pan_tool_alt",
    eyebrow: "Fine Italian Leather",
    title: "Hand-Picked Leather & Silk",
    text: "Top-quality full-grain leather from checked Italian tanneries, finished with natural plant oils. It feels soft from day one and looks better with age.",
  },
  {
    icon: "accessibility_new",
    eyebrow: "All-Day Comfort",
    title: "Memory Foam Arch Support",
    text: "Our special two-layer foam insole supports the front of your foot and your heel. It absorbs 70% of the impact when you walk, without changing the shoe's shape.",
  },
];

export const socialTiles = [
  {
    image:
      IMG +
      "AB6AXuCK-hOOiop4B7_5L786bD9PzyLgW8JxKXgPCFBhgDK5nXOTJpIaq_sJJksjQSRhIkMJut7h3y3jg7FkRyrVq4lMtMLrjwoJtcEf7oAFh0yoOluOkbq8nyPcgI11gRxsJaO6bNh3qxeiGyHrKAii2zjdK5uvPyB6Q_MJKBhcSvPc28a9c8eIlNJa6MmOQ3VKAir0LJhn2-BAlwopQ319NC3gCkUW2POojdsmjuAToVE",
    alt: "Woman in beige trousers and Rose Atelier black stiletto mules at a café",
  },
  {
    image:
      IMG +
      "AB6AXuAmCpNZFCIT0tZutBjqf8i4h4aByQp9PKs4rMvpbwUOM9wD8VDvMxNAO8bAwNNGZm0x1LXahWU0lAQGxr-FAhVUNw9SoM8ASbF5E_OI2RJZTQwU2a5bEe7gpFMhm4oultUjoNvhDiKUacVlCOxVCzow8vKZ7BT0KIVrfRnmiVEayncaLrKFyRUjiw0-fcZbiiLleBwI7DdHaUcQu8MaKVehkPshrputGC401D9lqmU",
    alt: "A shoemaker's hands trimming fine leather in our workshop",
  },
  {
    image:
      IMG +
      "AB6AXuCryA3Ivun2dLD5IlRIedNGApJcnfZiMOttUMURDJ75Pbc1Ht74qw-fD1FSnpdUflCabMhPq_5Sr0qAGm9CLbFX_YwrFnBM8IekgdunV4fJwUsM-uZuQGr7ZI2S2HZgUlN9B9vueIoh98QLqL74XE0A6ILUNWYnbWlH6C6YwtTa0VQhKcoXLC1B8ob5gfP-IAnAozm1QMryM-Hs0Mg6nUhfOI_x7nMFLlb4S2-KKx8",
    alt: "Architectural heels on concrete steps at sunset",
  },
  {
    image:
      IMG +
      "AB6AXuBg110S19NPzR6zqO3toNP68p8NGnSNUMTaHE7JjR_KSkm6SKTqClX2jBAleSAsO2jDx2GXC-Eqa2x_VXRS6FGaWz0XrA_2UqTqRCwGzPJFIBnopC99nEg4Dgwi-xQL5yE3iu7t3eZOwadiL3rxrgOQimwIXoOknJkIt6GXGF3-xnrPnpj0a1EJfT5060GU2Bm5rjjFiAp9Y7CHog99Gp0WBfq9bsa5KX_yo6xDEhc",
    alt: "Champagne gold silk straps tied around an ankle on a terrace at sunset",
  },
  {
    image:
      IMG +
      "AB6AXuA5RDL2y3G9wehyhEkf6v0TsFc_6qaxL58Rd2UARf_mwd7oVl_p0NHWhqqkCuWujIA2ss6UHxwwRqy2Er_M8yIPODEFbu87cZMtOceqdaCjllilL7cdXOdkSmcLXV6OFDVnQVy8w9dweTwSDRRbWgnV_iF9xv6PYuVbcQfSgqjiiDbxsegFsmmfvjpuE30S6Gjiku4pl-rZkTuw_FZqabqpmAAWtv7JJr-srHADgYI",
    alt: "Rose Atelier ivory shoe box with golden logo and grosgrain ribbon on marble",
  },
];

export const campaignImage =
  IMG +
  "AB6AXuDypOkfVSSuEssKWhAmcTZTGbMWaYLAiNbX1rHVqqT07pPT3lcDr0cuh6CFrtnTLQzSKyoxun1HKAr8YAx0y5qM-YxGU_B2VEe0jAMep6OZeqBvKyP2OfsvT9t3O4j0n56DZSeL8CA68vycuj-RrvvE1K7oIfmhGhdx6TAh957-smH_DbDMmfPvemKWicm57kKZ6vCNSbfBHEJCMPi5-eWNhH9g8Jikq4dnLm6oo1Q";

/**
 * Footer links. `href` is omitted where the page doesn't exist yet;
 * those render as plain text instead of dead links.
 * `sizeGuide: true` opens the size & fit modal.
 */
export type FooterLink = { label: string; href?: string; sizeGuide?: boolean };

export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "About Ŕose Atelier",
    links: [
      { label: "Our Story", href: "/#craft" },
      { label: "Eco-Friendly Making", href: "/#craft" },
      { label: "Our Karachi Workshop", href: "/#craft" },
      { label: "In the News" },
    ],
  },
  {
    title: "Collections",
    links: [
      { label: "Heels", href: "/collections?category=heels" },
      { label: "Sandals", href: "/collections?category=sandals" },
      { label: "Flats & Loafers", href: "/collections?category=flats" },
      { label: "Bridal & Party", href: "/collections?category=bridal" },
    ],
  },
  {
    title: "Customer Help",
    links: [
      { label: "Personal Styling", href: "/#appointment" },
      { label: "Delivery & Returns", href: "/policies/shipping-returns" },
      { label: "Size & Fit Guide", sizeGuide: true },
      { label: "Track Your Order", href: "/account" },
      { label: "Contact Us (WhatsApp)", href: "https://wa.me/923148428115" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/policies/terms" },
      { label: "Privacy Policy", href: "/policies/privacy" },
      { label: "Cookie Settings" },
      { label: "Accessibility" },
    ],
  },
];

export type CartItem = {
  id: string;
  href?: string;
  badge: string;
  collection: string;
  name: string;
  /** Shorter name used in the flyout drawer. */
  drawerName: string;
  /** Unit price in PKR. */
  price: number;
  material: string;
  size: string;
  color: string;
  /** Color name shown in the flyout drawer. */
  drawerColor: string;
  colorDot: string;
  profile: string;
  stockNote: string;
  stockNoteClass: string;
  stockDotClass: string;
  packaging: { title: string; text: string };
  quantity: number;
  image: string;
  alt: string;
  thumb: string;
  thumbAlt: string;
};


export const reassurances = [
  { icon: "payments", text: "Cash on Delivery, EasyPaisa & JazzCash accepted" },
  { icon: "straighten", text: "Pakistani size guide on every product" },
  { icon: "chat", text: "Help on WhatsApp before and after you order" },
];

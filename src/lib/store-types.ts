/** Shapes shared by the client store and the server cart (no runtime code). */

/** Minimal product info needed to put a piece in the bag. */
export type BagProduct = {
  /** Product slug. */
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  /** "EU 38" */
  size: string;
  color?: string;
  href?: string;
  collection?: string;
  material?: string;
};

export type WishItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  alt: string;
  href?: string;
  detail?: string;
};

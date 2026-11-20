/**
 * Backgrounds for the home page's hanging plaque (owner, 2026-11-20), chosen
 * per sale and per greeting. Themes are soft textures drawn in CSS (no images);
 * solid colours keep the faint damask. Each one sets its own readable text
 * colours (globals.css `.sale-plaque[data-bg]`). The 12.12 mini plaque takes
 * the sale's background in simplified form (colours only); the percent chip
 * always stays champagne.
 */
export const PLAQUE_BACKGROUNDS = [
  "black",
  "ice",
  "summer",
  "autumn",
  "spring",
  "night",
  "marble",
  "emerald",
  "midnight",
  "burgundy",
  "crimson",
  "ivory",
] as const;
export type PlaqueBg = (typeof PLAQUE_BACKGROUNDS)[number];

export const plaqueBgLabel: Record<PlaqueBg, string> = {
  black: "Black (classic)",
  ice: "Solid Ice (frosted blue, navy text)",
  summer: "Hot Summer (sunset glow)",
  autumn: "Autumn (burnt orange)",
  spring: "Spring Blossom (soft pink)",
  night: "Night Sky (midnight with stars)",
  marble: "Marble (white with veins)",
  emerald: "Emerald",
  midnight: "Midnight blue",
  burgundy: "Burgundy",
  crimson: "Deep crimson",
  ivory: "Ivory",
};

export const isPlaqueBg = (v: unknown): v is PlaqueBg => typeof v === "string" && (PLAQUE_BACKGROUNDS as readonly string[]).includes(v);

/** Frame finishes: the frame, ropes, fleurs, crest, scroll edge and 12.12 tags (globals.css [data-frame]). */
export const PLAQUE_FRAMES = ["gold", "frost", "rosegold", "bronze", "platinum"] as const;
export type PlaqueFrame = (typeof PLAQUE_FRAMES)[number];

export const plaqueFrameLabel: Record<PlaqueFrame, string> = {
  gold: "Gold (classic)",
  frost: "Frost silver (for Solid Ice and winter)",
  rosegold: "Rose gold (for spring and bridal)",
  bronze: "Bronze (for autumn)",
  platinum: "Platinum (for marble and ivory)",
};

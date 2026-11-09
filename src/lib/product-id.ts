/** Stable id for a product: its URL slug when it has a page, else its name. */
export function productId(name: string, href?: string): string {
  if (href) return href.split("/").filter(Boolean).pop()!;
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

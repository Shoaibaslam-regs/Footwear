export const currencies = ["PKR", "USD", "EUR"] as const;
export type Currency = (typeof currencies)[number];

/**
 * Indicative display rates: 1 unit of the currency = N PKR.
 * Catalog prices are stored in PKR; orders settle in PKR.
 */
const pkrPerUnit: Record<Currency, number> = {
  PKR: 1,
  USD: 280,
  EUR: 302,
};

/** Formats a PKR amount in the chosen currency, e.g. 151200 → "USD 540". */
export function formatPrice(amountPKR: number, currency: Currency): string {
  const value = Math.round(amountPKR / pkrPerUnit[currency]);
  return `${currency} ${value.toLocaleString("en-US")}`;
}

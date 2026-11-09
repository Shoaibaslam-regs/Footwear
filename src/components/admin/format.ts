export const pkr = (n: number) => `PKR ${n.toLocaleString("en-US")}`;
export const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

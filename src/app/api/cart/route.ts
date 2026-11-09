import { getCurrentUser } from "@/lib/auth/dal";
import { getAccountCart, EMPTY_CART } from "@/lib/server/carts";

/** The signed-in client's bag and wishlist (empty when signed out). */
export async function GET() {
  const user = await getCurrentUser();
  const cart = user ? await getAccountCart(user.id) : EMPTY_CART;
  return Response.json({ ...cart, signedIn: !!user }, { headers: { "Cache-Control": "private, no-store" } });
}

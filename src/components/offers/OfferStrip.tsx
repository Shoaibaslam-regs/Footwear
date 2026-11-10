import { getCurrentUser } from "@/lib/auth/dal";
import { publicCouponsFor } from "@/lib/server/coupons";
import OfferStripView from "./OfferStripView";

/** Server wrapper for the bag page (must sit inside <Suspense>: it reads the session). */
export default async function OfferStrip() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <OfferStripView offers={await publicCouponsFor(user.id)} />;
}

import type { PolicySlug } from "./site";

/**
 * The store's policy pages, written from how the shop really works (owner's
 * answers, 2026-11-18: exchanges or returns within 14 days of delivery; the
 * customer pays exchange delivery unless the pair was wrong or damaged;
 * exchange or refund; sale items follow the same rules).
 *
 * Shown when a policy is left empty in Admin → Settings, and prefilled there,
 * so the owner can edit it. Format: a line starting "## " is a heading, lines
 * starting "- " are a list, a blank line starts a new paragraph.
 * Keep it true: no promises the shop doesn't make (no refund deadline, no courier name).
 */
export const DEFAULT_POLICIES: Record<PolicySlug, string> = {
  "shipping-returns": `We want your new shoes to arrive safely and fit well. Here is how delivery, exchanges and returns work at R'ose Atelier.

## Delivery
- We deliver across Pakistan through a courier partner.
- Delivery times and fees for each option are shown above and at checkout.
- You pay in cash when the parcel arrives (Cash on Delivery). Please keep the exact amount ready if you can.

## Confirming your order
After you place an order, we call or message you on WhatsApp to confirm it before it ships. If we can't reach you, we may cancel the order. Please make sure your phone number is correct.

When your order is on its way, we email you the tracking number. You can also follow your order any time from your account, under My Orders.

## Exchanges and returns
You can ask to exchange or return a pair within 14 days of delivery. This includes pairs bought during a sale.

To be exchanged or returned, the shoes must be:
- unworn outdoors, with clean soles and no marks
- in their original box, with everything that came with them

## How to ask
Message us on WhatsApp at 0314 8428115 with your order number and the pair you want to exchange or return. We'll tell you how to send it back.

## Exchange or refund
- Exchange: we send you another size, or another pair. If the new pair costs more, you pay the difference; if it costs less, we refund the difference.
- Refund: once we receive and check the pair, we send the money back by bank transfer, EasyPaisa or JazzCash.

## Delivery costs for exchanges and returns
You pay the courier cost of sending the pair back to us, and the cost of sending a new pair to you.

If we sent the wrong pair, or the pair arrived damaged, we cover all delivery costs. Please message us within 48 hours of delivery with a photo, so we can put it right quickly.

## Cancelling an order
- While your order is still Pending, you can cancel it yourself from your order page.
- After that, message us on WhatsApp and we'll help if the order hasn't shipped yet.`,

  terms: `These terms explain how buying from R'ose Atelier works. By placing an order, you agree to them.

## About us
R'ose Atelier is a women's footwear store based in Karachi, Pakistan. You can reach us on WhatsApp at 0314 8428115, or by replying to any email from us.

## Your account
You need an account to add shoes to your bag and to place an order. Please keep your password private, and use your own email address and phone number.

## Prices and payment
- All prices are in Pakistani Rupees (PKR) and include tax.
- If you choose to view prices in another currency, it is only a guide. You always pay in PKR.
- Payment is Cash on Delivery: you pay the courier when your parcel arrives.

## Orders
- Your order is placed when you see the thank-you page. We then call or message you to confirm it.
- We may cancel an order we can't confirm, or one that looks incorrect or fraudulent.
- Very rarely, a pair may sell out after you order it. If that happens, we'll contact you to offer another pair or cancel that item.

## Sales and coupons
- During a sale, the sale price applies only while the sale is running. When it ends, prices go back to normal.
- If a shoe already has its own discount, you get whichever discount is bigger, not both.
- One coupon can be used per order. A coupon may have its own rules, such as a minimum order, an end date, or one use per customer or phone number.
- Coupons have no cash value and can't be exchanged for money.

## Delivery, exchanges and returns
See our Delivery & Returns page for delivery times, exchanges, returns and refunds.

## Product photos
We photograph our shoes as accurately as we can, but colours may look slightly different on different screens.

## Reviews
Reviews must be honest and about the product. We may remove reviews that are offensive or not genuine. A "Verified purchase" badge means the reviewer bought and received that shoe from us.

## Changes
We may update these terms from time to time. The version on this page is the one that applies to your order.`,

  privacy: `This page explains what information R'ose Atelier keeps about you, why, and what you can ask us to do with it.

## What we keep
- Your name, email address and phone number
- Your delivery address (we save your last one to fill in your next checkout)
- Your orders, your bag and your wishlist
- Reviews you write, and any photos you add to them

We never ask for or keep card numbers, wallet PINs or one-time passwords. You pay in cash on delivery.

## Why we use it
- To deliver your orders, and to call or message you to confirm them
- To send you the code that confirms your email when you sign up, the email when your order is on its way, and password reset emails
- To let you know when a size is back in stock, but only if you asked us to
- To keep your account, bag and wishlist ready for you

We don't send marketing emails without your agreement, and we never sell your information.

## Who else sees it
- Our courier partner receives your name, phone number and delivery address to deliver your parcel.
- Our email service sends our emails to you.
- The companies that host our website and store our data keep it on our behalf.

They only use your information to do this work for us.

## Cookies and your device
- We use one cookie to keep you logged in.
- Your browser also remembers a few things on your own device: the currency you chose, the shoes you looked at recently, and coupon cards you have already revealed.

## Your choices
You can update your details in your account at any time. To correct something else, or to ask us to delete your account, message us on WhatsApp at 0314 8428115. We keep records of past orders where we need them for our accounts.

## Changes
If we change how we use your information, we will update this page.`,
};

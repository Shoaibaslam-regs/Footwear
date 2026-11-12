import "server-only";
import { headers } from "next/headers";
import nodemailer, { type Transporter } from "nodemailer";
import { etaSentence, orderStatusLabel, paymentMethodLabel, type Order } from "../orders";

/**
 * Optional email. Configure in .env to switch on:
 *   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, MAIL_FROM
 *   SITE_URL (public address used in links, e.g. https://elora.pk)
 * Without them every send is skipped: the site keeps working, and admins
 * use the WhatsApp buttons instead.
 */
/** The SMTP password; `SMTP_KEY` is accepted too (Brevo calls it an "SMTP key"). */
const smtpPassword = () => process.env.SMTP_PASS || process.env.SMTP_KEY;

export const mailConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && smtpPassword() && process.env.MAIL_FROM);

let transport: Transporter | undefined;
function transporter() {
  transport ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: { user: process.env.SMTP_USER, pass: smtpPassword() },
  });
  return transport;
}

/** Public origin for links: SITE_URL, else the current request's host. */
export async function siteUrl(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, lines: string[], cta?: { label: string; href: string }, code?: string) {
  const big = code
    ? `<p style="margin:8px 0 24px;font-family:'Courier New',monospace;font-size:34px;letter-spacing:.35em;font-weight:700;color:#030101">${escape(code)}</p>`
    : "";
  const body = big + lines.map((l) => `<p style="margin:0 0 12px">${escape(l)}</p>`).join("");
  const button = cta
    ? `<p style="margin:24px 0"><a href="${escape(cta.href)}" style="background:#030101;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:.12em;text-transform:uppercase">${escape(cta.label)}</a></p>`
    : "";
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:auto;color:#1b1c1a;line-height:1.55">
<p style="letter-spacing:.3em;font-size:14px;margin:0 0 24px">ŔOSE ATELIER</p>
<h1 style="font-weight:400;font-size:24px;margin:0 0 16px">${escape(title)}</h1>${body}${button}
<p style="color:#807571;font-size:12px;margin-top:32px">Questions? Reply to this email or message us on WhatsApp 0314 8428115.</p></div>`;
}

/**
 * Best-effort send; never throws (a failed email must not fail an order).
 * Returns whether it was handed to the mail server. `code` is shown large
 * at the top (one-time codes).
 */
export async function sendMail(to: string, subject: string, title: string, lines: string[], cta?: { label: string; href: string }, code?: string) {
  if (!mailConfigured()) return false;
  try {
    await transporter().sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject,
      text: [title, "", ...(code ? [code, ""] : []), ...lines, ...(cta ? ["", `${cta.label}: ${cta.href}`] : [])].join("\n"),
      html: layout(title, lines, cta, code),
    });
    return true;
  } catch (e) {
    console.error("Email failed", e);
    return false;
  }
}

/* ---------- Messages (email and WhatsApp share the wording) ---------- */

const pkr = (n: number) => `PKR ${n.toLocaleString("en-US")}`;

export function orderPlacedLines(o: Pick<Order, "number" | "items" | "total" | "delivery" | "payment" | "coupon">) {
  return [
    `Thank you for your order #${o.number}. Our team will confirm it shortly.`,
    ...o.items.map((i) => `• ${i.name} — EU ${i.size} × ${i.quantity}`),
    ...(o.coupon ? [`Coupon ${o.coupon.code}: you saved ${pkr(o.coupon.discount)}`] : []),
    `Total: ${pkr(o.total)} · ${o.delivery.name} · ${paymentMethodLabel(o.payment.method)}`,
  ];
}

export function statusLines(o: Pick<Order, "number" | "status" | "trackingNumber" | "eta">) {
  const lines = [`Your order #${o.number} is now: ${orderStatusLabel[o.status]}.`];
  if (o.eta && o.status !== "delivered" && o.status !== "cancelled") lines.push(etaSentence(o.eta));
  if (o.trackingNumber && (o.status === "shipped" || o.status === "out_for_delivery")) {
    lines.push(`Courier tracking number: ${o.trackingNumber}`);
  }
  if (o.status === "cancelled") lines.push("If you didn't ask for this, please contact us.");
  return lines;
}

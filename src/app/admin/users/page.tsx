import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { listUserInsights, type UserInsightRow } from "@/lib/server/insights";
import { date, pkr } from "@/components/admin/format";
import Pager, { pageOf } from "@/components/admin/Pager";
import UserActions from "@/components/admin/UserActions";

export const metadata = { title: "Users" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const ACTIVITY = [
  { value: "", label: "Everyone" },
  { value: "ordered", label: "Has ordered" },
  { value: "never", label: "Never ordered" },
  { value: "bag", label: "Pairs in bag" },
  { value: "wishlist", label: "Has a wishlist" },
] as const;

const SORTS = [
  { value: "", label: "Newest accounts" },
  { value: "oldest", label: "Oldest accounts" },
  { value: "spent", label: "Most spent" },
  { value: "orders", label: "Most orders" },
  { value: "recent", label: "Latest order" },
  { value: "name", label: "Name (A–Z)" },
] as const;

const sorters: Record<string, (a: UserInsightRow, b: UserInsightRow) => number> = {
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  spent: (a, b) => b.spent - a.spent,
  orders: (a, b) => b.orders - a.orders,
  recent: (a, b) => (b.lastOrderAt ?? "").localeCompare(a.lastOrderAt ?? ""),
  name: (a, b) => a.name.localeCompare(b.name),
};

async function AdminUsersContent({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const [all, sp] = await Promise.all([listUserInsights(), searchParams]);

  const q = one(sp.q)?.trim().toLowerCase() ?? "";
  const role = one(sp.role) === "admin" || one(sp.role) === "customer" ? one(sp.role) : "";
  const activity = ACTIVITY.find((a) => a.value === one(sp.activity))?.value ?? "";
  const sort = SORTS.find((s) => s.value === one(sp.sort))?.value ?? "";

  let rows = all.filter(
    (u) =>
      (!q || [u.name, u.email, u.phone ?? "", u.city ?? ""].some((f) => f.toLowerCase().includes(q))) &&
      (!role || u.role === role) &&
      (activity !== "ordered" || u.orders > 0) &&
      (activity !== "never" || u.orders === 0) &&
      (activity !== "bag" || u.bagPairs > 0) &&
      (activity !== "wishlist" || u.wishlist > 0),
  );
  if (sorters[sort]) rows = [...rows].sort(sorters[sort]);
  const { from, to } = pageOf(sp, rows.length);
  const shown = rows.slice(from, to);
  const filtered = Boolean(q || role || activity);

  const buyers = all.filter((u) => u.orders > 0);
  const summary = [
    { label: "Accounts", value: all.length.toLocaleString("en-US"), href: "/admin/users" },
    { label: "Have ordered", value: buyers.length.toLocaleString("en-US"), href: "/admin/users?activity=ordered" },
    { label: "Admins", value: all.filter((u) => u.role === "admin").length.toLocaleString("en-US"), href: "/admin/users?role=admin" },
    { label: "Pairs waiting in bags", value: all.reduce((n, u) => n + u.bagPairs, 0).toLocaleString("en-US"), href: "/admin/users?activity=bag" },
    {
      label: "Average spend per buyer",
      value: pkr(buyers.length ? Math.round(buyers.reduce((n, u) => n + u.spent, 0) / buyers.length) : 0),
      href: "/admin/users?activity=ordered&sort=spent",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Users</h1>
        <p className="muted">
          Every account, with what they have ordered and saved. Open someone to see their orders, bag, wishlist and reviews.
        </p>
      </div>
      {sp.error === "self" && (
        <p className="error" role="alert">
          You cannot change or delete your own account here.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {summary.map((s) => (
          <Link key={s.label} className="panel p-4 hover:border-[var(--color-outline)]" href={s.href}>
            <span className="block muted text-[13px]">{s.label}</span>
            <span className="block text-xl font-semibold whitespace-nowrap">{s.value}</span>
          </Link>
        ))}
      </div>

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_150px_170px_180px_auto] gap-2 items-end">
        <label className="field">
          Search
          <input className="input" defaultValue={one(sp.q)} name="q" placeholder="Name, email, phone or city" type="search" />
        </label>
        <label className="field">
          Role
          <select defaultValue={role} name="role">
            <option value="">All</option>
            <option value="customer">Customers</option>
            <option value="admin">Admins</option>
          </select>
        </label>
        <label className="field">
          Activity
          <select defaultValue={activity} name="activity">
            {ACTIVITY.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sort by
          <select defaultValue={sort} name="sort">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Apply
          </button>
          <Link className="btn" href="/admin/users">
            Reset
          </Link>
        </div>
      </form>

      {shown.length === 0 ? (
        <div className="empty">
          {filtered ? "No accounts match these filters" : "No accounts yet"}
          <span className="muted">{filtered ? "Try a different search or reset the filters." : "Accounts appear here when people register."}</span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="min-w-[12rem]">Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Spent</th>
                <th>Last order</th>
                <th title="Pairs in bag · items in wishlist">Bag · Wishlist</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const self = u.id === me.id;
                return (
                  <tr key={u.id}>
                    <td>
                      <Link className="link font-medium" href={`/admin/users/${u.id}`}>
                        {u.name}
                      </Link>{" "}
                      {self && <span className="muted">(you)</span>}
                      <div className="muted text-xs">{u.email}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      {u.phone ?? <span className="muted">—</span>}
                      {u.city && <div className="muted text-xs">{u.city}</div>}
                    </td>
                    <td>
                      <span className={`tag ${u.role === "admin" ? "tag-ok" : "tag-muted"}`}>{u.role}</span>
                    </td>
                    <td className="text-right tabular-nums">
                      {u.orders > 0 ? (
                        <Link className="link" href={`/admin/orders?q=${encodeURIComponent(u.email)}`}>
                          {u.orders}
                        </Link>
                      ) : (
                        <span className="muted">0</span>
                      )}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">{u.spent ? pkr(u.spent) : <span className="muted">—</span>}</td>
                    <td className="muted whitespace-nowrap">{u.lastOrderAt ? date(u.lastOrderAt) : "—"}</td>
                    <td className="whitespace-nowrap tabular-nums">
                      {u.bagPairs} · {u.wishlist}
                    </td>
                    <td className="muted whitespace-nowrap">{date(u.createdAt)}</td>
                    <td>
                      <div className="flex justify-end items-start gap-2 whitespace-nowrap">
                        <Link className="btn" href={`/admin/users/${u.id}`}>
                          View
                        </Link>
                        {!self && <UserActions back="/admin/users" compact user={u} />}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager noun={["account", "accounts"]} path="/admin/users" sp={sp} total={rows.length} />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function AdminUsers(props: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminUsersContent {...props} />
    </Suspense>
  );
}

import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="panel p-6 flex flex-col gap-2 items-start">
      <h1>Not found</h1>
      <p className="muted">This listing or page does not exist.</p>
      <Link className="btn" href="/admin/products">
        Back to listings
      </Link>
    </div>
  );
}

import ConfirmButton from "@/components/admin/ConfirmButton";
import ResetLinkButton from "@/components/admin/ResetLinkButton";
import { deleteUser, setUserRole } from "@/app/admin/actions";
import type { Role } from "@/lib/auth/jwt";

/** Reset link, Make/Remove admin (always confirmed) and Delete, for someone else's account. */
export default function UserActions({
  user,
  back,
  compact = false,
}: {
  user: { id: string; name: string; email: string; role: Role };
  /** Where the role change returns to. */
  back: string;
  /** Lists show only the role button; the user's own page shows everything. */
  compact?: boolean;
}) {
  const admin = user.role === "admin";
  return (
    <div className="flex flex-wrap justify-end items-start gap-2">
      {!compact && <ResetLinkButton name={user.name} userId={user.id} />}
      <form action={setUserRole}>
        <input name="id" type="hidden" value={user.id} />
        <input name="role" type="hidden" value={admin ? "customer" : "admin"} />
        <input name="back" type="hidden" value={back} />
        <ConfirmButton
          className="btn"
          confirmLabel={admin ? "Remove admin" : "Make admin"}
          message={
            admin
              ? `${user.name} will lose access to the admin panel straight away and become a regular customer.`
              : `${user.name} will be able to manage orders, payments, listings, reviews, users and settings, including making or removing other admins. Only do this for people you trust.`
          }
          title={
            admin
              ? `Remove admin access from ${user.email}?`
              : `Make ${user.email} an admin?`
          }
        >
          {admin ? "Remove admin" : "Make admin"}
        </ConfirmButton>
      </form>
      {!compact && (
        <form action={deleteUser}>
          <input name="id" type="hidden" value={user.id} />
          <ConfirmButton
            message="They will no longer be able to log in. Their past orders are kept."
            title={`Delete ${user.email}?`}
          >
            Delete
          </ConfirmButton>
        </form>
      )}
    </div>
  );
}

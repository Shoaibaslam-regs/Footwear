import { requireAdmin } from "@/lib/auth/dal";
import { listUsers } from "@/lib/server/users";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { date } from "@/components/admin/format";
import { deleteUser, setUserRole } from "../actions";
import ResetLinkButton from "@/components/admin/ResetLinkButton";

export const metadata = { title: "Users" };

export default async function AdminUsers({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireAdmin();
  const [users, sp] = await Promise.all([listUsers(), searchParams]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Users</h1>
        <p className="muted">Grant or remove admin access. You cannot demote or delete yourself.</p>
      </div>
      {sp.error === "self" && (
        <p className="error" role="alert">
          You cannot change or delete your own account here.
        </p>
      )}
      <div className="panel overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id}>
                  <td className="font-medium">
                    {u.name} {self && <span className="muted font-normal">(you)</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`tag ${u.role === "admin" ? "tag-ok" : "tag-muted"}`}>{u.role}</span>
                  </td>
                  <td className="muted whitespace-nowrap">{date(u.createdAt)}</td>
                  <td>
                    {!self && (
                      <div className="flex justify-end items-start gap-2">
                        <ResetLinkButton name={u.name} userId={u.id} />
                        <form action={setUserRole}>
                          <input name="id" type="hidden" value={u.id} />
                          <input name="role" type="hidden" value={u.role === "admin" ? "customer" : "admin"} />
                          <button className="btn" type="submit">
                            {u.role === "admin" ? "Remove admin" : "Make admin"}
                          </button>
                        </form>
                        <form action={deleteUser}>
                          <input name="id" type="hidden" value={u.id} />
                          <ConfirmButton message="They will no longer be able to sign in. Their past orders are kept." title={`Delete ${u.email}?`}>
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

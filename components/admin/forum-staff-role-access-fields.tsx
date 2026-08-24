type ForumStaffRole = "admin" | "moderator" | "master";

const ROLE_ROWS: Array<{ role: ForumStaffRole; label: string }> = [
  { role: "admin", label: "Admin" },
  { role: "moderator", label: "Moderator" },
  { role: "master", label: "Master" },
];

export function ForumStaffRoleAccessFields({
  defaultReadRoles,
  defaultWriteRoles,
}: {
  defaultReadRoles?: string[] | null;
  defaultWriteRoles?: string[] | null;
}) {
  const readRoles =
    defaultReadRoles == null
      ? new Set<ForumStaffRole>(["admin", "moderator", "master"])
      : new Set(
          defaultReadRoles.filter(
            (role): role is ForumStaffRole =>
              role === "admin" ||
              role === "moderator" ||
              role === "master",
          ),
        );

  const writeRoles =
    defaultWriteRoles == null
      ? new Set<ForumStaffRole>(["admin", "moderator", "master"])
      : new Set(
          defaultWriteRoles.filter(
            (role): role is ForumStaffRole =>
              role === "admin" ||
              role === "moderator" ||
              role === "master",
          ),
        );

  return (
    <div className="md:col-span-2 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-100c09))] p-4">
      <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
        Staff role access
      </p>

      <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-817567))]">
        Used only when Visibility is Staff only. Read controls whether the role can see and open the section. Write controls whether the role can create discussions and replies. Owner always has both permissions.
      </p>

      <div className="mt-4 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40">
        <div className="grid grid-cols-[1fr_90px_90px] bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
          <span>Role</span>
          <span className="text-center">Read</span>
          <span className="text-center">Write</span>
        </div>

        <div className="grid grid-cols-[1fr_90px_90px] items-center border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-2 text-xs text-[rgb(var(--sep-colour-bbaa90))]">
          <span>Owner</span>
          <span className="text-center">Always</span>
          <span className="text-center">Always</span>
        </div>

        {ROLE_ROWS.map(({ role, label }) => (
          <div
            key={role}
            className="grid grid-cols-[1fr_90px_90px] items-center border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-2 text-xs text-[rgb(var(--sep-colour-bbaa90))]"
          >
            <span>{label}</span>

            <label className="flex justify-center">
              <input
                type="checkbox"
                name="staff_read_roles"
                value={role}
                defaultChecked={readRoles.has(role)}
                className="h-4 w-4 accent-amber-700"
                aria-label={`${label} may read this staff-only section`}
              />
            </label>

            <label className="flex justify-center">
              <input
                type="checkbox"
                name="staff_write_roles"
                value={role}
                defaultChecked={writeRoles.has(role)}
                className="h-4 w-4 accent-amber-700"
                aria-label={`${label} may write in this staff-only section`}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { requireAdminSection } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  createNotification,
  deleteNotification,
  toggleNotification,
  updateNotification,
} from "./actions";

type TargetRow = {
  target_type: string;
  target_id: string | null;
};

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  starts_at: string;
  expires_at: string | null;
  expires_game_at: string | null;
  source_type: string | null;
  source_id: string | null;
  source_trigger: string | null;
  is_automatic: boolean;
  staff_overridden: boolean;
  is_active: boolean;
  created_at: string;
  notification_targets: TargetRow[] | null;
};

type CharacterOption = {
  id: string;
  display_name: string;
};

function dt(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 16);
}

function expiryDefault() {
  return dt(new Date(Date.now() + 7 * 86400000).toISOString());
}

function Fields({
  notification,
  characters,
}: {
  notification?: NotificationRow;
  characters: CharacterOption[];
}) {
  const target = notification?.notification_targets?.[0] ?? {
    target_type: "global",
    target_id: null,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Type
          </span>
          <select
            name="type"
            defaultValue={notification?.type ?? "announcement"}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            {["announcement", "maintenance", "patch", "event", "system", "other"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Optional link
          </span>
          <input
            name="href"
            defaultValue={notification?.href ?? ""}
            placeholder="/somewhere"
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Title</span>
        <input
          name="title"
          required
          defaultValue={notification?.title ?? ""}
          className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Message</span>
        <textarea
          name="body"
          required
          rows={4}
          defaultValue={notification?.body ?? ""}
          className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))]"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Audience</span>
          <select
            name="targetType"
            defaultValue={target.target_type}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            <option value="global">Everyone</option>
            <option value="staff">Staff only</option>
            <option value="character">Specific character</option>
            <option value="user">Specific user ID</option>
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Character target</span>
          <select
            name="characterTargetId"
            defaultValue={target.target_type === "character" ? target.target_id ?? "" : ""}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          >
            <option value="">None</option>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>{character.display_name}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">User UUID</span>
          <input
            name="userTargetId"
            defaultValue={target.target_type === "user" ? target.target_id ?? "" : ""}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Visible from · UTC</span>
          <input
            type="datetime-local"
            name="startsAt"
            required
            defaultValue={notification ? dt(notification.starts_at) : dt(new Date().toISOString())}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Real expiry · UTC</span>
          <input
            type="datetime-local"
            name="expiresAt"
            required={!notification}
            defaultValue={notification ? dt(notification.expires_at) : expiryDefault()}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))]"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Game expiry · Aureth</span>
          <input
            type="datetime-local"
            name="expiresGameAt"
            disabled={!notification}
            defaultValue={notification ? dt(notification.expires_game_at) : ""}
            className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] disabled:opacity-45"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm text-[rgb(var(--sep-colour-bbaa90))]">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={notification ? notification.is_active : true}
          className="h-4 w-4 accent-[rgb(var(--sep-colour-8b673d))]"
        />
        Active
      </label>
    </div>
  );
}

export default async function NotificationsAdminPage() {
  await requireAdminSection("notifications");
  const admin = createAdminClient();

  const [notificationsResult, charactersResult] = await Promise.all([
    admin
      .from("notifications")
      .select("id, type, title, body, href, starts_at, expires_at, expires_game_at, source_type, source_id, source_trigger, is_automatic, staff_overridden, is_active, created_at, notification_targets(target_type, target_id)")
      .order("created_at", { ascending: false }),
    admin
      .from("characters")
      .select("id, display_name")
      .eq("is_system", false)
      .order("display_name", { ascending: true }),
  ]);

  if (notificationsResult.error) {
    throw new Error(`Unable to load notifications: ${notificationsResult.error.message}`);
  }

  if (charactersResult.error) {
    throw new Error(`Unable to load characters: ${charactersResult.error.message}`);
  }

  const notifications = (notificationsResult.data ?? []) as NotificationRow[];
  const characters = (charactersResult.data ?? []) as CharacterOption[];

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-5 lg:p-6">
      <section
        id="notification-new"
        className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5"
      >
        <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">Offgame notification centre</p>
        <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">Create Notification</h2>

        <AdminActionForm action={createNotification} className="mt-5">
          <Fields characters={characters} />
          <div className="mt-5 flex justify-end">
            <button type="submit" className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))]">
              Create Notification
            </button>
          </div>
        </AdminActionForm>
      </section>

      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
        <h2 className="font-serif text-xl text-[rgb(var(--sep-colour-dec69a))]">All Notifications · {notifications.length}</h2>

        <div className="mt-4 space-y-3">
          {notifications.map((notification) => (
            <details
              key={notification.id}
              id={`admin-notification-${notification.id}`}
              data-admin-notification-id={notification.id}
              data-admin-notification-title={notification.title}
              data-admin-notification-type={notification.type}
              data-admin-notification-body={notification.body}
              data-admin-notification-source={
                notification.is_automatic
                  ? `${notification.source_type ?? "system"} ${notification.source_trigger ?? "generated"}`
                  : "manual"
              }
              data-admin-notification-active={notification.is_active ? "true" : "false"}
              className="scroll-mt-6 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))]"
            >
              <summary className="cursor-pointer list-none px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-serif text-base text-[rgb(var(--sep-colour-d8bf91))]">{notification.title}</p>
                    <p className="mt-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                      {notification.is_automatic
                        ? `AUTO · ${notification.source_type ?? "system"} · ${notification.source_trigger ?? "generated"}`
                        : "MANUAL"}
                      {notification.staff_overridden ? " · STAFF OVERRIDE" : ""}
                    </p>
                  </div>
                  <span className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9caf7c))]">
                    {notification.is_active ? "Active" : "Disabled"}
                  </span>
                </div>
              </summary>

              <div className="border-t border-[rgb(var(--sep-colour-59432c))]/35 p-4">
                <AdminActionForm action={updateNotification}>
                  <input type="hidden" name="notificationId" value={notification.id} />
                  <Fields notification={notification} characters={characters} />
                  <div className="mt-4 flex justify-end">
                    <button type="submit" className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd4a0))]">Save Changes</button>
                  </div>
                </AdminActionForm>

                <div className="mt-4 grid gap-3 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4 md:grid-cols-2">
                  <AdminActionForm action={toggleNotification}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <input type="hidden" name="nextActive" value={notification.is_active ? "false" : "true"} />
                    <button type="submit" className="w-full border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d9c092))]">
                      {notification.is_active ? "Disable" : "Enable"}
                    </button>
                  </AdminActionForm>

                  <AdminActionForm action={deleteNotification}>
                    <input type="hidden" name="notificationId" value={notification.id} />
                    <button
                      type="submit"
                      data-confirm-message="Delete this notification permanently? Automatic notifications will also be suppressed so they are not recreated."
                      className="w-full border border-red-800/70 bg-red-950/35 px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-red-300"
                    >
                      Delete
                    </button>
                  </AdminActionForm>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}

import {
  inviteOrderHeadquarters,
  revokeOrderHeadquartersGuest,
  updateOrderHeadquartersPresentation,
} from "@/app/(portal)/orders/headquarters/actions";
import {
  InvitationOwnerStateRefresh,
} from "@/components/invitations/invitation-owner-state-refresh";

export function OrderHeadquartersManageMenu({
  data,
}: {
  data: any;
}) {
  return (
    <details className="relative col-span-2 sm:col-auto">
      <InvitationOwnerStateRefresh
        kind="order"
        scopeId={data.headquartersId}
        pendingIds={
          data.externalGuests
            .filter(
              (guest: any) =>
                guest.status ===
                "pending",
            )
            .map(
              (guest: any) =>
                guest.invitationId,
            )
        }
      />
      <summary className="flex cursor-pointer list-none items-center justify-center border border-[rgb(var(--sep-colour-725c3d))] bg-[rgb(var(--sep-colour-21190f))] px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-d6bb8d))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-352718))] hover:text-[rgb(var(--sep-colour-f0d6a7))] sm:px-3 sm:text-[9px] sm:tracking-[0.18em] [&::-webkit-details-marker]:hidden">
        Manage Headquarters
      </summary>

      <div className="absolute right-0 top-full z-[120] mt-2 max-h-[72vh] w-[min(92vw,560px)] overflow-y-auto border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-15100d))] p-4 text-left shadow-2xl">
        <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          {data.isStaff
            ? "Staff control"
            : data.level === 6
              ? "Level 6 · Order Leader"
              : "Level 5"}
        </p>

        <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))]">
          {data.orderName}
        </h3>

        {data.canInvite ? (
          <section className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
              Invite external character
            </p>

            <form action={inviteOrderHeadquarters} className="mt-2 grid gap-2">
              <input type="hidden" name="roomId" value={data.roomId} />

              <select
                name="recipientId"
                required
                defaultValue=""
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
              >
                <option value="" disabled>Select character...</option>
                {data.candidates.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                name="accessDuration"
                defaultValue="permanent"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
              >
                <option value="60">1 hour</option>
                <option value="360">6 hours</option>
                <option value="1440">24 hours</option>
                <option value="4320">3 days</option>
                <option value="10080">7 days</option>
                <option value="43200">30 days</option>
                <option value="permanent">Permanent</option>
              </select>

              <textarea
                name="customMessage"
                rows={2}
                maxLength={1200}
                placeholder="Optional invitation message..."
                className="resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
              />

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b8d8a7))]"
              >
                Send invitation
              </button>
            </form>

            {data.externalGuests.length > 0 ? (
              <div className="mt-3 space-y-1.5">
                {data.externalGuests.map((g: any) => (
                  <div
                    key={g.invitationId}
                    className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs text-[rgb(var(--sep-colour-c9b79a))]">{g.name}</p>
                      <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                        {g.status}
                        {g.expiresAt
                          ? ` · until ${new Date(g.expiresAt).toLocaleString("en-GB")}`
                          : g.status === "accepted"
                            ? " · permanent"
                            : ""}
                      </p>
                    </div>

                    <form action={revokeOrderHeadquartersGuest}>
                      <input type="hidden" name="roomId" value={data.roomId} />
                      <input type="hidden" name="invitationId" value={g.invitationId} />
                      <button
                        type="submit"
                        className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d18f83))]"
                      >
                        {g.status === "pending" ? "Cancel" : "Kick"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {data.canCustomize ? (
          <details className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3">
            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
              Chat background
            </summary>

            <form
              action={updateOrderHeadquartersPresentation}
              className="mt-3 grid gap-2"
            >
              <input
                type="hidden"
                name="roomId"
                value={data.roomId}
              />

              <input
                name="imageUrl"
                maxLength={2000}
                defaultValue={data.imageUrl ?? ""}
                placeholder="Chat background / Location URL"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
              />

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                This overrides each visitor&apos;s equipped Location Atmosphere while they are inside. All other chat colours and surfaces follow their active Portal skin.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]"
              >
                Save chat background
              </button>
            </form>
          </details>
        ) : null}
      </div>
    </details>
  );
}

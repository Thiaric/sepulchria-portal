"use client";

import {
  inviteOrderHeadquarters,
  revokeOrderHeadquartersGuest,
  updateOrderHeadquartersPresentation,
} from "@/app/(portal)/orders/headquarters/actions";
import {
  InvitationOwnerStateRefresh,
} from "@/components/invitations/invitation-owner-state-refresh";
import {
  LocationImageSaveForm,
} from "@/components/world/location-image-save-form";

export function OrderHeadquartersPanel({
  data,
}: {
  data: any;
}) {
  return (
    <details
      data-sep-interaction-ignore="true"
      data-skin-widget="order-headquarters-manage"
      className="group shrink-0 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0d0907))]"
    >
      <InvitationOwnerStateRefresh
        kind="order"
        scopeId={data.headquartersId}
        pendingIds={
          data.externalGuests
            .filter(
              (guest: any) => guest.status === "pending",
            )
            .map(
              (guest: any) => guest.invitationId,
            )
        }
      />

      <summary className="sticky top-0 z-30 flex cursor-pointer list-none items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[linear-gradient(90deg,rgb(var(--sep-colour-100c09)),rgb(var(--sep-colour-17110d)),rgb(var(--sep-colour-100c09)))] px-3 py-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Order Headquarters
          </p>
          <p className="mt-0.5 truncate font-serif text-sm text-[rgb(var(--sep-colour-dec89f))]">
            {data.orderName}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <p className="hidden text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] sm:block">
            {data.isStaff
              ? "Staff control"
              : data.level === 6
                ? "Level 6 · Order Leader"
                : "Level 5"}
          </p>
          <span className="text-[9px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-a88d65))]">
            <span className="group-open:hidden">Manage ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </div>
      </summary>

      <div className="max-h-[58vh] overflow-y-auto border-t border-[rgb(var(--sep-colour-59432c))]/30 px-3 py-3">
        <div className="mx-auto w-full max-w-3xl">
          {data.canInvite ? (
            <section>
              <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))]">
                Invite external character
              </p>

              <form
                action={inviteOrderHeadquarters}
                className="mt-2 grid gap-2"
              >
                <input type="hidden" name="roomId" value={data.roomId} />

                <select
                  name="recipientId"
                  required
                  defaultValue=""
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                >
                  <option value="" disabled>Select character...</option>
                  {data.candidates.map((candidate: any) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
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
                  {data.externalGuests.map((guest: any) => (
                    <div
                      key={guest.invitationId}
                      className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs text-[rgb(var(--sep-colour-c9b79a))]">
                          {guest.name}
                        </p>
                        <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
                          {guest.status}
                          {guest.expiresAt
                            ? ` · until ${new Date(guest.expiresAt).toLocaleString("en-GB")}`
                            : guest.status === "accepted"
                              ? " · permanent"
                              : ""}
                        </p>
                      </div>

                      <form action={revokeOrderHeadquartersGuest}>
                        <input type="hidden" name="roomId" value={data.roomId} />
                        <input
                          type="hidden"
                          name="invitationId"
                          value={guest.invitationId}
                        />
                        <button
                          type="submit"
                          className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d18f83))]"
                        >
                          {guest.status === "pending" ? "Cancel" : "Kick"}
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
                Location images
              </summary>

              <LocationImageSaveForm
                action={updateOrderHeadquartersPresentation}
                className="mt-3 grid gap-2"
              >
                <input type="hidden" name="roomId" value={data.roomId} />

                <label className="grid gap-1">
                  <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                    Location Image URL
                  </span>
                  <input
                    name="imageUrl"
                    maxLength={2000}
                    defaultValue={data.imageUrl ?? ""}
                    placeholder="https://..."
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                  />
                </label>

                <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                  Shown as the Headquarters location image outside the room.
                </p>

                <label className="grid gap-1">
                  <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))]">
                    Background Image URL
                  </span>
                  <input
                    name="backgroundImageUrl"
                    maxLength={2000}
                    defaultValue={data.backgroundImageUrl ?? ""}
                    placeholder="https://..."
                    className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))]"
                  />
                </label>

                <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))]">
                  Used only as the in-room chat background. It overrides each visitor&apos;s equipped Location Atmosphere while they are inside.
                </p>

                <button
                  type="submit"
                  className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))]"
                >
                  Save location images
                </button>
              </LocationImageSaveForm>
            </details>
          ) : null}
        </div>
      </div>
    </details>
  );
}

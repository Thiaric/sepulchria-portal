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
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  LocationImageSaveForm,
} from "@/components/world/location-image-save-form";

export function OrderHeadquartersManageMenu({
  data,
}: {
  data: any;
}) {
  const [open, setOpen] =
    useState(false);

  const buttonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [panelPosition, setPanelPosition] =
    useState({
      right: 12,
      bottom: 72,
    });

  function updatePanelPosition() {
    const button =
      buttonRef.current;

    if (!button) {
      return;
    }

    const rect =
      button.getBoundingClientRect();

    setPanelPosition({
      right: Math.max(
        12,
        window.innerWidth -
          rect.right,
      ),
      bottom: Math.max(
        12,
        window.innerHeight -
          rect.top +
          8,
      ),
    });
  }

  function toggleOpen() {
    if (!open) {
      updatePanelPosition();
    }

    setOpen(
      (current) => !current,
    );
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const reposition = () =>
      updatePanelPosition();

    const closeOnEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape"
      ) {
        setOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      reposition,
    );
    window.addEventListener(
      "scroll",
      reposition,
      true,
    );
    window.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      window.removeEventListener(
        "resize",
        reposition,
      );
      window.removeEventListener(
        "scroll",
        reposition,
        true,
      );
      window.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [open]);

  return (
    <div className="relative col-span-2 sm:col-auto components_orders_order_headquarters_manage_menu_div_container">
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
      <button
        ref={buttonRef}
        type="button"
        data-skin-role="primary-control"
        aria-expanded={open}
        onClick={toggleOpen}
        className="flex items-center justify-center border px-2 py-1.5 text-[8px] uppercase tracking-[0.12em] transition sm:px-3 sm:text-[9px] sm:tracking-[0.18em] components_orders_order_headquarters_manage_menu_button_manage_headquarters"
        style={{
          borderColor:
            "rgb(var(--sep-skin-c1, var(--sep-colour-725c3d)) / 0.65)",
          backgroundColor:
            "rgb(var(--sep-colour-21190f))",
          color:
            "rgb(var(--sep-skin-c2, var(--sep-colour-d6bb8d)))",
        }}
      >
        Manage Headquarters
      </button>

      {open &&
      typeof document !==
        "undefined"
        ? createPortal(
      <div
        data-skin-widget="order-headquarters-manage"
        className="fixed z-[9999] max-h-[72vh] w-[min(92vw,560px)] overflow-y-auto border bg-[rgb(var(--sep-colour-15100d))] p-4 text-left shadow-2xl components_orders_order_headquarters_manage_menu_div_container_2"
        style={{
          right:
            panelPosition.right,
          bottom:
            panelPosition.bottom,
          borderColor:
            "rgb(var(--sep-skin-c1, var(--sep-colour-80613b)) / 0.72)",
        }}
      >
        <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_orders_order_headquarters_manage_menu_p_text">
          {data.isStaff
            ? "Staff control"
            : data.level === 6
              ? "Level 6 · Order Leader"
              : "Level 5"}
        </p>

        <h3 className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-dfc99f))] components_orders_order_headquarters_manage_menu_h3_heading">
          {data.orderName}
        </h3>

        {data.canInvite ? (
          <section className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 components_orders_order_headquarters_manage_menu_section_section">
            <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))] components_orders_order_headquarters_manage_menu_p_text_2">
              Invite external character
            </p>

            <form action={inviteOrderHeadquarters} className="mt-2 grid gap-2 components_orders_order_headquarters_manage_menu_form_invite_order_headquarters">
              <input className="components_orders_order_headquarters_manage_menu_input_room_id" type="hidden" name="roomId" value={data.roomId} />

              <select
                name="recipientId"
                required
                defaultValue=""
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_orders_order_headquarters_manage_menu_select_recipient_id"
              >
                <option className="components_orders_order_headquarters_manage_menu_option_recipient_id" value="" disabled>Select character...</option>
                {data.candidates.map((c: any) => (
                  <option className="components_orders_order_headquarters_manage_menu_option_option" key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                name="accessDuration"
                defaultValue="permanent"
                className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_orders_order_headquarters_manage_menu_select_access_duration"
              >
                <option className="components_orders_order_headquarters_manage_menu_option_60" value="60">1 hour</option>
                <option className="components_orders_order_headquarters_manage_menu_option_360" value="360">6 hours</option>
                <option className="components_orders_order_headquarters_manage_menu_option_1440" value="1440">24 hours</option>
                <option className="components_orders_order_headquarters_manage_menu_option_4320" value="4320">3 days</option>
                <option className="components_orders_order_headquarters_manage_menu_option_10080" value="10080">7 days</option>
                <option className="components_orders_order_headquarters_manage_menu_option_43200" value="43200">30 days</option>
                <option className="components_orders_order_headquarters_manage_menu_option_permanent" value="permanent">Permanent</option>
              </select>

              <textarea
                name="customMessage"
                rows={2}
                maxLength={1200}
                placeholder="Optional invitation message..."
                className="resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_orders_order_headquarters_manage_menu_textarea_custom_message"
              />

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b8d8a7))] components_orders_order_headquarters_manage_menu_button_send_invitation"
              >
                Send invitation
              </button>
            </form>

            {data.externalGuests.length > 0 ? (
              <div className="mt-3 space-y-1.5 components_orders_order_headquarters_manage_menu_div_container_3">
                {data.externalGuests.map((g: any) => (
                  <div
                    key={g.invitationId}
                    className="flex items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-2 components_orders_order_headquarters_manage_menu_div_container_4"
                  >
                    <div className="min-w-0 components_orders_order_headquarters_manage_menu_div_container_5">
                      <p className="truncate text-xs text-[rgb(var(--sep-colour-c9b79a))] components_orders_order_headquarters_manage_menu_p_text_3">{g.name}</p>
                      <p className="mt-0.5 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_orders_order_headquarters_manage_menu_p_text_4">
                        {g.status}
                        {g.expiresAt
                          ? ` · until ${new Date(g.expiresAt).toLocaleString("en-GB")}`
                          : g.status === "accepted"
                            ? " · permanent"
                            : ""}
                      </p>
                    </div>

                    <form className="components_orders_order_headquarters_manage_menu_form_revoke_order_headquarters_guest" action={revokeOrderHeadquartersGuest}>
                      <input className="components_orders_order_headquarters_manage_menu_input_room_id_2" type="hidden" name="roomId" value={data.roomId} />
                      <input className="components_orders_order_headquarters_manage_menu_input_invitation_id" type="hidden" name="invitationId" value={g.invitationId} />
                      <button
                        type="submit"
                        className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-d18f83))] components_orders_order_headquarters_manage_menu_button_action"
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
          <details className="mt-4 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-3 components_orders_order_headquarters_manage_menu_details_location_images">
            <summary className="cursor-pointer text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8c704b))] components_orders_order_headquarters_manage_menu_summary_location_images">
              Location images
            </summary>

            <LocationImageSaveForm
  action={updateOrderHeadquartersPresentation}
  className="mt-3 grid gap-2"
>
              <input className="components_orders_order_headquarters_manage_menu_input_room_id_3"
                type="hidden"
                name="roomId"
                value={data.roomId}
              />

              <label className="grid gap-1 components_orders_order_headquarters_manage_menu_label_location_images">
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_orders_order_headquarters_manage_menu_span_location_images">
                  Location Image URL
                </span>
                <input
                  name="imageUrl"
                  maxLength={2000}
                  defaultValue={data.imageUrl ?? ""}
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_orders_order_headquarters_manage_menu_input_image_url"
                />
              </label>

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))] components_orders_order_headquarters_manage_menu_p_location_images">
                Shown as the Headquarters location image outside the room.
              </p>

              <label className="grid gap-1 components_orders_order_headquarters_manage_menu_label_location_images_2">
                <span className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-806b50))] components_orders_order_headquarters_manage_menu_span_location_images_2">
                  Background Image URL
                </span>
                <input
                  name="backgroundImageUrl"
                  maxLength={2000}
                  defaultValue={data.backgroundImageUrl ?? ""}
                  placeholder="https://..."
                  className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-xs text-[rgb(var(--sep-colour-d7c4a5))] components_orders_order_headquarters_manage_menu_input_background_image_url"
                />
              </label>

              <p className="text-[7px] leading-4 text-[rgb(var(--sep-colour-6f6252))] components_orders_order_headquarters_manage_menu_p_location_images_2">
                Used only as the in-room chat background. It overrides each visitor&apos;s equipped Location Atmosphere while they are inside.
              </p>

              <button
                type="submit"
                className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd6a8))] components_orders_order_headquarters_manage_menu_button_save_location_images"
              >
                Save location images
              </button>
            </LocationImageSaveForm>
          </details>
        ) : null}
      </div>,
            document.body,
          )
        : null}
    </div>
  );
}

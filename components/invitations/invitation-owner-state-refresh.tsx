"use client";

import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

type InvitationKind =
  | "private"
  | "breeze"
  | "order";

function signature(
  ids: string[],
) {
  return [...ids]
    .sort()
    .join("|");
}

export function InvitationOwnerStateRefresh({
  kind,
  scopeId,
  pendingIds,
}: {
  kind: InvitationKind;
  scopeId: string;
  pendingIds: string[];
}) {
  const router = useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const currentSignature =
    signature(pendingIds);

  const signatureRef =
    useRef(currentSignature);

  useEffect(() => {
    signatureRef.current =
      currentSignature;
  }, [currentSignature]);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingSignature() {
      if (kind === "private") {
        const {
          data,
          error,
        } = await supabase
          .from(
            "private_location_invitations",
          )
          .select("id")
          .eq(
            "room_id",
            scopeId,
          )
          .eq(
            "status",
            "pending",
          );

        if (error) {
          return null;
        }

        return signature(
          (data ?? []).map(
            (row) => row.id,
          ),
        );
      }

      if (kind === "breeze") {
        const {
          data,
          error,
        } = await supabase
          .from(
            "breeze_lodging_invitations",
          )
          .select("id")
          .eq(
            "room_id",
            scopeId,
          )
          .eq(
            "status",
            "pending",
          );

        if (error) {
          return null;
        }

        return signature(
          (data ?? []).map(
            (row) => row.id,
          ),
        );
      }

      const {
        data,
        error,
      } = await supabase
        .from(
          "order_headquarters_invitations",
        )
        .select("id")
        .eq(
          "headquarters_id",
          scopeId,
        )
        .eq(
          "status",
          "pending",
        );

      if (error) {
        return null;
      }

      return signature(
        (data ?? []).map(
          (row) => row.id,
        ),
      );
    }

    async function check() {
      const next =
        await loadPendingSignature();

      if (
        cancelled ||
        next === null ||
        next ===
          signatureRef.current
      ) {
        return;
      }

      signatureRef.current =
        next;

      router.refresh();
    }

    const table =
      kind === "private"
        ? "private_location_invitations"
        : kind === "breeze"
          ? "breeze_lodging_invitations"
          : "order_headquarters_invitations";

    const filter =
      kind === "order"
        ? `headquarters_id=eq.${scopeId}`
        : `room_id=eq.${scopeId}`;

    const channel =
      supabase
        .channel(
          `invitation-owner-state-${kind}-${scopeId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter,
          },
          () => {
            void check();
          },
        )
        .subscribe();

    /*
     * The invitation tables are not guaranteed to be present in every
     * Realtime publication/environment. This cheap pending-ID check is
     * a safety net, and it refreshes ONLY if the pending set changed.
     */
    const timer =
      window.setInterval(
        () => {
          void check();
        },
        1200,
      );

    function handleFocus() {
      void check();
    }

    function handleVisibility() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void check();
      }
    }

    window.addEventListener(
      "focus",
      handleFocus,
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility,
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        timer,
      );

      window.removeEventListener(
        "focus",
        handleFocus,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    kind,
    router,
    scopeId,
    supabase,
  ]);

  return null;
}

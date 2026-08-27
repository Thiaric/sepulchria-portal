"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { createClient } from "@/lib/supabase/client";

type StaffRole = "owner" | "admin" | "moderator" | "master";

type AudienceCounts = {
  player: number;
  staff: number;
};

type SanctionCounts = AudienceCounts & {
  playerHasSanctions: boolean;
};

type PortalNotificationCountsValue = {
  isStaff: boolean;
  registrationApplications: number;
  orderSubmissions: number;
  submittedCharacters: number;
  tickets: AudienceCounts;
  sanctions: SanctionCounts;
};

const POLL_INTERVAL_MS = 20_000;

const PortalNotificationCountsContext =
  createContext<PortalNotificationCountsValue | null>(null);

export function PortalNotificationCountsProvider({
  children,
  staffRole,
}: {
  children: ReactNode;
  staffRole: StaffRole | null;
}) {
  const isStaff = staffRole !== null;
  const canReviewRegistrations = staffRole === "owner";
  const canReviewOrders = staffRole === "owner";
  const canReviewSanctions =
    staffRole === "owner" ||
    staffRole === "admin" ||
    staffRole === "moderator";

  const [registrationApplications, setRegistrationApplications] =
    useState(0);
  const [orderSubmissions, setOrderSubmissions] =
    useState(0);
  const [submittedCharacters, setSubmittedCharacters] =
    useState(0);

  const [tickets, setTickets] =
    useState<AudienceCounts>({
      player: 0,
      staff: 0,
    });

  const [sanctions, setSanctions] =
    useState<SanctionCounts>({
      player: 0,
      staff: 0,
      playerHasSanctions: false,
    });

  const inFlightRef =
    useRef<Set<string>>(new Set());

  const runOnce = useCallback(
    async (
      key: string,
      task: () => Promise<void>,
    ) => {
      if (inFlightRef.current.has(key)) {
        return;
      }

      inFlightRef.current.add(key);

      try {
        await task();
      } finally {
        inFlightRef.current.delete(key);
      }
    },
    [],
  );

  const fetchJson = useCallback(
    async (url: string) => {
      const response =
        await fetch(url, {
          cache: "no-store",
        }).catch(() => null);

      if (!response?.ok) {
        return null;
      }

      return response
        .json()
        .catch(() => null) as Promise<
        Record<string, unknown> | null
      >;
    },
    [],
  );

  const refreshRegistrationApplications =
    useCallback(async () => {
      if (!canReviewRegistrations) {
        setRegistrationApplications(0);
        return;
      }

      await runOnce(
        "registration-applications",
        async () => {
          const result =
            await fetchJson(
              "/api/admin/registration-applications/pending-count",
            );

          if (!result) {
            return;
          }

          setRegistrationApplications(
            Math.max(
              0,
              Number(result.count) || 0,
            ),
          );
        },
      );
    }, [
      canReviewRegistrations,
      fetchJson,
      runOnce,
    ]);

  const refreshOrderSubmissions =
    useCallback(async () => {
      if (!canReviewOrders) {
        setOrderSubmissions(0);
        return;
      }

      await runOnce(
        "order-submissions",
        async () => {
          const result =
            await fetchJson(
              "/api/admin/order-submissions/pending-count",
            );

          if (!result) {
            return;
          }

          setOrderSubmissions(
            Math.max(
              0,
              Number(result.count) || 0,
            ),
          );
        },
      );
    }, [
      canReviewOrders,
      fetchJson,
      runOnce,
    ]);

  const refreshSubmittedCharacters =
    useCallback(async () => {
      if (!isStaff) {
        setSubmittedCharacters(0);
        return;
      }

      await runOnce(
        "submitted-characters",
        async () => {
          const supabase =
            createClient();

          const {
            count,
            error,
          } = await supabase
            .from("characters")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("status", "submitted");

          if (error) {
            console.error(
              "Unable to count submitted characters:",
              error.message,
            );
            return;
          }

          setSubmittedCharacters(
            count ?? 0,
          );
        },
      );
    }, [
      isStaff,
      runOnce,
    ]);

  const refreshPlayerTickets =
    useCallback(async () => {
      await runOnce(
        "tickets-player",
        async () => {
          const result =
            await fetchJson(
              "/api/support/notifications?audience=player",
            );

          if (!result) {
            return;
          }

          setTickets((current) => ({
            ...current,
            player: Math.max(
              0,
              Number(result.count) || 0,
            ),
          }));
        },
      );
    }, [
      fetchJson,
      runOnce,
    ]);

  const refreshStaffTickets =
    useCallback(async () => {
      if (!isStaff) {
        setTickets((current) => ({
          ...current,
          staff: 0,
        }));
        return;
      }

      await runOnce(
        "tickets-staff",
        async () => {
          const result =
            await fetchJson(
              "/api/support/notifications?audience=staff",
            );

          if (!result) {
            return;
          }

          setTickets((current) => ({
            ...current,
            staff: Math.max(
              0,
              Number(result.count) || 0,
            ),
          }));
        },
      );
    }, [
      fetchJson,
      isStaff,
      runOnce,
    ]);

  const refreshTickets =
    useCallback(async () => {
      await Promise.all([
        refreshPlayerTickets(),
        refreshStaffTickets(),
      ]);
    }, [
      refreshPlayerTickets,
      refreshStaffTickets,
    ]);

  const refreshPlayerSanctions =
    useCallback(async () => {
      await runOnce(
        "sanctions-player",
        async () => {
          const result =
            await fetchJson(
              "/api/sanctions/notifications?audience=player",
            );

          if (!result) {
            return;
          }

          setSanctions((current) => ({
            ...current,
            player: Math.max(
              0,
              Number(result.count) || 0,
            ),
            playerHasSanctions:
              result.hasSanctions === true,
          }));
        },
      );
    }, [
      fetchJson,
      runOnce,
    ]);

  const refreshStaffSanctions =
    useCallback(async () => {
      if (!canReviewSanctions) {
        setSanctions((current) => ({
          ...current,
          staff: 0,
        }));
        return;
      }

      await runOnce(
        "sanctions-staff",
        async () => {
          const result =
            await fetchJson(
              "/api/sanctions/notifications?audience=staff",
            );

          if (!result) {
            return;
          }

          setSanctions((current) => ({
            ...current,
            staff: Math.max(
              0,
              Number(result.count) || 0,
            ),
          }));
        },
      );
    }, [
      canReviewSanctions,
      fetchJson,
      runOnce,
    ]);

  const refreshSanctions =
    useCallback(async () => {
      await Promise.all([
        refreshPlayerSanctions(),
        refreshStaffSanctions(),
      ]);
    }, [
      refreshPlayerSanctions,
      refreshStaffSanctions,
    ]);

  const refreshAll =
    useCallback(async () => {
      await Promise.all([
        refreshRegistrationApplications(),
        refreshOrderSubmissions(),
        refreshSubmittedCharacters(),
        refreshTickets(),
        refreshSanctions(),
      ]);
    }, [
      refreshOrderSubmissions,
      refreshRegistrationApplications,
      refreshSanctions,
      refreshSubmittedCharacters,
      refreshTickets,
    ]);

  useEffect(() => {
    void refreshAll();

    const intervalId =
      window.setInterval(
        () => {
          void refreshAll();
        },
        POLL_INTERVAL_MS,
      );

    const handleFocus =
      () => {
        void refreshAll();
      };

    const handleTicketChanged =
      () => {
        void refreshTickets();
      };

    const handleSanctionsChanged =
      () => {
        void refreshSanctions();
      };

    window.addEventListener(
      "focus",
      handleFocus,
    );
    window.addEventListener(
      "sepulchria:ticket-notifications-changed",
      handleTicketChanged,
    );
    window.addEventListener(
      "sepulchria:sanctions-changed",
      handleSanctionsChanged,
    );

    return () => {
      window.clearInterval(
        intervalId,
      );
      window.removeEventListener(
        "focus",
        handleFocus,
      );
      window.removeEventListener(
        "sepulchria:ticket-notifications-changed",
        handleTicketChanged,
      );
      window.removeEventListener(
        "sepulchria:sanctions-changed",
        handleSanctionsChanged,
      );
    };
  }, [
    refreshAll,
    refreshSanctions,
    refreshTickets,
  ]);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          "portal-submitted-character-alerts",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "characters",
          },
          () => {
            void refreshSubmittedCharacters();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    isStaff,
    refreshSubmittedCharacters,
  ]);

  return (
    <PortalNotificationCountsContext.Provider
      value={{
        isStaff,
        registrationApplications,
        orderSubmissions,
        submittedCharacters,
        tickets,
        sanctions,
      }}
    >
      {children}
    </PortalNotificationCountsContext.Provider>
  );
}

export function usePortalNotificationCounts() {
  const value =
    useContext(
      PortalNotificationCountsContext,
    );

  if (!value) {
    throw new Error(
      "usePortalNotificationCounts must be used inside PortalNotificationCountsProvider.",
    );
  }

  return value;
}

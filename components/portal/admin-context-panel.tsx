"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { TicketContextPanel } from "@/components/support/ticket-context-panel";
import { SanctionContextPanel } from "@/components/sanctions/sanction-context-panel";
import { CraftingRecipesContextPanel } from "@/components/admin/crafting-recipes-context-panel";
import { CharacterAuditContextPanel } from "@/components/admin/character-audit-context-panel";
import { HouseOfChancesContextPanel } from "@/components/admin/house-of-chances-context-panel";
import { GatheringContextPanel } from "@/components/admin/gathering-context-panel";
import { ExperienceContextPanel } from "@/components/admin/experience-context-panel";
import { MusicContextPanel } from "@/components/admin/music-context-panel";
import { AdminCharacterPremiumFeaturesContext } from "@/components/admin/admin-character-premium-features-context";
import {
  canAccessAdminSection,
  type AdminSection,
  type StaffRole,
} from "@/lib/auth/admin-section-access";

type JumpEntry = {
  id: string;
  label: string;
  secondary?: string;
  active?: boolean;
};

type ContextMode =
  | "overview"
  | "areas"
  | "rooms"
  | "races"
  | "associations"
  | "gifts"
  | "items"
  | "house_of_chances"
  | "gathering"
  | "crafting_recipes"
  | "shapes"
  | "users"
  | "characters"
  | "character_audit"
  | "character_detail"
  | "character_premium_features"
  | "codex"
  | "media"
  | "notifications"
  | "polls"
  | "experience"
  | "music"
  | "trophies"
  | "registrations"
  | "world"
  | "tickets"
  | "sanctions"
  | "forum";

function getMode(
  pathname: string,
): ContextMode | null {
  if (pathname === "/admin") {
    return "overview";
  }

  if (pathname === "/admin/areas") {
    return "areas";
  }

  if (pathname === "/admin/rooms") {
    return "rooms";
  }

  if (pathname === "/admin/races") {
    return "races";
  }

  if (
    pathname ===
    "/admin/associations"
  ) {
    return "associations";
  }

  if (pathname === "/admin/gifts") {
    return "gifts";
  }

  if (pathname === "/admin/items") {
    return "items";
  }

  if (pathname === "/admin/house-of-chances") {
    return "house_of_chances";
  }

  if (pathname === "/admin/gathering") {
    return "gathering";
  }

  if (
    pathname ===
    "/admin/crafting-recipes"
  ) {
    return "crafting_recipes";
  }

  if (pathname === "/admin/shapes") {
    return "shapes";
  }

  if (pathname === "/admin/users") {
    return "users";
  }

  if (
    pathname ===
    "/admin/characters"
  ) {
    return "characters";
  }

  if (pathname === "/admin/character-audit") {
    return "character_audit";
  }

  if (pathname === "/admin/codex") {
    return "codex";
  }

  if (pathname === "/admin/media") {
    return "media";
  }

  if (pathname === "/admin/notifications") {
    return "notifications";
  }

  if (pathname === "/admin/polls") {
    return "polls";
  }

  if (pathname === "/admin/experience") {
    return "experience";
  }

  if (pathname === "/admin/music") {
    return "music";
  }

  if (pathname === "/admin/trophies") {
    return "trophies";
  }

  if (pathname === "/admin/registrations") {
    return "registrations";
  }

  if (pathname === "/admin/world") {
    return "world";
  }

  if (
    /^\/admin\/characters\/[0-9a-f-]+\/premium-features$/i.test(
      pathname,
    )
  ) {
    return "character_premium_features";
  }

  if (
    /^\/admin\/characters\/[0-9a-f-]+$/i.test(
      pathname,
    )
  ) {
    return "character_detail";
  }

  if (pathname === "/admin/tickets" || pathname.startsWith("/admin/tickets/")) {
    return "tickets";
  }

  if (pathname === "/admin/sanctions" || pathname.startsWith("/admin/sanctions/")) {
    return "sanctions";
  }

  if (
    pathname === "/admin/forum" ||
    pathname.startsWith(
      "/admin/forum/",
    )
  ) {
    return "forum";
  }

  return null;
}

export function AdminContextPanel({
  pathname,
}: {
  pathname: string;
}) {
  const mode =
    useMemo(
      () => getMode(pathname),
      [pathname],
    );

  if (!mode) {
    return null;
  }

  if (mode === "overview") {
    return (
      <AdminNavigationContext />
    );
  }

  if (mode === "house_of_chances") {
    return (
      <HouseOfChancesContextPanel />
    );
  }

  if (mode === "gathering") {
    return (
      <GatheringContextPanel />
    );
  }

  if (mode === "codex") {
    return (
      <AdminCodexNavigatorContext />
    );
  }

  if (mode === "media") {
    return (
      <AdminMediaNavigatorContext />
    );
  }

  if (mode === "notifications") {
    return (
      <AdminNotificationsNavigatorContext />
    );
  }

  if (mode === "polls") {
    return (
      <AdminPollsNavigatorContext />
    );
  }

  if (mode === "experience") {
    return (
      <ExperienceContextPanel />
    );
  }

  if (mode === "music") {
    return (
      <MusicContextPanel />
    );
  }

  if (mode === "trophies") {
    return (
      <AdminTrophiesNavigatorContext />
    );
  }

  if (mode === "registrations") {
    return (
      <AdminRegistrationsNavigatorContext />
    );
  }

  if (mode === "world") {
    return (
      <AdminWorldGuideContext />
    );
  }

  if (mode === "character_audit") {
    return (
      <CharacterAuditContextPanel />
    );
  }

  if (mode === "character_detail") {
    return (
      <AdminCharacterFieldNavigator />
    );
  }

  if (
    mode ===
    "character_premium_features"
  ) {
    return (
      <AdminCharacterPremiumFeaturesContext />
    );
  }

  if (mode === "forum") {
    return (
      <ForumModerationContext />
    );
  }

  if (mode === "tickets") {
    const match = pathname.match(/^\/admin\/tickets\/([^/]+)$/);
    return <TicketContextPanel admin reference={match ? decodeURIComponent(match[1]) : undefined} />;
  }

  if (mode === "sanctions") {
    const match = pathname.match(/^\/admin\/sanctions\/([^/]+)$/);
    return <SanctionContextPanel admin sanctionId={match ? decodeURIComponent(match[1]) : undefined} />;
  }

  if (mode === "gifts") {
    return (
      <AdminGiftsJumpContext />
    );
  }

  if (mode === "shapes") {
    return (
      <AdminShapesJumpContext />
    );
  }

  if (
    mode ===
    "crafting_recipes"
  ) {
    return (
      <CraftingRecipesContextPanel />
    );
  }

  return (
    <AdminRecordJumpContext
      mode={mode}
    />
  );
}








type AdminPollContextEntry = {
  id: string;
  title: string;
  status: string;
  description: string;
  ballots: number;
};

function AdminPollsNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminPollContextEntry[]>([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<
      "all" | "draft" | "open" | "closed"
    >("all");

  useEffect(() => {
    const readEntries = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-admin-poll-id]",
        ),
      );

      setEntries(
        nodes.map((node) => ({
          id:
            node.dataset.adminPollId ??
            "",
          title:
            node.dataset.adminPollTitle ??
            "Untitled Poll",
          status:
            node.dataset.adminPollStatus ??
            "draft",
          description:
            node.dataset
              .adminPollDescription ??
            "",
          ballots:
            Number.parseInt(
              node.dataset
                .adminPollBallots ??
                "0",
              10,
            ) || 0,
        })),
      );
    };

    readEntries();

    const frame =
      window.requestAnimationFrame(
        readEntries,
      );

    const handleAdminDataChanged =
      () => {
        window.requestAnimationFrame(
          readEntries,
        );
      };

    window.addEventListener(
      "sepulchria:admin-data-changed",
      handleAdminDataChanged,
    );

    const observer =
      new MutationObserver(
        readEntries,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        handleAdminDataChanged,
      );
      observer.disconnect();
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    entries.filter((entry) => {
      if (
        status !== "all" &&
        entry.status !== status
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        entry.title,
        entry.status,
        entry.description,
        String(entry.ballots),
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });

  function jumpToCreate() {
    const target =
      document.getElementById(
        "poll-new",
      );

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToPoll(
    id: string,
  ) {
    const target =
      document.getElementById(
        `admin-poll-${id}`,
      ) as HTMLDetailsElement | null;

    if (!target) return;

    target.open = true;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;

    const oldOffset =
      target.style.outlineOffset;

    const oldShadow =
      target.style.boxShadow;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";

    target.style.outlineOffset =
      "3px";

    target.style.boxShadow =
      "0 0 18px rgba(var(--sep-rgb-177-132-75),0.16)";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
      target.style.boxShadow =
        oldShadow;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Poll administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Find a Poll
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search the Poll archive, filter
        by its state, or jump straight
        to a Poll&apos;s controls.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search Polls..."
        aria-label="Search Polls"
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none transition focus:border-[rgb(var(--sep-colour-987344))] focus:shadow-[0_0_14px_rgba(var(--sep-rgb-177-132-75),0.12)] placeholder:text-[rgb(var(--sep-colour-665b4d))]"
      />

      <div className="mt-2 grid grid-cols-4 gap-1">
        {(
          [
            ["all", "All"],
            ["draft", "Draft"],
            ["open", "Open"],
            ["closed", "Closed"],
          ] as const
        ).map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setStatus(value)
              }
              className={[
                "border px-1.5 py-1.5 text-[7px] uppercase tracking-[0.1em] transition duration-150",
                status === value
                  ? "border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-332719))] text-[rgb(var(--sep-colour-efd9aa))] shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.12)]"
                  : "border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] text-[rgb(var(--sep-colour-8f806c))] hover:-translate-y-px hover:border-[rgb(var(--sep-colour-80613b))] hover:text-[rgb(var(--sep-colour-cbb28a))]",
              ].join(" ")}
            >
              {label}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        onClick={jumpToCreate}
        className="group mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2.5 text-left transition duration-150 hover:-translate-y-px hover:translate-x-0.5 hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-2c1e13))] hover:shadow-[0_0_16px_rgba(var(--sep-rgb-177-132-75),0.14)]"
      >
        <span>
          <span className="block font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-efd6a8))]">
            Create new Poll
          </span>
          <span className="mt-0.5 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
            New draft
          </span>
        </span>

        <span className="text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-c89b5d))]">
          +
        </span>
      </button>

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Polls · {visibleEntries.length}
        {query || status !== "all"
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToPoll(
                    entry.id,
                  )
                }
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition duration-150 hover:-translate-y-px hover:translate-x-0.5 hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_15px_rgba(var(--sep-rgb-177-132-75),0.13)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.title}
                  </span>

                  <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                    {entry.status}
                    {" · "}
                    {entry.ballots}{" "}
                    ballot
                    {entry.ballots === 1
                      ? ""
                      : "s"}
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))] transition duration-150 group-hover:translate-x-1 group-hover:text-[rgb(var(--sep-colour-c89b5d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching Polls.
          </p>
        )}
      </div>
    </div>
  );
}

type AdminTrophyContextEntry = {
  id: string;
  name: string;
  category: string;
  description: string;
  active: boolean;
};

function AdminTrophiesNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminTrophyContextEntry[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    const readEntries = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-admin-trophy-id]",
        ),
      );

      setEntries(
        nodes.map((node) => ({
          id:
            node.dataset.adminTrophyId ??
            "",
          name:
            node.dataset.adminTrophyName ??
            "Unnamed Trophy",
          category:
            node.dataset.adminTrophyCategory ??
            "",
          description:
            node.dataset.adminTrophyDescription ??
            "",
          active:
            node.dataset.adminTrophyActive ===
            "true",
        })),
      );
    };

    readEntries();

    const frame =
      window.requestAnimationFrame(
        readEntries,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    entries.filter((entry) => {
      if (!query) {
        return true;
      }

      return [
        entry.name,
        entry.category,
        entry.description,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });

  function jumpToTrophy(id: string) {
    const target =
      document.getElementById(
        `admin-trophy-${id}`,
      );

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Trophy administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Trophy
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search by Trophy name,
        category or description and
        jump directly to its editor.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search Trophies..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Trophies · {visibleEntries.length}
        {query
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToTrophy(
                    entry.id,
                  )
                }
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.name}
                  </span>

                  <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                    {entry.category}
                    {" · "}
                    {entry.active
                      ? "Active"
                      : "Inactive"}
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching Trophies.
          </p>
        )}
      </div>
    </div>
  );
}


function AdminWorldGuideContext() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        World administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        World Control Guide
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Use this page to control Sepulchria&apos;s game time, weather and temperature.
      </p>

      <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Normal play
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            Leave Time, Weather and Temperature on <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">Automatic</strong>.
            The world will manage itself.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Time
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">Automatic time ON</strong> keeps time moving.
            The Time Scale controls speed: 1× is normal, higher values are faster, and Paused stops game time.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Temporary weather
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            For an event, keep <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">Automatic weather ON</strong>,
            choose the weather and intensity, then choose how many <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">game hours</strong> it should last.
          </p>
          <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-817565))]">
            Example: Storm + Heavy + 6 game hours.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Temporary temperature
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            Keep <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">Automatic temperature ON</strong>,
            enter the temperature, then choose how many game hours it should last.
          </p>
          <p className="mt-2 text-[9px] leading-4 text-[rgb(var(--sep-colour-817565))]">
            Example: -5°C for 3 game hours.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-79513f))]/50 bg-[rgb(var(--sep-colour-21130f))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c29a75))]">
            Restore previous climate
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            Use this to end a temporary climate event early.
            It restores the exact weather and temperature that existed before the override.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Manual control
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            Turn an Automatic option <strong className="font-normal text-[rgb(var(--sep-colour-e0c89d))]">OFF</strong> only when staff want to control that setting indefinitely.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a88658))]">
            Automatic information
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-b8aa96))]">
            Moon phase, Season and the Aureth date are calculated from game time.
            Staff do not need to set them separately.
          </p>
        </section>

        <section className="border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-17110d))] p-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d0ad78))]">
            Simple rule
          </p>
          <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-d4c09f))]">
            Normal day: leave everything Automatic.
            Event: use a timed override.
            End it early: Restore previous climate.
          </p>
        </section>
      </div>
    </div>
  );
}

type AdminRegistrationContextEntry = {
  id: string;
  name: string;
  email: string;
  status: string;
};

function AdminRegistrationsNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminRegistrationContextEntry[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    const readEntries = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(
          "details[data-registration-id]",
        ),
      );

      setEntries(
        nodes.map((node) => ({
          id:
            node.dataset.registrationId ??
            "",
          name:
            node.dataset.registrationName ??
            "",
          email:
            node.dataset.registrationEmail ??
            "",
          status:
            node.dataset.registrationStatus ??
            "",
        })),
      );
    };

    readEntries();

    const frame =
      window.requestAnimationFrame(
        readEntries,
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    entries.filter((entry) => {
      if (!query) {
        return true;
      }

      return `${entry.name} ${entry.email}`
        .toLocaleLowerCase()
        .includes(query);
    });

  function jumpToRegistration(
    id: string,
  ) {
    const target =
      document.getElementById(
        `registration-application-${id}`,
      );

    if (
      target instanceof
      HTMLDetailsElement
    ) {
      target.open = true;
    }

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Registration administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Registration
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search applications by applicant name or email address.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search name or email..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Applications - {visibleEntries.length}
        {query
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToRegistration(
                    entry.id,
                  )
                }
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.name}
                  </span>

                  <span className="mt-0.5 block truncate text-[9px] text-[rgb(var(--sep-colour-817565))]">
                    {entry.email}
                  </span>

                  <span className="mt-1 block text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-6f6252))]">
                    {entry.status}
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching registrations.
          </p>
        )}
      </div>
    </div>
  );
}

type AdminMediaContextEntry = {
  repositoryPath: string;
  publicPath: string;
  previewUrl: string;
};

function adminMediaAnchorId(
  repositoryPath: string,
): string {
  return `admin-media-${encodeURIComponent(
    repositoryPath,
  ).replace(/%/g, "_")}`;
}

function AdminMediaNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminMediaContextEntry[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMedia() {
      try {
        const response = await fetch(
          "/api/admin/media",
          {
            cache: "no-store",
          },
        );

        const data =
          (await response.json()) as {
            images?: AdminMediaContextEntry[];
            error?: string;
          };

        if (cancelled) return;

        if (!response.ok) {
          setError(
            data.error ??
              "Unable to load media.",
          );
          setLoading(false);
          return;
        }

        setEntries(
          data.images ?? [],
        );
        setError(null);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;

        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to load media.",
        );
        setLoading(false);
      }
    }

    void loadMedia();

    return () => {
      cancelled = true;
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    entries.filter((entry) => {
      if (!query) {
        return true;
      }

      return [
        entry.publicPath,
        entry.repositoryPath,
        entry.previewUrl,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });

  function jumpToMedia(
    repositoryPath: string,
  ) {
    const target =
      document.getElementById(
        adminMediaAnchorId(
          repositoryPath,
        ),
      );

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Media administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Media
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search any part of an image URL or path and jump directly to that media item.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search media URL..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Media - {visibleEntries.length}
        {query
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            Loading media...
          </p>
        ) : error ? (
          <p className="text-xs leading-5 text-[rgb(var(--sep-colour-c58d82))]">
            Unable to load media.
          </p>
        ) : visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={
                  entry.repositoryPath
                }
                type="button"
                onClick={() =>
                  jumpToMedia(
                    entry.repositoryPath,
                  )
                }
                className="group flex w-full items-center gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-2 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-090705))]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      entry.previewUrl
                    }
                    alt=""
                    loading="lazy"
                    className="max-h-full max-w-full object-contain"
                  />
                </span>

                <span className="min-w-0 flex-1">
                  <code className="block break-all text-[9px] leading-4 text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.publicPath}
                  </code>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching media.
          </p>
        )}
      </div>
    </div>
  );
}

type AdminCodexContextEntry = {
  id: string;
  title: string;
  chapterNumber: number | null;
  body: string;
  status: string;
};

function normaliseCodexSearchText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function AdminCodexNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminCodexContextEntry[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadChapters() {
      const supabase = createClient();

      const {
        data,
        error: loadError,
      } = await supabase
        .from("codex_chapters")
        .select(
          "id, title, chapter_number, body, status, sort_order",
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("chapter_number", {
          ascending: true,
        });

      if (cancelled) return;

      if (loadError) {
        setError(loadError.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((row) => ({
          id: String(row.id),
          title: String(
            row.title ?? "Untitled chapter",
          ),
          chapterNumber:
            row.chapter_number === null
              ? null
              : Number(row.chapter_number),
          body: String(row.body ?? ""),
          status: String(
            row.status ?? "draft",
          ),
        })),
      );

      setError(null);
      setLoading(false);
    }

    void loadChapters();

    return () => {
      cancelled = true;
    };
  }, []);

  const query =
    normaliseCodexSearchText(search);

  const visibleEntries =
    entries.filter((entry) => {
      if (!query) {
        return true;
      }

      const searchable =
        normaliseCodexSearchText(
          `${entry.title} ${entry.body}`,
        );

      return searchable.includes(query);
    });

  function jumpToChapter(id: string) {
    const target =
      document.getElementById(
        `codex-chapter-${id}`,
      );

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Codex administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Chapter
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search chapter headings or text and jump directly to the matching chapter.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search title or content..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Chapters · {visibleEntries.length}
        {query
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            Loading chapters...
          </p>
        ) : error ? (
          <p className="text-xs leading-5 text-[rgb(var(--sep-colour-c58d82))]">
            Unable to load Codex chapters.
          </p>
        ) : visibleEntries.length ? (
          visibleEntries.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() =>
                jumpToChapter(entry.id)
              }
              className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="min-w-0">
                <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.title}
                </span>

                <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                  Chapter{" "}
                  {entry.chapterNumber ??
                    "—"}{" "}
                  · {entry.status}
                </span>
              </span>

              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                →
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching chapters.
          </p>
        )}
      </div>
    </div>
  );
}

type AdminNotificationContextEntry = {
  id: string;
  title: string;
  type: string;
  body: string;
  source: string;
  active: boolean;
};

function AdminNotificationsNavigatorContext() {
  const [entries, setEntries] =
    useState<AdminNotificationContextEntry[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let frame: number | null =
      null;

    const readEntries = () => {
      frame = null;

      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-admin-notification-id]",
        ),
      );

      setEntries(
        nodes.map((node) => ({
          id:
            node.dataset.adminNotificationId ??
            "",
          title:
            node.dataset.adminNotificationTitle ??
            "Untitled Notification",
          type:
            node.dataset.adminNotificationType ??
            "",
          body:
            node.dataset.adminNotificationBody ??
            "",
          source:
            node.dataset.adminNotificationSource ??
            "",
          active:
            node.dataset.adminNotificationActive ===
            "true",
        })),
      );
    };

    const scheduleRead = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }

      frame =
        window.requestAnimationFrame(
          readEntries,
        );
    };

    scheduleRead();

    const observer =
      new MutationObserver(
        scheduleRead,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "data-admin-notification-title",
          "data-admin-notification-type",
          "data-admin-notification-body",
          "data-admin-notification-source",
          "data-admin-notification-active",
        ],
      },
    );

    window.addEventListener(
      "sepulchria:admin-data-changed",
      scheduleRead,
    );

    return () => {
      observer.disconnect();

      if (frame !== null) {
        window.cancelAnimationFrame(
          frame,
        );
      }

      window.removeEventListener(
        "sepulchria:admin-data-changed",
        scheduleRead,
      );
    };
  }, []);

  const query =
    search
      .trim()
      .toLocaleLowerCase();

  const visibleEntries =
    entries.filter((entry) => {
      if (!query) {
        return true;
      }

      return [
        entry.title,
        entry.type,
        entry.body,
        entry.source,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });

  function jumpToNotification(
    id: string,
  ) {
    const target =
      document.getElementById(
        `admin-notification-${id}`,
      );

    if (!target) return;

    if (
      target instanceof
      HTMLDetailsElement
    ) {
      target.open = true;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline =
      target.style.outline;
    const oldOffset =
      target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset =
      "3px";

    window.setTimeout(() => {
      target.style.outline =
        oldOutline;
      target.style.outlineOffset =
        oldOffset;
    }, 1200);
  }

  function jumpToNew() {
    document
      .getElementById(
        "notification-new",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Notification administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Notification
      </h2>

      <button
        type="button"
        onClick={jumpToNew}
        className="mt-4 w-full border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2.5 text-left text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d9c092))] transition hover:border-[rgb(var(--sep-colour-a07945))]"
      >
        + Create new notification
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search notifications..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Notifications · {visibleEntries.length}
        {query
          ? ` / ${entries.length}`
          : ""}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleEntries.length ? (
          visibleEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToNotification(
                    entry.id,
                  )
                }
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.06)]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.title}
                  </span>

                  <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                    {entry.type}
                    {" · "}
                    {entry.source}
                    {" · "}
                    {entry.active
                      ? "Active"
                      : "Disabled"}
                  </span>
                </span>

                <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching notifications.
          </p>
        )}
      </div>
    </div>
  );
}


type AdminNavigationEntry = {
  section: AdminSection;
  label: string;
  href: string;
  aliases?: string[];
};

const ADMIN_NAVIGATION_ENTRIES: AdminNavigationEntry[] = [
  { section: "races", label: "Ancestries", href: "/admin/races", aliases: ["races"] },
  { section: "areas", label: "Areas", href: "/admin/areas" },
  { section: "associations", label: "Associations", href: "/admin/associations" },
  { section: "character_logs", label: "Character Log", href: "/admin/character-audit", aliases: ["audit"] },
  { section: "characters", label: "Characters", href: "/admin/characters" },
  { section: "codex", label: "Codex", href: "/admin/codex" },
  { section: "items", label: "Crafting Recipes", href: "/admin/crafting-recipes", aliases: ["recipes", "crafting"] },
  { section: "missions", label: "Daily Missions", href: "/admin/missions", aliases: ["missions", "daily"] },
  { section: "events", label: "Events", href: "/admin/events" },
  { section: "experience", label: "Experience", href: "/admin/experience", aliases: ["feedback", "satisfaction"] },
  { section: "expertise", label: "Expertise", href: "/admin/expertise" },
  { section: "gifts", label: "Feats", href: "/admin/gifts", aliases: ["gifts"] },
  { section: "forum", label: "Forum", href: "/admin/forum" },
  { section: "gathering", label: "Gathering", href: "/admin/gathering" },
  { section: "house_of_chances", label: "House of Chances", href: "/admin/house-of-chances", aliases: ["chances", "gambling", "fortune"] },
  { section: "items", label: "Item Vault", href: "/admin/items/vault", aliases: ["vault"] },
  { section: "items", label: "Items", href: "/admin/items" },
  { section: "jobs", label: "Jobs", href: "/admin/jobs" },
  { section: "rooms", label: "Locations", href: "/admin/rooms", aliases: ["rooms"] },
  { section: "communication_logs", label: "Logs", href: "/admin/communication-logs", aliases: ["communication logs"] },
  { section: "market", label: "Market", href: "/admin/market" },
  { section: "media", label: "Media", href: "/admin/media" },
  { section: "notifications", label: "Notifications", href: "/admin/notifications", aliases: ["alerts", "bell"] },
  { section: "polls", label: "Polls", href: "/admin/polls", aliases: ["poll", "votes", "voting"] },
  { section: "orders", label: "Orders", href: "/admin/orders" },
  { section: "orders", label: "Order Submissions", href: "/admin/order-submissions", aliases: ["submissions"] },
  { section: "overview", label: "Overview", href: "/admin" },
  { section: "new_register", label: "Registrations", href: "/admin/registrations", aliases: ["registration"] },
  { section: "rules", label: "Rules", href: "/admin/rules" },
  { section: "safety", label: "Safety", href: "/admin/safety" },
  { section: "sanctions", label: "Sanctions", href: "/admin/sanctions" },
  { section: "shapes", label: "Shapes", href: "/admin/shapes" },
  { section: "tickets", label: "Tickets", href: "/admin/tickets" },
  { section: "tidings", label: "Tidings", href: "/admin/tidings" },
  { section: "trophies", label: "Trophies", href: "/admin/trophies" },
  { section: "users", label: "Users", href: "/admin/users" },
  { section: "world", label: "World", href: "/admin/world" },
];

function isStaffRole(value: unknown): value is StaffRole {
  return (
    value === "owner" ||
    value === "admin" ||
    value === "moderator" ||
    value === "master"
  );
}

function AdminNavigationContext() {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRole() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        setError("Unable to identify the current staff member.");
        setLoading(false);
        return;
      }

      const {
        data: staffMember,
        error: staffError,
      } = await supabase
        .from("staff_members")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (
        staffError ||
        !staffMember ||
        !isStaffRole(staffMember.role)
      ) {
        setError("Unable to load staff navigation permissions.");
        setLoading(false);
        return;
      }

      setRole(staffMember.role);
      setError(null);
      setLoading(false);
    }

    void loadRole();

    return () => {
      cancelled = true;
    };
  }, []);

  const query = search.trim().toLocaleLowerCase();

  const visibleEntries = role
    ? ADMIN_NAVIGATION_ENTRIES.filter((entry) => {
        if (!canAccessAdminSection(role, entry.section)) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          entry.label,
          entry.section,
          ...(entry.aliases ?? []),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query);
      })
    : [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Admin Navigation
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search the sections available to your staff role and open the page directly.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search admin pages..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Pages · {visibleEntries.length}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            Loading admin pages...
          </p>
        ) : error ? (
          <p className="text-xs leading-5 text-[rgb(var(--sep-colour-c58d82))]">
            {error}
          </p>
        ) : visibleEntries.length ? (
          visibleEntries.map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                {entry.label}
              </span>
              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                →
              </span>
            </Link>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching admin pages.
          </p>
        )}
      </div>
    </div>
  );
}

type AdminCharacterJumpField = {
  id: string;
  label: string;
  aliases?: string[];
};

const ADMIN_CHARACTER_JUMP_FIELDS: AdminCharacterJumpField[] = [
  { id: "admin-character-summary", label: "Character administration", aliases: ["summary", "overview", "identity"] },
  { id: "admin-character-summary-legal-name", label: "Legal name", aliases: ["name"] },
  { id: "admin-character-summary-display-name", label: "Display name" },
  { id: "admin-character-summary-pronouns", label: "Pronouns" },
  { id: "admin-character-summary-gender", label: "Gender" },
  { id: "admin-character-summary-sexual-orientation", label: "Sexual orientation" },
  { id: "admin-character-summary-date-of-birth", label: "Date of birth", aliases: ["dob", "birthday", "age"] },
  { id: "admin-character-summary-birthplace", label: "Birthplace" },
  { id: "admin-character-summary-origin", label: "Origin" },
  { id: "admin-character-summary-public-slug", label: "Public slug", aliases: ["slug"] },
  { id: "admin-character-summary-owner-user-id", label: "Owner user ID", aliases: ["owner", "user"] },
  { id: "admin-character-section-biography", label: "Biography", aliases: ["bio"] },
  { id: "admin-character-section-physical-description", label: "Physical description", aliases: ["appearance", "physical"] },
  { id: "admin-character-section-personality", label: "Personality" },
  { id: "admin-character-section-public-notes", label: "Public notes", aliases: ["notes"] },
  { id: "admin-character-section-relationships", label: "Relationships" },
  { id: "admin-character-section-offgame", label: "Offgame", aliases: ["off game", "ooc"] },
  { id: "admin-character-field-first-name", label: "First name" },
  { id: "admin-character-field-surname", label: "Surname", aliases: ["last name"] },
  { id: "admin-character-field-portrait-url", label: "Portrait URL", aliases: ["portrait", "image"] },
  { id: "admin-character-field-character-music-url", label: "Character music URL", aliases: ["music", "theme"] },
  { id: "admin-character-health", label: "Character Health", aliases: ["health", "hp"] },
  { id: "admin-character-attributes", label: "Character attributes", aliases: ["attributes", "stats"] },
  { id: "admin-character-field-ancestry", label: "Ancestry", aliases: ["race"] },
  { id: "admin-character-field-public-title", label: "Public title", aliases: ["title"] },
  { id: "admin-character-field-private-staff-notes", label: "Private staff notes", aliases: ["staff notes", "private notes"] },
  { id: "admin-character-review", label: "Review and classification", aliases: ["review", "status", "classification"] },
  { id: "admin-character-approval-record", label: "Approval record", aliases: ["approval"] },
  { id: "admin-character-danger-zone", label: "Danger zone", aliases: ["delete", "deletion"] },
];

function AdminCharacterFieldNavigator() {
  const [search, setSearch] = useState("");

  const query = search.trim().toLocaleLowerCase();

  const visibleFields = ADMIN_CHARACTER_JUMP_FIELDS.filter((field) => {
    if (!query) return true;
    return [field.label, ...(field.aliases ?? [])]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query);
  });

  function jumpToField(id: string) {
    const target =
      document.getElementById(id);

    if (!target) return;

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const oldOutline = target.style.outline;
    const oldOffset = target.style.outlineOffset;

    target.style.outline =
      "1px solid rgb(var(--sep-colour-8d6d3e))";
    target.style.outlineOffset = "3px";

    window.setTimeout(() => {
      target.style.outline = oldOutline;
      target.style.outlineOffset = oldOffset;
    }, 1200);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Character administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Field
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search this character record and jump directly to the field or section you need.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search fields..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-655c50))] focus:border-[rgb(var(--sep-colour-8a673f))]"
      />

      <p className="mb-2 mt-4 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Fields · {visibleFields.length}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {visibleFields.length ? (
          visibleFields.map((field) => (
            <button
              key={field.label}
              type="button"
              onClick={() => jumpToField(field.id)}
              className="flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                {field.label}
              </span>
              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))]">
                →
              </span>
            </button>
          ))
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No matching fields.
          </p>
        )}
      </div>
    </div>
  );
}

function AdminShapesJumpContext() {
  const [entries,setEntries]=useState<JumpEntry[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  useEffect(()=>{let cancelled=false;async function load(){const supabase=createClient();const {data,error}=await supabase.from("shapes").select("id,name,word_of_power,level,is_active").order("level").order("name");if(cancelled)return;if(error){setError(error.message);setLoading(false);return;}setEntries((data??[]).map(row=>({id:String(row.id),label:String(row.name),secondary:`L${String(row.level)} · ${String(row.word_of_power)}`,active:row.is_active===true})));setLoading(false);setError(null);}void load();return()=>{cancelled=true;};},[]);
  const q=search.trim().toLowerCase();
  const visible=entries.filter(e=>!q||e.label.toLowerCase().includes(q)||(e.secondary??"").toLowerCase().includes(q));
  function jump(entry:JumpEntry){const el=document.getElementById(`shape-${entry.id}`);if(el instanceof HTMLDetailsElement)el.open=true;el?.scrollIntoView({behavior:"smooth",block:"start"});}
  function create(){document.getElementById("shape-new")?.scrollIntoView({behavior:"smooth",block:"start"});}
  return <div className="flex h-full min-h-0 flex-col"><p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">Administration</p><h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Jump to Shapes</h2><p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">Search the Shape catalogue and jump directly to a Shape.</p><button type="button" onClick={create} className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))]"><span>Create new</span><span>+</span></button><label className="mt-3 block"><span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Search Shapes</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name or Word of Power..." className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none"/><span className="mt-1.5 block text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">{visible.length}{q?` / ${entries.length}`:""} Shapes</span></label>{error?<p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-d8a49a))]">{error}</p>:null}<div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">{loading?<p className="text-[10px] text-[rgb(var(--sep-colour-8f8271))]">Loading...</p>:<div className="space-y-1.5">{visible.map(e=><button key={e.id} type="button" onClick={()=>jump(e)} className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left"><span className="min-w-0"><span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">{e.label}</span><span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">{e.secondary}</span></span><span className={`h-1.5 w-1.5 rounded-full ${e.active?"bg-emerald-600":"bg-[rgb(var(--sep-colour-66594b))]"}`}/></button>)}</div>}</div></div>;
}

function AdminGiftsJumpContext() {
  const [entries, setEntries] =
    useState<JumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from("gifts")
          .select(
            "id, name, is_active, sort_order",
          )
          .order(
            "sort_order",
            { ascending: true },
          )
          .order("name");

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map(
          (row) => ({
            id: String(row.id),
            label: String(row.name),
            secondary:
              row.is_active === true
                ? "Active"
                : "Inactive",
            active:
              row.is_active === true,
          }),
        ),
      );

      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const query =
    search.trim().toLowerCase();

  const visibleEntries =
    entries.filter(
      (entry) =>
        !query ||
        entry.label
          .toLowerCase()
          .includes(query),
    );

  function jumpToGift(
    entry: JumpEntry,
  ) {
    const input =
      document.querySelector<HTMLInputElement>(
        `input[name="giftId"][value="${CSS.escape(
          entry.id,
        )}"]`,
      );

    const details =
      input?.closest<HTMLDetailsElement>(
        "details",
      ) ?? null;

    if (details) {
      details.open = true;

      window.requestAnimationFrame(
        () => {
          details.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        },
      );

      return;
    }

    const anchor =
      document.getElementById(
        `gift-${entry.id}`,
      );

    if (
      anchor instanceof
      HTMLDetailsElement
    ) {
      anchor.open = true;
    }

    anchor?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToCreate() {
    const anchor =
      document.getElementById(
        "gift-new",
      );

    if (anchor) {
      anchor.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    document
      .querySelector<HTMLElement>(
        "main section",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to Feats
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search the Feats catalogue
        and jump directly to the
        definition you want to edit.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
      >
        <span>Create new</span>
        <span>+</span>
      </button>

      <label className="mt-3 block">
        <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Search Feats
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search by name..."
          className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
        />

        <span className="mt-1.5 block text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">
          {visibleEntries.length}
          {query
            ? ` / ${entries.length}`
            : ""}{" "}
          Feats
        </span>
      </label>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 7,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleEntries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jumpToGift(entry)
                  }
                  className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                      {entry.label}
                    </span>

                    <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                      {entry.secondary}
                    </span>
                  </span>

                  <span
                    title={
                      entry.active
                        ? "Active"
                        : "Inactive"
                    }
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      entry.active
                        ? "bg-emerald-600"
                        : "bg-[rgb(var(--sep-colour-66594b))]"
                    }`}
                  />
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        visibleEntries.length ===
          0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            {query
              ? "No Feats match this search."
              : "No Feats found."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function AdminRecordJumpContext({
  mode,
}: {
  mode: Exclude<
    ContextMode,
    "forum"
  >;
}) {
  const [entries, setEntries] =
    useState<JumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      try {
        let next: JumpEntry[] =
          [];

        if (mode === "areas") {
          const { data, error } =
            await supabase
              .from("areas")
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (mode === "rooms") {
          const { data, error } =
  await supabase
    .from("rooms")
    .select(
      "id, name, slug, is_active, sort_order, area:areas(name)",
    )
    .order("name", {
      ascending: true,
    });

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => {
              const area =
                Array.isArray(
                  row.area,
                )
                  ? row.area[0]
                  : row.area;

              return {
                id: String(row.id),
                label: String(
                  row.name,
                ),
                secondary:
                  area &&
                  typeof area ===
                    "object" &&
                  "name" in area
                    ? String(
                        area.name,
                      )
                    : String(
                        row.slug,
                      ),
                active:
                  row.is_active ===
                  true,
              };
            },
          );
        }

        if (mode === "races") {
          const { data, error } =
            await supabase
              .from("races")
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (
          mode ===
          "associations"
        ) {
          const { data, error } =
            await supabase
              .from(
                "associations",
              )
              .select(
                "id, name, slug, is_active, sort_order",
              )
              .order(
                "sort_order",
                {
                  ascending: true,
                },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(
                row.name,
              ),
              secondary: String(
                row.slug,
              ),
              active:
                row.is_active ===
                true,
            }),
          );
        }

        if (mode === "items") {
          const { data, error } =
            await supabase
              .from("items")
              .select(
                "id, name, quality, is_active, sort_order",
              )
              .order(
                "sort_order",
                { ascending: true },
              )
              .order("name");

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label: String(row.name),
              secondary: String(
                row.quality ?? "average",
              ),
              active:
                row.is_active === true,
            }),
          );
        }

        if (mode === "users") {
          const { data, error } =
            await supabase.rpc(
              "list_admin_users",
            );

          if (error) {
            throw error;
          }

          next = (
            (data ?? []) as Array<{
              user_id: string;
              email:
                | string
                | null;
              staff_role:
                | string
                | null;
            }>
          ).map((row) => ({
            id: row.user_id,
            label:
              row.email ??
              "Email unavailable",
            secondary:
              row.staff_role ??
              "Player",
          }));
        }

        if (
          mode === "characters"
        ) {
          const { data, error } =
            await supabase
              .from("characters")
              .select(
                "id, first_name, surname, display_name, status, updated_at",
              )
              .eq("is_system", false)
              .order(
                "updated_at",
                {
                  ascending: false,
                },
              );

          if (error) {
            throw error;
          }

          next = (data ?? []).map(
            (row) => ({
              id: String(row.id),
              label:
                String(
                  row.display_name ??
                    "",
                ).trim() ||
                `${String(
                  row.first_name ??
                    "",
                )} ${String(
                  row.surname ?? "",
                )}`.trim() ||
                "Unnamed character",
              secondary: String(
                row.status ??
                  "draft",
              ),
            }),
          );
        }

        if (!cancelled) {
          setEntries(next);
          setError(null);
          setLoading(false);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to load records.",
          );
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [mode]);

  const title =
    mode === "rooms"
      ? "Locations"
      : mode === "races"
        ? "Ancestries"
        : mode ===
            "associations"
          ? "Associations"
          : mode ===
              "characters"
            ? "Characters"
            : mode ===
                "users"
              ? "Users"
              : mode ===
                  "items"
                ? "Items"
                : "Areas";

  function jumpTo(
    entry: JumpEntry,
  ) {
    let target:
      | HTMLElement
      | null = null;

    if (mode === "races") {
      target =
        document.getElementById(
          `race-${entry.secondary}`,
        );
    } else if (
      mode === "associations"
    ) {
      target =
        document.getElementById(
          `association-${entry.secondary}`,
        );
    } else if (
      mode === "areas"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="areaId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;
    } else if (
      mode === "rooms"
    ) {
      target =
        document.getElementById(
          `room-${entry.id}`,
        ) ??
        document
          .querySelector<HTMLInputElement>(
            `input[name="roomId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ??
        null;
    } else if (
      mode === "items"
    ) {
      const details =
        document.getElementById(
          `item-${entry.id}`,
        );

      if (
        details instanceof
        HTMLDetailsElement
      ) {
        details.open = true;
      }

      target =
        details instanceof HTMLElement
          ? details
          : null;
    } else if (
      mode === "users"
    ) {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="userId"][value="${CSS.escape(
              entry.id,
            )}"]`,
          )
          ?.closest<HTMLElement>(
            "section",
          ) ?? null;
    } else if (
      mode === "characters"
    ) {
      const link =
        document.querySelector<HTMLAnchorElement>(
          `a[href="/admin/characters/${CSS.escape(
            entry.id,
          )}"]`,
        );

      target =
        link?.closest<HTMLElement>(
          "article, section",
        ) ?? null;

      if (!target) {
        window.location.href =
          `/admin/characters/${entry.id}`;
        return;
      }
    }

    if (!target) {
      return;
    }

    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToConnections() {
    document
      .getElementById(
        "room-connections",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function jumpToCreate() {
    if (mode === "races") {
      document
        .getElementById(
          "race-new",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      return;
    }

    if (
      mode === "associations"
    ) {
      document
        .getElementById(
          "association-new",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      return;
    }

    if (mode === "items") {
      document
        .getElementById(
          "item-new",
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      return;
    }

    const firstSection =
      document.querySelector<HTMLElement>(
        ".admin-compact main section",
      );

    firstSection?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Jump to {title}
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Jump directly to the
        record you want to work
        on.
      </p>

      {![
        "users",
        "characters",
      ].includes(mode) ? (
        <button
          type="button"
          onClick={jumpToCreate}
          className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
        >
          <span>
            Create new
          </span>
          <span>+</span>
        </button>
      ) : null}

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-10 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {entries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jumpTo(entry)
                  }
                  className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                      {entry.label}
                    </span>

                    {entry.secondary ? (
                      <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                        {
                          entry.secondary
                        }
                      </span>
                    ) : null}
                  </span>

                  {typeof entry.active ===
                  "boolean" ? (
                    <span
                      title={
                        entry.active
                          ? "Active"
                          : "Inactive"
                      }
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                        entry.active
                          ? "bg-emerald-600"
                          : "bg-[rgb(var(--sep-colour-66594b))]"
                      }`}
                    />
                  ) : (
                    <span className="shrink-0 text-[10px] text-[rgb(var(--sep-colour-725a3d))]">
                      ↓
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No records found.
          </p>
        ) : null}
      </div>

      {mode === "rooms" ? (
        <div className="mt-3 shrink-0 border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-3">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
            Connections
          </p>

          <button
            type="button"
            onClick={jumpToConnections}
            className="mt-2 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
          >
            <span>
              <span className="block font-serif text-[13px] text-[rgb(var(--sep-colour-d6b37d))]">
                Room connections
              </span>

              <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                Existing paths
              </span>
            </span>

            <span className="shrink-0 text-[11px] text-[rgb(var(--sep-colour-8d693e))]">
              ↓
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ModerationLog = {
  id: string;
  action: string;
  created_at: string;
  details:
    | Record<
        string,
        unknown
      >
    | null;
};

function ForumModerationContext() {
  const [logs, setLogs] =
    useState<ModerationLog[]>(
      [],
    );
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase =
        createClient();

      const { data, error } =
        await supabase
          .from(
            "forum_moderation_log",
          )
          .select(
            "id, action, created_at, details",
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(12);

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setLogs(
        (data ??
          []) as ModerationLog[],
      );
      setError(null);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  function formatAction(
    value: string,
  ) {
    return value
      .replace(/_/g, " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      );
  }

  function formatDate(
    value: string,
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }

    return new Intl.DateTimeFormat(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-amber-500">
        Forum administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Moderation Log
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Latest recorded staff
        actions across the forum.
      </p>

      <Link
        href="/admin/forum/moderation"
        className="mt-3 border border-amber-800/60 bg-amber-950/20 px-3 py-2.5 text-center text-[9px] uppercase tracking-[0.16em] text-amber-300 transition hover:border-amber-600 hover:bg-amber-950/40"
      >
        Open full log
      </Link>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] text-[rgb(var(--sep-colour-d8a49a))]">
          The moderation log
          could not be loaded.
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 5,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {logs.map((log) => {
              const topic =
                typeof log.details
                  ?.topic_title ===
                "string"
                  ? log.details
                      .topic_title
                  : null;

              return (
                <div
                  key={log.id}
                  className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[9px] uppercase tracking-[0.13em] text-amber-400">
                      {formatAction(
                        log.action,
                      )}
                    </span>

                    <span className="shrink-0 text-[8px] text-[rgb(var(--sep-colour-665a4b))]">
                      {formatDate(
                        log.created_at,
                      )}
                    </span>
                  </div>

                  {topic ? (
                    <p className="mt-1 truncate font-serif text-xs text-[rgb(var(--sep-colour-baa68a))]">
                      {topic}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {!loading &&
        !error &&
        logs.length === 0 ? (
          <p className="text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No moderation actions
            have been recorded yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

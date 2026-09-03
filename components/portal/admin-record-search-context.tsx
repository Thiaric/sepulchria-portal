"use client";

import { useEffect, useMemo, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type Mode =
  | "items"
  | "locations"
  | "orders"
  | "users"
  | "events"
  | "tidings"
  | "expertise";

type Entry = {
  id: string;
  label: string;
  secondary?: string;
  tertiary?: string;
  active?: boolean;
  searchText: string;
  category?: string;
  quality?: string;
  role?: string;
  slug?: string;
};

export function AdminRecordSearchContext({ mode }: { mode: Mode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [quality, setQuality] = useState("all");
  const [role, setRole] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();

      try {
        let next: Entry[] = [];

        if (mode === "items") {
          const [itemsResult, categoriesResult] = await Promise.all([
            supabase
              .from("items")
              .select("id, name, category_id, quality, is_active, sort_order")
              .order("sort_order", { ascending: true })
              .order("name", { ascending: true }),
            supabase
              .from("item_categories")
              .select("id, name, sort_order")
              .order("sort_order", { ascending: true }),
          ]);

          const loadError = itemsResult.error ?? categoriesResult.error;
          if (loadError) throw loadError;

          const categoryById = new Map(
            (categoriesResult.data ?? []).map((row) => [
              String(row.id),
              String(row.name),
            ]),
          );

          next = (itemsResult.data ?? []).map((row) => {
            const categoryName =
              categoryById.get(String(row.category_id)) ?? "Uncategorised";
            const qualityName = String(row.quality ?? "average");

            return {
              id: String(row.id),
              label: String(row.name),
              secondary: categoryName,
              tertiary: qualityName,
              category: categoryName,
              quality: qualityName,
              active: row.is_active === true,
              searchText: `${String(row.name)} ${categoryName} ${qualityName}`,
            };
          });
        }

        if (mode === "locations") {
          const { data, error } = await supabase
            .from("rooms")
            .select("id, name, slug, is_active, area:areas(name)")
            .order("name", { ascending: true });

          if (error) throw error;

          next = (data ?? []).map((row) => {
            const relation = Array.isArray(row.area) ? row.area[0] : row.area;
            const area =
              relation && typeof relation === "object" && "name" in relation
                ? String(relation.name)
                : "No area";

            return {
              id: String(row.id),
              label: String(row.name),
              secondary: area,
              slug: String(row.slug),
              active: row.is_active === true,
              searchText: `${String(row.name)} ${String(row.slug)} ${area}`,
            };
          });
        }

        if (mode === "orders") {
          const { data, error } = await supabase
            .from("orders")
            .select(
              "id, name, slug, is_active, sort_order, association:associations(name)",
            )
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true });

          if (error) throw error;

          next = (data ?? []).map((row) => {
            const relation = Array.isArray(row.association)
              ? row.association[0]
              : row.association;
            const association =
              relation && typeof relation === "object" && "name" in relation
                ? String(relation.name)
                : "No Association";

            return {
              id: String(row.id),
              label: String(row.name),
              secondary: association,
              slug: String(row.slug),
              active: row.is_active === true,
              searchText: `${String(row.name)} ${String(row.slug)} ${association}`,
            };
          });
        }

        if (mode === "users") {
          const [usersResult, charactersResult] = await Promise.all([
            supabase.rpc("list_admin_users"),
            supabase
              .from("characters")
              .select("user_id, first_name, surname, display_name")
              .order("created_at", { ascending: true }),
          ]);

          const loadError = usersResult.error ?? charactersResult.error;
          if (loadError) throw loadError;

          const namesByUser = new Map<string, string[]>();

          for (const character of charactersResult.data ?? []) {
            const userId = String(character.user_id ?? "");
            if (!userId) continue;

            const name =
              String(character.display_name ?? "").trim() ||
              `${String(character.first_name ?? "").trim()} ${String(
                character.surname ?? "",
              ).trim()}`.trim() ||
              "Unnamed character";

            const names = namesByUser.get(userId) ?? [];
            names.push(name);
            namesByUser.set(userId, names);
          }

          next = (
            (usersResult.data ?? []) as Array<{
              user_id: string;
              email: string | null;
              staff_role: string | null;
            }>
          ).map((row) => {
            const roleName = row.staff_role ?? "Player";
            const characters = namesByUser.get(String(row.user_id)) ?? [];
            const characterText = characters.length
              ? characters.join(", ")
              : "No character";

            return {
              id: String(row.user_id),
              label: row.email ?? "Email unavailable",
              secondary: roleName,
              tertiary: characterText,
              role: roleName,
              searchText: `${row.email ?? ""} ${roleName} ${characterText}`,
            };
          });
        }

        if (mode === "events") {
          const { data, error } = await supabase
            .from("calendar_events")
            .select("id, title, event_date, is_active")
            .order("event_date", { ascending: false });

          if (error) throw error;

          next = (data ?? []).map((row) => {
            const date = String(row.event_date ?? "Calendar event");
            return {
              id: String(row.id),
              label: String(row.title),
              secondary: date,
              active: row.is_active === true,
              searchText: `${String(row.title)} ${date}`,
            };
          });
        }

        if (mode === "tidings") {
          const { data, error } = await supabase
            .from("tidings")
            .select("id, title, priority, is_active, created_at")
            .order("created_at", { ascending: false })
            .limit(100);

          if (error) throw error;

          next = (data ?? []).map((row) => {
            const priority = String(row.priority ?? "normal");
            return {
              id: String(row.id),
              label: String(row.title),
              secondary: priority,
              active: row.is_active === true,
              searchText: `${String(row.title)} ${priority}`,
            };
          });
        }


        if (mode === "expertise") {
          const { data, error } = await supabase.rpc(
            "staff_expertise_overview",
          );

          if (error) throw error;

          next = (
            (data ?? []) as Array<{
              character_id: string;
              display_name: string;
              expertise: number | string;
            }>
          )
            .map((row) => {
              const expertise = Number(row.expertise);

              return {
                id: String(row.character_id),
                label: String(row.display_name),
                secondary:
                  `${Number.isFinite(expertise) ? expertise.toFixed(1) : "0.0"} Expertise`,
                searchText:
                  `${String(row.display_name)} ${String(row.character_id)} ${String(row.expertise)}`,
              };
            })
            .sort((a, b) =>
              a.label.localeCompare(b.label),
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
            caught instanceof Error ? caught.message : "Unable to load records.",
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

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const qualities = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.quality)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const roles = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.role)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [entries],
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (mode === "items" && category !== "all" && entry.category !== category) {
        return false;
      }
      if (mode === "items" && quality !== "all" && entry.quality !== quality) {
        return false;
      }
      if (mode === "users" && role !== "all" && entry.role !== role) {
        return false;
      }

      return !query || entry.searchText.toLowerCase().includes(query);
    });
  }, [entries, search, mode, category, quality, role]);

  function jumpTo(entry: Entry) {
    let target: HTMLElement | null = null;

    if (mode === "items") {
      target =
        document.getElementById(`item-${entry.id}`) ??
        document
          .querySelector<HTMLInputElement>(
            `input[name="itemId"][value="${CSS.escape(entry.id)}"]`,
          )
          ?.closest<HTMLElement>("details") ??
        null;
    }

    if (mode === "locations") {
      target =
        document.getElementById(`room-${entry.slug}`) ??
        document.getElementById(`room-${entry.id}`) ??
        document
          .querySelector<HTMLInputElement>(
            `input[name="roomId"][value="${CSS.escape(entry.id)}"]`,
          )
          ?.closest<HTMLElement>("details, section, article") ??
        null;
    }

    if (mode === "orders") {
      target = document.getElementById(`order-${entry.slug}`);
    }

    if (mode === "users") {
      target =
        document.getElementById(`user-${entry.id}`) ??
        document
          .querySelector<HTMLInputElement>(
            `input[name="userId"][value="${CSS.escape(entry.id)}"]`,
          )
          ?.closest<HTMLElement>("article, details, section") ??
        null;
    }

    if (mode === "events") {
      target = document.getElementById(`event-${entry.id}`);
    }

    if (mode === "tidings") {
      target =
        document
          .querySelector<HTMLInputElement>(
            `input[name="id"][value="${CSS.escape(entry.id)}"]`,
          )
          ?.closest<HTMLElement>("article, details, section") ?? null;
    }


    if (mode === "expertise") {
      target = document.getElementById(
        `expertise-character-${entry.id}`,
      );
    }

    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToCreate() {
    const targetId =
      mode === "items"
        ? "item-new"
        : mode === "locations"
          ? "room-new"
          : mode === "orders"
            ? "order-new"
            : mode === "events"
              ? "event-new"
              : null;

    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      return;
    }

    document.querySelector<HTMLElement>("main section")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  const title =
    mode === "locations"
      ? "Locations"
      : mode === "expertise"
        ? "Character"
        : mode.charAt(0).toUpperCase() + mode.slice(1);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Administration
      </p>
      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">Jump to {title}</h2>
      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        {mode === "expertise"
          ? "Search characters live and jump directly to their Expertise row."
          : "Search the catalogue and jump directly to the record you want to edit."}
      </p>

      {mode !== "users" && mode !== "expertise" ? (
        <button
          type="button"
          onClick={jumpToCreate}
          className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-2.5 text-left text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d6b37d))] transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
        >
          <span>Create new</span>
          <span>+</span>
        </button>
      ) : null}

      <div className="mt-3 space-y-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${title}...`}
          className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
        />

        {mode === "items" ? (
          <div className="grid grid-cols-2 gap-2">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] text-[rgb(var(--sep-colour-bda787))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>

            <select
              value={quality}
              onChange={(event) => setQuality(event.target.value)}
              className="min-w-0 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[9px] capitalize text-[rgb(var(--sep-colour-bda787))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
            >
              <option value="all">All qualities</option>
              {qualities.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        ) : null}

        {mode === "users" ? (
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-bda787))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
          >
            <option value="all">All roles</option>
            {roles.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        ) : null}

        <p className="text-right text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">
          {visible.length}
          {(search.trim() || category !== "all" || quality !== "all" || role !== "all") &&
          visible.length !== entries.length
            ? ` / ${entries.length}`
            : ""}{" "}
          {title}
        </p>
      </div>

      {error ? (
        <p className="mt-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-2.5 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error}
        </p>
      ) : null}

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-12 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {visible.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => jumpTo(entry)}
                className="group flex w-full items-center justify-between gap-2 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.label}
                  </span>
                  {entry.secondary ? (
                    <span className="mt-0.5 block truncate text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-806d55))]">
                      {entry.secondary}
                      {entry.tertiary ? ` · ${entry.tertiary}` : ""}
                    </span>
                  ) : null}
                </span>

                {typeof entry.active === "boolean" ? (
                  <span
                    title={entry.active ? "Active" : "Inactive"}
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                      entry.active ? "bg-emerald-600" : "bg-[rgb(var(--sep-colour-66594b))]"
                    }`}
                  />
                ) : null}
              </button>
            ))}
          </div>
        )}

        {!loading && !error && visible.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            No {title} match these filters.
          </p>
        ) : null}
      </div>
    </div>
  );
}

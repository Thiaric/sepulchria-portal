"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: string;
  name: string;
  active: boolean;
  personal: boolean;
};

export function MusicContextPanel() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const read = () => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-admin-music-track-id]",
        ),
      );

      setEntries(
        nodes.map((node) => ({
          id: node.dataset.adminMusicTrackId ?? "",
          name: node.dataset.adminMusicTrackName ?? "Untitled Track",
          active: node.dataset.adminMusicTrackActive === "true",
          personal: node.dataset.adminMusicTrackPersonal === "true",
        })),
      );
    };

    read();
    const frame = window.requestAnimationFrame(read);

    window.addEventListener(
      "sepulchria:admin-data-changed",
      read,
    );

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        read,
      );
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return entries;

    return entries.filter((entry) =>
      [
        entry.name,
        entry.active ? "active" : "inactive",
        entry.personal ? "personal" : "location only",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [entries, search]);

  function jumpToCreate() {
    document
      .getElementById("music-new")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function jumpToTrack(id: string) {
    const target = document.getElementById(
      `admin-music-${id}`,
    );

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Music administration
      </p>

      <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
        Music Catalogue
      </h2>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Upload tracks or jump directly to an existing track.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-4 w-full border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2.5 text-left font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-a17a49))]"
      >
        + Add Track
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search music..."
        className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <div className="mt-3 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
        {visible.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => jumpToTrack(entry.id)}
            className="w-full border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-80613b))]"
          >
            <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
              {entry.name}
            </span>
            <span className="mt-1 block text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
              {entry.active ? "Active" : "Inactive"} ·{" "}
              {entry.personal
                ? "Personal"
                : "Location only"}
            </span>
          </button>
        ))}

        {visible.length === 0 ? (
          <p className="px-2 py-5 text-center text-[10px] text-[rgb(var(--sep-colour-706452))]">
            No matching tracks.
          </p>
        ) : null}
      </div>
    </div>
  );
}

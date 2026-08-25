"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createOrderJobLinkLive,
  deleteOrderJobLinkLive,
} from "@/app/(portal)/admin/orders/structure-actions";

export type ProgressionRole = {
  id: string;
  name: string;
  level: number;
  sort_order: number;
};

export type ProgressionLink = {
  id: string;
  from_job_id: string;
  to_job_id: string;
};

type Props = {
  orderId: string;
  roles: ProgressionRole[];
  initialLinks: ProgressionLink[];
};

export function OrderRoleProgressionEditor({
  orderId,
  roles,
  initialLinks,
}: Props) {
  const [links, setLinks] = useState(initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const rolesByLevel = useMemo(() => {
    const map = new Map<number, ProgressionRole[]>();

    for (const role of roles) {
      const current = map.get(role.level) ?? [];
      current.push(role);
      map.set(role.level, current);
    }

    for (const values of map.values()) {
  values.sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.name.localeCompare(b.name),
  );
}

    return map;
  }, [roles]);

  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );

  const levels = useMemo(
    () => [...rolesByLevel.keys()].sort((a, b) => b - a),
    [rolesByLevel],
  );

  function addLink(fromJobId: string, toJobId: string) {
    if (!toJobId) return;

    const key = `add:${fromJobId}:${toJobId}`;
    setError(null);
    setPendingKey(key);

    startTransition(async () => {
      try {
        const result = await createOrderJobLinkLive({
          orderId,
          fromJobId,
          toJobId,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setLinks((current) =>
          current.some((link) => link.id === result.link.id)
            ? current
            : [...current, result.link],
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to add Role progression link.",
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  function removeLink(linkId: string) {
    const key = `remove:${linkId}`;
    setError(null);
    setPendingKey(key);

    startTransition(async () => {
      try {
        const result = await deleteOrderJobLinkLive({
          orderId,
          linkId,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        setLinks((current) =>
          current.filter((link) => link.id !== linkId),
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to remove Role progression link.",
        );
      } finally {
        setPendingKey(null);
      }
    });
  }

  return (
    <div className="mt-6 border border-[rgb(var(--sep-colour-765937))]/35 bg-[rgb(var(--sep-colour-0d0a08))] p-4">
      <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        Role progression map
      </p>

      <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-817565))]">
        Add as many links as you need. Each connection points from a Role to
        a Role on the Level immediately above it. Incoming links are derived
        automatically, so every Role can have multiple paths below and above.
      </p>

      {error ? (
        <div className="mt-3 border border-red-900/55 bg-red-950/20 px-3 py-2 text-[10px] text-red-300">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-5">
        {levels.map((level) => {
          const levelRoles = rolesByLevel.get(level) ?? [];

          return (
            <div
              key={level}
              className="grid gap-2 md:grid-cols-[56px_minmax(0,1fr)]"
            >
              <div>
                <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
                  Level
                </p>
                <p className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-d8bf91))]">
                  {level}
                </p>
              </div>

              <div className="flex flex-nowrap justify-center gap-2">
  {levelRoles.map((role) => {
    const incoming = links
      .filter((link) => link.to_job_id === role.id)
      .map((link) => ({
        link,
        role: roleById.get(link.from_job_id) ?? null,
      }))
      .filter(
        (
          item,
        ): item is {
          link: ProgressionLink;
          role: ProgressionRole;
        } => Boolean(item.role),
      );

    const outgoing = links
      .filter((link) => link.from_job_id === role.id)
      .map((link) => ({
        link,
        role: roleById.get(link.to_job_id) ?? null,
      }))
      .filter(
        (
          item,
        ): item is {
          link: ProgressionLink;
          role: ProgressionRole;
        } => Boolean(item.role),
      );

    const linkedAbove = new Set(
      outgoing.map(({ role: target }) => target.id),
    );

    const candidates = (
      rolesByLevel.get(level + 1) ?? []
    ).filter(
      (candidate) => !linkedAbove.has(candidate.id),
    );

    return (
      <div
        key={role.id}
        className="w-[196px] shrink-0 self-stretch border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-15100d))] p-2.5"
      >
        <p className="font-serif text-[13px] text-[rgb(var(--sep-colour-d3ba8c))]">
          {role.name}
        </p>

        <div className="mt-3">
          <p className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-665c50))]">
            From lower Level
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            {incoming.length ? (
              incoming.map(({ link, role: source }) => (
                <span
                  key={link.id}
                  className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-2 py-1 text-[6px] text-[rgb(var(--sep-colour-a58d6a))]"
                >
                  L{source.level} · {source.name}
                </span>
              ))
            ) : (
              <span className="text-[7px] italic text-[rgb(var(--sep-colour-5e554a))]">
                No incoming links
              </span>
            )}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-665c50))]">
            To higher Level
          </p>

          <div className="mt-1 space-y-1.5">
            {outgoing.map(({ link, role: target }) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-2 border border-[rgb(var(--sep-colour-765937))]/35 bg-[rgb(var(--sep-colour-1b130d))] px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-[6px] text-[rgb(var(--sep-colour-c0a174))]">
                  → L{target.level} · {target.name}
                </span>

                <button
                  type="button"
                  disabled={
                    isPending &&
                    pendingKey === `remove:${link.id}`
                  }
                  onClick={() => removeLink(link.id)}
                  className="shrink-0 text-[6px] uppercase text-red-300 disabled:opacity-40"
                >
                  {isPending &&
                  pendingKey === `remove:${link.id}`
                    ? "Removing..."
                    : "Remove"}
                </button>
              </div>
            ))}

            {candidates.length ? (
              <select
                key={`${role.id}-${links.length}`}
                defaultValue=""
                disabled={isPending}
                onChange={(event) => {
                  const value = event.target.value;

                  if (!value) {
                    return;
                  }

                  addLink(role.id, value);
                  event.currentTarget.value = "";
                }}
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 py-2 text-[8px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none disabled:opacity-50"
              >
                <option value="" disabled>
                  Link to Level {level + 1} Role
                </option>

                {candidates.map((candidate) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.name}
                  </option>
                ))}
              </select>
            ) : rolesByLevel.has(level + 1) ? (
              <p className="text-[7px] italic text-[rgb(var(--sep-colour-5e554a))]">
                All available Roles above are linked.
              </p>
            ) : (
              <p className="text-[7px] italic text-[rgb(var(--sep-colour-5e554a))]">
                Highest Level
              </p>
            )}
          </div>
        </div>
      </div>
    );
  })}
</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type PublicOrderGraphRole = {
  id: string;
  name: string;
  level: number;
  description: string | null;
  muscles_modifier: number;
  reflexes_modifier: number;
  vigour_modifier: number;
  shrewd_modifier: number;
  brains_modifier: number;
  presence_modifier: number;
};

export type PublicOrderGraphLink = {
  id: string;
  from_job_id: string;
  to_job_id: string;
};

type Props = {
  roles: PublicOrderGraphRole[];
  links: PublicOrderGraphLink[];
  payByLevel?: Record<number, string>;
};

type Line = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
};

function modifiers(role: PublicOrderGraphRole) {
  return [
    ["Mus", role.muscles_modifier],
    ["Ref", role.reflexes_modifier],
    ["Vig", role.vigour_modifier],
    ["Shr", role.shrewd_modifier],
    ["Bra", role.brains_modifier],
    ["Pre", role.presence_modifier],
  ] as const;
}

export function PublicOrderRoleGraph({
  roles,
  links,
  payByLevel = {},
}: Props) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const nodeRefs =
    useRef(new Map<string, HTMLDivElement>());

  const [lines, setLines] =
    useState<Line[]>([]);

  const levels = useMemo(
    () =>
      [...new Set(roles.map((role) => role.level))]
        .sort((a, b) => b - a),
    [roles],
  );

  const rolesByLevel = useMemo(() => {
    const map =
      new Map<number, PublicOrderGraphRole[]>();

    for (const level of levels) {
      map.set(
        level,
        roles
          .filter((role) => role.level === level)
          .sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
      );
    }

    return map;
  }, [levels, roles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graphContainer = container;

    function calculate() {
      const parent =
        graphContainer.getBoundingClientRect();

      const nextLines: Line[] = [];

      for (const link of links) {
        const lower =
          nodeRefs.current.get(
            link.from_job_id,
          );

        const upper =
          nodeRefs.current.get(
            link.to_job_id,
          );

        if (!lower || !upper) {
          continue;
        }

        const lowerRect =
          lower.getBoundingClientRect();

        const upperRect =
          upper.getBoundingClientRect();

        nextLines.push({
          id: link.id,
          fromX:
            lowerRect.left -
            parent.left +
            lowerRect.width / 2,
          fromY:
            lowerRect.top -
            parent.top,
          toX:
            upperRect.left -
            parent.left +
            upperRect.width / 2,
          toY:
            upperRect.bottom -
            parent.top,
        });
      }

      setLines(nextLines);
    }

    calculate();

    const observer =
      new ResizeObserver(calculate);

    observer.observe(graphContainer);

    for (const node of nodeRefs.current.values()) {
      observer.observe(node);
    }

    window.addEventListener(
      "resize",
      calculate,
    );

    return () => {
      observer.disconnect();
      window.removeEventListener(
        "resize",
        calculate,
      );
    };
  }, [links, roles]);

  if (!roles.length) {
    return (
      <p className="mt-4 text-sm italic text-[rgb(var(--sep-colour-807463))]">
        No Roles have been configured.
      </p>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative mt-5 overflow-x-auto border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-4 sm:px-5"
    >
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-visible"
      >
        {lines.map((line) => {
          const midY =
            (line.fromY + line.toY) / 2;

          return (
            <path
              key={line.id}
              d={[
                `M ${line.fromX} ${line.fromY}`,
                `C ${line.fromX} ${midY}`,
                `${line.toX} ${midY}`,
                `${line.toX} ${line.toY}`,
              ].join(" ")}
              fill="none"
              stroke="rgba(157,123,78,0.62)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>

      <div className="relative z-10 min-w-[620px] space-y-7">
        {levels.map((level) => {
          const levelRoles =
            rolesByLevel.get(level) ?? [];

          return (
            <div
              key={level}
              className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-3"
            >
              <div className="text-center">
                <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-665c50))]">
                  Level
                </p>
                <p className="font-serif text-lg text-[rgb(var(--sep-colour-c3a778))]">
                  {level}
                </p>

                {payByLevel[level] ? (
                  <p className="mt-1 text-[7px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-9b815d))]">
                    {payByLevel[level]} / month
                  </p>
                ) : null}
              </div>

              <div className="flex justify-center gap-3">
                {levelRoles.map((role) => {
                  const active =
                    modifiers(role).filter(
                      ([, value]) => value !== 0,
                    );

                  return (
                    <div
                      key={role.id}
                      ref={(node) => {
                        if (node) {
                          nodeRefs.current.set(
                            role.id,
                            node,
                          );
                        } else {
                          nodeRefs.current.delete(
                            role.id,
                          );
                        }
                      }}
                      title={
                        role.description ??
                        undefined
                      }
                      className="w-[150px] shrink-0 border border-[rgb(var(--sep-colour-6c5031))]/60 bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-center"
                    >
                      <p className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-d6bd90))]">
                        {role.name}
                      </p>

                      {active.length ? (
                        <p className="mt-1 truncate text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-756958))]">
                          {active
                            .map(
                              ([label, value]) =>
                                `${label} ${
                                  value > 0
                                    ? "+"
                                    : ""
                                }${value}`,
                            )
                            .join(" · ")}
                        </p>
                      ) : (
                        <p className="mt-1 text-[7px] uppercase tracking-[0.08em] text-[rgb(var(--sep-colour-554d43))]">
                          No modifiers
                        </p>
                      )}
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

"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ProductEntry = {
  kind: "product";
  id: string;
  name: string;
  slug: string;
  status: string;
  active: boolean;
};

type RecordEntry = {
  kind: "record";
  id: string;
  email: string;
  character: string;
  user: string;
  status: string;
  environment: string;
  amount: string;
};

type Entry = ProductEntry | RecordEntry;

function readEntries(): Entry[] {
  const products =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-admin-contribution-product]",
      ),
    ).map(
      (node): ProductEntry => ({
        kind: "product",
        id:
          node.dataset
            .adminContributionProductId ??
          "",
        name:
          node.dataset
            .adminContributionProductName ??
          "Contribution product",
        slug:
          node.dataset
            .adminContributionProductSlug ??
          "",
        status:
          node.dataset
            .adminContributionProductStatus ??
          "",
        active:
          node.dataset
            .adminContributionProductActive ===
          "true",
      }),
    );

  const records =
    Array.from(
      document.querySelectorAll<HTMLElement>(
        "[data-admin-contribution-record]",
      ),
    ).map(
      (node): RecordEntry => ({
        kind: "record",
        id:
          node.dataset
            .adminContributionRecordId ??
          "",
        email:
          node.dataset
            .adminContributionEmail ??
          "",
        character:
          node.dataset
            .adminContributionCharacter ??
          "",
        user:
          node.dataset
            .adminContributionUser ??
          "",
        status:
          node.dataset
            .adminContributionStatus ??
          "",
        environment:
          node.dataset
            .adminContributionEnvironment ??
          "",
        amount:
          node.dataset
            .adminContributionAmount ??
          "",
      }),
    );

  return [...products, ...records];
}

function normalise(value: string) {
  return value
    .trim()
    .toLocaleLowerCase();
}

function labelStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

export function ContributionsContextPanel() {
  const [entries, setEntries] =
    useState<Entry[]>([]);
  const [search, setSearch] =
    useState("");

  useEffect(() => {
    let frame = 0;

    const refresh = () => {
      window.cancelAnimationFrame(
        frame,
      );

      frame =
        window.requestAnimationFrame(
          () => {
            setEntries(
              readEntries(),
            );
          },
        );
    };

    refresh();

    const observer =
      new MutationObserver(
        refresh,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    window.addEventListener(
      "sepulchria:admin-data-changed",
      refresh,
    );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
      observer.disconnect();
      window.removeEventListener(
        "sepulchria:admin-data-changed",
        refresh,
      );
    };
  }, []);

  const query =
    normalise(search);

  const products =
    useMemo(
      () =>
        entries
          .filter(
            (
              entry,
            ): entry is ProductEntry =>
              entry.kind ===
              "product",
          )
          .filter((entry) => {
            if (!query) {
              return true;
            }

            return [
              entry.name,
              entry.slug,
              entry.status,
              entry.active
                ? "active"
                : "inactive",
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query);
          }),
      [entries, query],
    );

  const records =
    useMemo(
      () =>
        entries
          .filter(
            (
              entry,
            ): entry is RecordEntry =>
              entry.kind ===
              "record",
          )
          .filter((entry) => {
            if (!query) {
              return true;
            }

            return [
              entry.email,
              entry.character,
              entry.user,
              entry.status,
              entry.environment,
              entry.amount,
            ]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query);
          }),
      [entries, query],
    );

  const allProducts =
    entries.filter(
      (entry) =>
        entry.kind ===
        "product",
    ).length;

  const allRecords =
    entries.filter(
      (entry) =>
        entry.kind ===
        "record",
    ).length;

  function jumpToCreate() {
    document
      .getElementById(
        "admin-contribution-create",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function jumpToRecords() {
    document
      .getElementById(
        "admin-contributions-records",
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }

  function jumpToProduct(
    id: string,
  ) {
    const target =
      document.getElementById(
        `admin-contribution-product-${id}`,
      );

    if (
      target instanceof
      HTMLDetailsElement
    ) {
      target.open = true;
    }

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function jumpToRecord(
    id: string,
  ) {
    document
      .getElementById(
        `admin-contribution-record-${id}`,
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <p className="text-[8px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-806b50))]">
        Contribution administration
      </p>

      <p className="mt-[4px] text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
        Search products and payment records, then jump directly to them.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-[4px] w-full border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2.5 text-left font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition hover:border-[rgb(var(--sep-colour-a17a49))]"
      >
        + Create product
      </button>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(
            event.target.value,
          )
        }
        placeholder="Search contributions..."
        className="mt-[4px] w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
      />

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Products · {products.length}
          {products.length !== allProducts ? ` / ${allProducts}` : ""}
        </p>

        <div className="mt-2 space-y-1.5">
          {products.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpToProduct(entry.id)}
              className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="min-w-0">
                <span className="block truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.name}
                </span>
                <span className="mt-0.5 block truncate text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6252))]">
                  {entry.slug} · {labelStatus(entry.status)} · {entry.active ? "Active" : "Inactive"}
                </span>
              </span>
              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-1">
                →
              </span>
            </button>
          ))}

          {products.length === 0 ? (
            <p className="px-2 py-3 text-[10px] text-[rgb(var(--sep-colour-706452))]">
              No matching products.
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-59432c))]/30 pt-3">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
            Payments · {records.length}
            {records.length !== allRecords ? ` / ${allRecords}` : ""}
          </p>

          <button
            type="button"
            onClick={jumpToRecords}
            className="text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-9b7c52))] transition hover:text-[rgb(var(--sep-colour-d3ad72))]"
          >
            Jump to ↓
          </button>
        </div>

        <div className="mt-2 space-y-1.5">
          {records.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => jumpToRecord(entry.id)}
              className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
            >
              <span className="min-w-0">
                <span className="block truncate font-serif text-[12px] text-[rgb(var(--sep-colour-cbb28a))] group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.character || entry.email || "Contribution"}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-[rgb(var(--sep-colour-837460))]">
                  {entry.email || entry.user}
                </span>
                <span className="mt-0.5 block truncate text-[7px] uppercase tracking-[0.11em] text-[rgb(var(--sep-colour-6f6252))]">
                  {entry.amount} · {labelStatus(entry.status)} · {entry.environment}
                </span>
              </span>
              <span className="shrink-0 text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-1">
                →
              </span>
            </button>
          ))}

          {records.length === 0 ? (
            <p className="px-2 py-3 text-[10px] text-[rgb(var(--sep-colour-706452))]">
              No matching payments.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";

type CodexEntryGridProps = {
  children: ReactNode;
  emptyTitle: string;
  emptyText: string;
};

export function CodexEntryGrid({
  children,
  emptyTitle,
  emptyText,
}: CodexEntryGridProps) {
  const hasEntries =
    Array.isArray(children)
      ? children.length > 0
      : Boolean(children);

  if (!hasEntries) {
    return (
      <section className="border border-[#60482e]/45 bg-[#15100d]/95 p-10 text-center">
        <h2 className="font-serif text-2xl text-[#d8c19a]">
          {emptyTitle}
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#938673]">
          {emptyText}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
      {children}
    </section>
  );
}
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
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]/95 p-10 text-center components_codex_codex_entry_grid_section_section">
        <h2 className="font-serif text-2xl text-[rgb(var(--sep-colour-d8c19a))] components_codex_codex_entry_grid_h2_heading">
          {emptyTitle}
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[rgb(var(--sep-colour-938673))] components_codex_codex_entry_grid_p_text">
          {emptyText}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3 components_codex_codex_entry_grid_section_section_2">
      {children}
    </section>
  );
}
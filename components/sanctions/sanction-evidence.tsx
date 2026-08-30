import { createAdminClient } from "@/lib/supabase/admin";

function fmt(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function label(value: string | null) {
  return (value ?? "content")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function characterProfileFieldLabel(
  value: unknown,
): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  return typeof record.character_profile_field_label === "string"
    ? record.character_profile_field_label
    : null;
}

type ContextRow = {
  id?: string;
  body?: string;
  message?: string;
  created_at?: string;
  author_name?: string;
  sender_name?: string;
};

function contextRows(context: unknown): ContextRow[] {
  if (!context || typeof context !== "object") return [];
  const record = context as Record<string, unknown>;
  const candidate =
    record.surrounding_posts ??
    record.surrounding_messages;

  return Array.isArray(candidate)
    ? candidate.filter(
        (row): row is ContextRow =>
          Boolean(row) && typeof row === "object",
      )
    : [];
}

export async function SanctionEvidence({
  ticketId,
}: {
  ticketId: string | null;
}) {
  if (!ticketId) return null;

  const admin = createAdminClient();

  const { data: evidence, error } = await admin
    .from("report_evidence")
    .select(
      "id,evidence_type,source_type,source_id,author_name_snapshot,content_snapshot,original_created_at,context_snapshot,captured_at",
    )
    .eq("ticket_id", ticketId)
    .order("captured_at", { ascending: true });

  if (error) {
    throw new Error("Unable to load sanction evidence.");
  }

  if (!evidence?.length) return null;

  return (
    <section
      data-sep-interaction-fixed="true"
      className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-1d1110))]"
    >
      <header className="border-b border-[rgb(var(--sep-colour-60482e))]/40 px-5 py-4">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-c98f7f))]">
          Preserved Evidence
        </p>
        <p className="mt-2 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-887a67))]">
          This contains only evidence preserved for the moderation case.
          The original ticket discussion and internal staff notes are not included.
        </p>
      </header>

      <div className="space-y-4 p-5">
        {evidence.map((item, index) => {
          const rows = contextRows(item.context_snapshot);

          return (
            <article
              key={item.id}
              data-sep-interactive-surface="row"
              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 transition-all duration-150 hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.06)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-4 py-3">
                <p className="text-[8px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-b58a69))]">
                  Evidence #{index + 1} · {characterProfileFieldLabel(item.context_snapshot) ?? label(item.source_type)}
                </p>
                <p className="text-[8px] text-[rgb(var(--sep-colour-756957))]">
                  Preserved {fmt(item.captured_at)}
                </p>
              </div>

              <div className="p-4">
                <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                  {characterProfileFieldLabel(item.context_snapshot)
                    ? `Preserved ${characterProfileFieldLabel(item.context_snapshot)}`
                    : "Original content"}
                  {item.author_name_snapshot
                    ? ` · ${item.author_name_snapshot}`
                    : ""}
                  {item.original_created_at
                    ? ` · ${fmt(item.original_created_at)}`
                    : ""}
                </p>

                <div className="mt-2 whitespace-pre-wrap break-words border-l-2 border-[rgb(var(--sep-colour-a65343))] bg-black/20 p-4 text-sm leading-6 text-[rgb(var(--sep-colour-d6c3aa))]">
                  {item.content_snapshot || "(No text snapshot)"}
                </div>

                {rows.length > 0 ? (
                  <div className="mt-5 space-y-2">
                    <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756957))]">
                      Preserved context
                    </p>

                    {rows.map((row, rowIndex) => (
                      <div
                        key={row.id ?? `${item.id}-${rowIndex}`}
                        data-sep-interactive-surface="row"
                        className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-black/10 p-3 transition-all duration-150 hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"
                      >
                        <p className="text-[7px] uppercase tracking-[0.13em] text-[rgb(var(--sep-colour-756957))]">
                          {row.author_name ?? row.sender_name ?? "Unknown"}
                          {row.created_at ? ` · ${fmt(row.created_at)}` : ""}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-5 text-[rgb(var(--sep-colour-bdac93))]">
                          {row.body ?? row.message ?? "(No text snapshot)"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

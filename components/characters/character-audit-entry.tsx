import {
  auditChangeRows,
  auditDisplayValue,
  auditEventLabel,
  auditRecordTypeLabel,
  auditSourceLabel,
  auditSummary,
  formatAuditDateTime,
  humanAuditLabel,
  prettyAuditValue,
  type CharacterAuditDisplayBase,
} from "@/lib/audit/character-audit-display";

export function CharacterAuditEntry({
  row,
  characterLabel = null,
}: {
  row: CharacterAuditDisplayBase;
  characterLabel?: string | null;
}) {
  const summary = auditSummary(row);
  const changes = auditChangeRows(row);
  const actorLabel = row.actor_label ?? row.actor_type;
  const dateLabel = formatAuditDateTime(row.created_at);

  return (
    <article data-sep-interaction-fixed="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-96774f))]">
            {auditEventLabel(row)}
          </p>
          {characterLabel ? (
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))]">
              {characterLabel}
            </h2>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="text-[9px] text-[rgb(var(--sep-colour-b49d7b))]">{dateLabel}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))]">
            {humanAuditLabel(row.operation)} · {auditRecordTypeLabel(row)}
          </p>
        </div>
      </div>

      <div className="mt-4 border-l-2 border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-100c09))] px-4 py-3">
        <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
          What happened
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-[rgb(var(--sep-colour-d4bea0))]">
          {summary}
        </p>
      </div>

      {changes.length ? (
        <div className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/35">
          <div className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
            <span>Field</span><span>Before</span><span /><span>After</span>
          </div>
          <div className="divide-y divide-[rgb(var(--sep-colour-59432c))]/25">
            {changes.map((change, index) => (
              <div
                key={`${change.field}-${index}`}
                className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 px-3 py-2.5 text-[9px]"
              >
                <span className="font-medium text-[rgb(var(--sep-colour-bfa77f))]">
                  {humanAuditLabel(change.field)}
                </span>
                <span className="break-words text-[rgb(var(--sep-colour-8f8271))]">
                  {auditDisplayValue(change.before)}
                </span>
                <span className="text-center text-[rgb(var(--sep-colour-6f6252))]">→</span>
                <span className="break-words text-[rgb(var(--sep-colour-cdb58d))]">
                  {auditDisplayValue(change.after)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {[
          ["Actor", actorLabel],
          ["Source", auditSourceLabel(row)],
          ["Record type", auditRecordTypeLabel(row)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3"
          >
            <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756958))]">
              {label}
            </p>
            <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <details className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]">
        <summary className="cursor-pointer px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))]">
          Technical details
        </summary>

        <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-3">
          <div className="grid gap-2 text-[8px] sm:grid-cols-2">
            <p>Audit ID: {row.id}</p>
            <p>Entity ID: {row.entity_id ?? "—"}</p>
            <p>Raw event: {humanAuditLabel(row.event_type)}</p>
            <p>Raw source: {humanAuditLabel(row.source)}</p>
            <p>Raw record type: {humanAuditLabel(row.entity_type)}</p>
            {row.item_name ? <p>Resolved Item: {row.item_name}</p> : null}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div>
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                Raw before
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                {prettyAuditValue(row.old_values)}
              </pre>
            </div>

            <div>
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                Raw after
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                {prettyAuditValue(row.new_values)}
              </pre>
            </div>
          </div>

          {row.metadata && Object.keys(row.metadata).length ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3">
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))]">
                Raw metadata
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                {prettyAuditValue(row.metadata)}
              </pre>
            </div>
          ) : null}
        </div>
      </details>
    </article>
  );
}

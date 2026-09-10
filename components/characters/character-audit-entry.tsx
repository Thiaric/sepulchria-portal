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
    <article data-sep-interaction-ignore="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4 components_characters_character_audit_entry_article_article">
      <div className="flex flex-wrap items-start justify-between gap-4 components_characters_character_audit_entry_div_container">
        <div className="min-w-0 components_characters_character_audit_entry_div_container_2">
          <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-96774f))] components_characters_character_audit_entry_p_text">
            {auditEventLabel(row)}
          </p>
          {characterLabel ? (
            <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-d8bf91))] components_characters_character_audit_entry_h2_heading">
              {characterLabel}
            </h2>
          ) : null}
        </div>

        <div className="shrink-0 text-right components_characters_character_audit_entry_div_container_3">
          <p className="text-[9px] text-[rgb(var(--sep-colour-b49d7b))] components_characters_character_audit_entry_p_text_2">{dateLabel}</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_text_3">
            {humanAuditLabel(row.operation)} · {auditRecordTypeLabel(row)}
          </p>
        </div>
      </div>

      <div className="mt-4 border-l-2 border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-100c09))] px-4 py-3 components_characters_character_audit_entry_div_container_4">
        <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_audit_entry_p_text_4">
          What happened
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-[rgb(var(--sep-colour-d4bea0))] components_characters_character_audit_entry_p_text_5">
          {summary}
        </p>
      </div>

      {changes.length ? (
        <div className="mt-3 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/35 components_characters_character_audit_entry_div_container_5">
          <div className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_div_container_6">
            <span className="components_characters_character_audit_entry_span_text">Field</span><span className="components_characters_character_audit_entry_span_text_2">Before</span><span className="components_characters_character_audit_entry_span_text_3" /><span className="components_characters_character_audit_entry_span_text_4">After</span>
          </div>
          <div className="divide-y divide-[rgb(var(--sep-colour-59432c))]/25 components_characters_character_audit_entry_div_container_7">
            {changes.map((change, index) => (
              <div
                key={`${change.field}-${index}`}
                className="grid grid-cols-[minmax(140px,0.65fr)_minmax(0,1fr)_24px_minmax(0,1fr)] gap-2 px-3 py-2.5 text-[9px] components_characters_character_audit_entry_div_container_8"
              >
                <span className="font-medium text-[rgb(var(--sep-colour-bfa77f))] components_characters_character_audit_entry_span_text_5">
                  {humanAuditLabel(change.field)}
                </span>
                <span className="break-words text-[rgb(var(--sep-colour-8f8271))] components_characters_character_audit_entry_span_text_6">
                  {auditDisplayValue(change.before)}
                </span>
                <span className="text-center text-[rgb(var(--sep-colour-6f6252))] components_characters_character_audit_entry_span_text_7">→</span>
                <span className="break-words text-[rgb(var(--sep-colour-cdb58d))] components_characters_character_audit_entry_span_text_8">
                  {auditDisplayValue(change.after)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 sm:grid-cols-3 components_characters_character_audit_entry_div_container_9">
        {[
          ["Actor", actorLabel],
          ["Source", auditSourceLabel(row)],
          ["Record type", auditRecordTypeLabel(row)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] p-3 components_characters_character_audit_entry_div_container_10"
          >
            <p className="text-[7px] uppercase tracking-[0.15em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_text_6">
              {label}
            </p>
            <p className="mt-1 text-[10px] text-[rgb(var(--sep-colour-b8a488))] components_characters_character_audit_entry_p_text_7">
              {value}
            </p>
          </div>
        ))}
      </div>

      <details className="mt-3 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] components_characters_character_audit_entry_details_technical_details">
        <summary className="cursor-pointer px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a98d65))] components_characters_character_audit_entry_summary_technical_details">
          Technical details
        </summary>

        <div className="border-t border-[rgb(var(--sep-colour-59432c))]/25 p-3 components_characters_character_audit_entry_div_technical_details">
          <div className="grid gap-2 text-[8px] sm:grid-cols-2 components_characters_character_audit_entry_div_technical_details_2">
            <p className="components_characters_character_audit_entry_p_technical_details">Audit ID: {row.id}</p>
            <p className="components_characters_character_audit_entry_p_technical_details_2">Entity ID: {row.entity_id ?? "—"}</p>
            <p className="components_characters_character_audit_entry_p_technical_details_3">Raw event: {humanAuditLabel(row.event_type)}</p>
            <p className="components_characters_character_audit_entry_p_technical_details_4">Raw source: {humanAuditLabel(row.source)}</p>
            <p className="components_characters_character_audit_entry_p_technical_details_5">Raw record type: {humanAuditLabel(row.entity_type)}</p>
            {row.item_name ? <p className="components_characters_character_audit_entry_p_text_8">Resolved Item: {row.item_name}</p> : null}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2 components_characters_character_audit_entry_div_technical_details_3">
            <div className="components_characters_character_audit_entry_div_technical_details_4">
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_technical_details_6">
                Raw before
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                {prettyAuditValue(row.old_values)}
              </pre>
            </div>

            <div className="components_characters_character_audit_entry_div_technical_details_5">
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_technical_details_7">
                Raw after
              </p>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                {prettyAuditValue(row.new_values)}
              </pre>
            </div>
          </div>

          {row.related_mutations?.length ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 components_characters_character_audit_entry_div_container_11">
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_text_9">
                Raw mutations in this action
              </p>

              <div className="mt-2 space-y-2 components_characters_character_audit_entry_div_container_12">
                {row.related_mutations.map((mutation) => (
                  <details
                    key={mutation.id}
                    className="border border-[rgb(var(--sep-colour-59432c))]/25 px-3 py-2 components_characters_character_audit_entry_details_details"
                  >
                    <summary className="cursor-pointer text-[8px] text-[rgb(var(--sep-colour-a98d65))] components_characters_character_audit_entry_summary_summary">
                      {humanAuditLabel(mutation.event_type)} · {humanAuditLabel(mutation.entity_type)}
                    </summary>

                    <div className="mt-2 grid gap-2 text-[8px] sm:grid-cols-2 components_characters_character_audit_entry_div_container_13">
                      <p className="components_characters_character_audit_entry_p_text_10">Audit ID: {mutation.id}</p>
                      <p className="components_characters_character_audit_entry_p_text_11">Entity ID: {mutation.entity_id ?? "—"}</p>
                      <p className="components_characters_character_audit_entry_p_text_12">Operation: {humanAuditLabel(mutation.operation)}</p>
                      <p className="components_characters_character_audit_entry_p_text_13">Source: {humanAuditLabel(mutation.source)}</p>
                    </div>

                    <div className="mt-2 grid gap-3 lg:grid-cols-2 components_characters_character_audit_entry_div_container_14">
                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                        {prettyAuditValue(mutation.old_values)}
                      </pre>
                      <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words text-[8px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
                        {prettyAuditValue(mutation.new_values)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ) : null}

          {row.metadata && Object.keys(row.metadata).length ? (
            <div className="mt-3 border-t border-[rgb(var(--sep-colour-59432c))]/25 pt-3 components_characters_character_audit_entry_div_container_15">
              <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-756958))] components_characters_character_audit_entry_p_text_14">
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

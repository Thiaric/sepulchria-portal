import type {
  ReactNode,
} from "react";

export function AdminOrderCollapsible({
  id,
  name,
  associationName,
  isActive,
  children,
}: {
  id: string;
  name: string;
  associationName: string;
  isActive: boolean;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group scroll-mt-24 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_admin_order_collapsible_details_details"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-transparent bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 transition hover:bg-[rgb(var(--sep-colour-18110d))] group-open:border-[rgb(var(--sep-colour-60482e))]/35 [&::-webkit-details-marker]:hidden components_admin_admin_order_collapsible_summary_summary">
        <div className="min-w-0 components_admin_admin_order_collapsible_div_container">
          <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_order_collapsible_p_text">
            {associationName}
          </p>

          <h3 className="mt-1 truncate font-serif text-xl text-[rgb(var(--sep-colour-dec69a))] components_admin_admin_order_collapsible_h3_heading">
            {name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-3 components_admin_admin_order_collapsible_div_container_2">
          <span
            className={[((`text-[8px] uppercase tracking-[0.14em] ${
              isActive
                ? "text-emerald-500"
                : "text-[rgb(var(--sep-colour-746858))]"
            }`)), "components_admin_admin_order_collapsible_span_text"].filter(Boolean).join(" ")}
          >
            {isActive
              ? "Active"
              : "Inactive"}
          </span>

          <span
            aria-hidden="true"
            className="text-sm text-[rgb(var(--sep-colour-9b7446))] transition-transform group-open:rotate-180 components_admin_admin_order_collapsible_span_text_2"
          >
            ▼
          </span>
        </div>
      </summary>

      {children}
    </details>
  );
}

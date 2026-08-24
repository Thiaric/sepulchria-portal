
from pathlib import Path

ROOT = Path.cwd()

def replace_once(path: Path, old: str, new: str, label: str):
    if not path.exists():
        raise SystemExit(f"ERROR [{label}]: file not found: {path}")
    text = path.read_text(encoding="utf-8")
    if new in text:
        print(f"Already applied [{label}]")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR [{label}]: expected exactly one matching block in {path}, found {count}. "
            "Stopped before writing this replacement."
        )
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Applied [{label}]")

sidebar = ROOT / "components/portal/portal-sidebar.tsx"

replace_once(
    sidebar,
'''  const [
    legalSafetyExpanded,
    setLegalSafetyExpanded,
  ] = useState(false);
''',
'''  const [
    legalSafetyExpanded,
    setLegalSafetyExpanded,
  ] = useState(false);

  const [
    servicesExpanded,
    setServicesExpanded,
  ] = useState(true);
''',
    "Services expanded state",
)

replace_once(
    sidebar,
'''            <section>
              <p className="mb-2 text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))]">
                services and
                utilities
              </p>

              <div className="grid grid-cols-1 gap-0.1">
''',
'''            <section className="mb-[var(--portal-group-gap)] border-b border-[rgb(var(--sep-colour-6e5535))]/20 pb-[var(--portal-group-gap)]">
              <button
                type="button"
                onClick={() =>
                  setServicesExpanded(
                    (current) =>
                      !current,
                  )
                }
                aria-expanded={
                  servicesExpanded
                }
                className="mb-1 flex w-full items-center justify-between text-left text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))] transition hover:text-[rgb(var(--sep-colour-b4a07f))]"
              >
                <span>
                  Services and Utilities
                </span>
                <span
                  aria-hidden="true"
                  className="ml-3 text-[12px] leading-none"
                >
                  {servicesExpanded
                    ? "−"
                    : "+"}
                </span>
              </button>

              {servicesExpanded ? (
              <div className="grid grid-cols-1 gap-0">
''',
    "Collapsible Services header",
)

replace_once(
    sidebar,
'''                {renderNavigationItem(
                  messagesItem,
                )}
              </div>
            </section>
''',
'''                {renderNavigationItem(
                  messagesItem,
                )}
              </div>
              ) : null}
            </section>
''',
    "Close Services collapsible content",
)

replace_once(
    sidebar,
'''function NavigationGroup({
  title,
  items,
}: {
  title: string;
  items: React.ReactNode[];
}) {
  return (
    <section className="mb-[var(--portal-group-gap)] border-b border-[rgb(var(--sep-colour-6e5535))]/20 pb-[var(--portal-group-gap)]">
      <p className="mb-2 text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))]">
        {title}
      </p>

      <div className="grid grid-cols-1 gap-0.1">
        {items}
      </div>
    </section>
  );
}''',
'''function NavigationGroup({
  title,
  items,
}: {
  title: string;
  items: React.ReactNode[];
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(true);

  return (
    <section className="mb-[var(--portal-group-gap)] border-b border-[rgb(var(--sep-colour-6e5535))]/20 pb-[var(--portal-group-gap)]">
      <button
        type="button"
        onClick={() =>
          setExpanded(
            (current) =>
              !current,
          )
        }
        aria-expanded={expanded}
        className="mb-1 flex w-full items-center justify-between text-left text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-766754))] transition hover:text-[rgb(var(--sep-colour-b4a07f))]"
      >
        <span>{title}</span>
        <span
          aria-hidden="true"
          className="ml-3 text-[12px] leading-none"
        >
          {expanded
            ? "−"
            : "+"}
        </span>
      </button>

      {expanded ? (
        <div className="grid grid-cols-1 gap-0">
          {items}
        </div>
      ) : null}
    </section>
  );
}''',
    "Collapsible NavigationGroup",
)

layout = ROOT / "app/(portal)/layout.tsx"

replace_once(
    layout,
'''                --portal-column-pad: 1rem;
                --portal-column-gap: 0.75rem;
                --portal-section-pad: 1rem;
                --portal-nav-y: 0.5rem;
                --portal-nav-min-h: 2.25rem;
                --portal-group-gap: 1rem;
''',
'''                --portal-column-pad: 0.8rem;
                --portal-column-gap: 0.65rem;
                --portal-section-pad: 0.8rem;
                --portal-nav-y: 0.26rem;
                --portal-nav-min-h: 1.85rem;
                --portal-group-gap: 0.62rem;
''',
    "Compact default sidebar spacing",
)

replace_once(
    layout,
'''                  --portal-column-pad: 0.75rem;
                  --portal-column-gap: 0.6rem;
                  --portal-section-pad: 0.75rem;
                  --portal-nav-y: 0.38rem;
                  --portal-nav-min-h: 2rem;
                  --portal-group-gap: 0.75rem;
''',
'''                  --portal-column-pad: 0.65rem;
                  --portal-column-gap: 0.52rem;
                  --portal-section-pad: 0.65rem;
                  --portal-nav-y: 0.22rem;
                  --portal-nav-min-h: 1.72rem;
                  --portal-group-gap: 0.5rem;
''',
    "Compact 820px sidebar spacing",
)

replace_once(
    layout,
'''                  --portal-column-pad: 0.6rem;
                  --portal-column-gap: 0.5rem;
                  --portal-section-pad: 0.6rem;
                  --portal-nav-y: 0.28rem;
                  --portal-nav-min-h: 1.8rem;
                  --portal-group-gap: 0.55rem;
''',
'''                  --portal-column-pad: 0.52rem;
                  --portal-column-gap: 0.44rem;
                  --portal-section-pad: 0.52rem;
                  --portal-nav-y: 0.18rem;
                  --portal-nav-min-h: 1.6rem;
                  --portal-group-gap: 0.42rem;
''',
    "Compact 720px sidebar spacing",
)

replace_once(
    layout,
'''                  --portal-column-pad: 0.45rem;
                  --portal-column-gap: 0.4rem;
                  --portal-section-pad: 0.5rem;
                  --portal-nav-y: 0.2rem;
                  --portal-nav-min-h: 1.65rem;
                  --portal-group-gap: 0.4rem;
''',
'''                  --portal-column-pad: 0.4rem;
                  --portal-column-gap: 0.36rem;
                  --portal-section-pad: 0.45rem;
                  --portal-nav-y: 0.14rem;
                  --portal-nav-min-h: 1.5rem;
                  --portal-group-gap: 0.34rem;
''',
    "Compact 640px sidebar spacing",
)

replace_once(
    layout,
'''              .sepulchria-viewport-body [data-portal-scroll] {
                scrollbar-width: thin;
                scrollbar-color: rgb(var(--sep-colour-5c472f)) transparent;
              }
''',
'''              /*
               * Keep selected text clearly visible inside all rich-text
               * contenteditable fields. This is especially important for
               * pale/high-key skins such as Humans' Mark.
               */
              .portal-skin-scope [contenteditable="true"]::selection,
              .portal-skin-scope [contenteditable="true"] *::selection {
                background: rgba(55, 102, 224, 0.86);
                color: #ffffff;
              }

              .portal-skin-scope [contenteditable="true"]::-moz-selection,
              .portal-skin-scope [contenteditable="true"] *::-moz-selection {
                background: rgba(55, 102, 224, 0.86);
                color: #ffffff;
              }

              .sepulchria-viewport-body [data-portal-scroll] {
                scrollbar-width: thin;
                scrollbar-color: rgb(var(--sep-colour-5c472f)) transparent;
              }
''',
    "Visible rich-text selection",
)

print("")
print("Sidebar compact/collapsible + rich-text selection patch complete.")
print("Run: npm run build")

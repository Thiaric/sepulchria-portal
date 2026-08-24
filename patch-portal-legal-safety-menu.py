
from pathlib import Path

path = Path("components/portal/portal-sidebar.tsx")
if not path.exists():
    raise SystemExit("ERROR: components/portal/portal-sidebar.tsx not found.")

text = path.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str):
    global text
    if new in text:
        print(f"Already applied [{label}]")
        return
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR [{label}]: expected exactly one matching block, found {count}. "
            "Stopped without writing the file."
        )
    text = text.replace(old, new, 1)
    print(f"Applied [{label}]")

replace_once(
'''const communityRulesItem: NavigationItem = {
  label: "Community Rules",
  title:
    "Read Sepulchria's Community Rules and safety requirements.",
  icon: "/icons/rules.png",
  href: "/community-rules",
  activePaths: [
    "/community-rules",
  ],
  opensModal: true,
};
''',
'''const communityRulesItem: NavigationItem = {
  label: "Community Rules",
  title:
    "Read Sepulchria's Community Rules and safety requirements.",
  icon: "/icons/rules.png",
  href: "/community-rules",
  activePaths: [
    "/community-rules",
  ],
  opensModal: true,
};

const safetyItem: NavigationItem = {
  label: "Safety",
  title:
    "Read Sepulchria's public safety and reporting information.",
  icon: "/icons/rules.png",
  href: "/safety",
  activePaths: ["/safety"],
  opensModal: true,
  subItem: true,
};

const agePolicyItem: NavigationItem = {
  label: "18+ Policy",
  title:
    "Read Sepulchria's age and 18+ eligibility policy.",
  icon: "/icons/rules.png",
  href: "/age-policy",
  activePaths: ["/age-policy"],
  opensModal: true,
  subItem: true,
};

const privacyItem: NavigationItem = {
  label: "Privacy",
  title:
    "Read Sepulchria's Privacy Notice.",
  icon: "/icons/rules.png",
  href: "/privacy",
  activePaths: ["/privacy"],
  opensModal: true,
  subItem: true,
};

const cookiesItem: NavigationItem = {
  label: "Cookies",
  title:
    "Read Sepulchria's Cookie Notice.",
  icon: "/icons/rules.png",
  href: "/cookies",
  activePaths: ["/cookies"],
  opensModal: true,
  subItem: true,
};

const termsItem: NavigationItem = {
  label: "Terms",
  title:
    "Read Sepulchria's Terms of Service.",
  icon: "/icons/rules.png",
  href: "/terms",
  activePaths: ["/terms"],
  opensModal: true,
  subItem: true,
};

const legalSafetyItems: NavigationItem[] = [
  communityRulesItem,
  safetyItem,
  agePolicyItem,
  privacyItem,
  cookiesItem,
  termsItem,
];
''',
"Legal & Safety modal items",
)

replace_once(
'''  const [
    rulesExpanded,
    setRulesExpanded,
  ] = useState(false);
''',
'''  const [
    rulesExpanded,
    setRulesExpanded,
  ] = useState(false);

  const [
    legalSafetyExpanded,
    setLegalSafetyExpanded,
  ] = useState(false);
''',
"Legal & Safety expanded state",
)

replace_once(
'''  function renderMobileItem(
    item: NavigationItem,
  ) {
''',
'''  function renderLegalSafetyMenu() {
    const anyModalOpen =
      legalSafetyItems.some(
        (item) =>
          modalItem?.href ===
          item.href,
      );

    return (
      <div className="min-w-0">
        <button
          type="button"
          onClick={() =>
            setLegalSafetyExpanded(
              (current) =>
                !current,
            )
          }
          aria-expanded={
            legalSafetyExpanded
          }
          aria-controls="legal-safety-submenu"
          className={`flex w-full items-center justify-between py-0.5 text-left text-[9px] uppercase tracking-[0.18em] transition ${
            anyModalOpen
              ? "text-[rgb(var(--sep-colour-d8bf91))]"
              : "text-[rgb(var(--sep-colour-9f8b70))] hover:text-[rgb(var(--sep-colour-d8bf91))]"
          }`}
        >
          <span>
            Legal &amp; Safety
          </span>

          <span
            aria-hidden="true"
            className="ml-3 text-[12px] leading-none"
          >
            {legalSafetyExpanded
              ? "−"
              : "+"}
          </span>
        </button>

        {legalSafetyExpanded ? (
          <div
            id="legal-safety-submenu"
            className="mt-1 border-l border-[rgb(var(--sep-colour-60482e))]/40 pl-3"
          >
            {legalSafetyItems.map(
              (item) => (
                <button
                  key={item.href}
                  type="button"
                  title={item.title}
                  onClick={() =>
                    setModalItem(
                      item,
                    )
                  }
                  className={`block w-full py-1 text-left text-[9px] tracking-[0.08em] transition ${
                    modalItem?.href ===
                    item.href
                      ? "text-[rgb(var(--sep-colour-efd9aa))]"
                      : "text-[rgb(var(--sep-colour-8f806d))] hover:text-[rgb(var(--sep-colour-d8bf91))]"
                  }`}
                  aria-haspopup="dialog"
                >
                  {item.label}
                </button>
              ),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  function renderMobileItem(
    item: NavigationItem,
  ) {
''',
"Legal & Safety expandable renderer",
)

replace_once(
'''            <PlayerSanctionsSidebarLink />

            <button
              type="button"
              onClick={() =>
                setModalItem(
                  communityRulesItem,
                )
              }
              className="block w-full py-0.5 text-left text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8b70))] transition hover:text-[rgb(var(--sep-colour-d8bf91))]"
            >
              Community Rules
            </button>
''',
'''            <PlayerSanctionsSidebarLink />

            {renderLegalSafetyMenu()}
''',
"Replace Community Rules footer link with expandable Legal & Safety",
)

path.write_text(text, encoding="utf-8")
print("")
print("Portal Legal & Safety menu patch complete.")
print("Run: npm run build")

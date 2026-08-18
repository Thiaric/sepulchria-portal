from pathlib import Path
import shutil

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

if not (ROOT / "package.json").exists():
    raise SystemExit("ERROR: Run this from the sepulchria-portal repository root.")

source_component = HERE / "files/components/portal/admin-record-search-context.tsx"
target_component = ROOT / "components/portal/admin-record-search-context.tsx"
target_component.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source_component, target_component)

source_doc = HERE / "files/docs/admin-context-sidebar.md"
target_doc = ROOT / "docs/admin-context-sidebar.md"
target_doc.parent.mkdir(parents=True, exist_ok=True)
shutil.copy2(source_doc, target_doc)

sidebar_path = ROOT / "components/portal/portal-responsive-right-sidebar.tsx"
sidebar = sidebar_path.read_text(encoding="utf-8")

def swap(text, old, new, label):
    if old not in text:
        raise SystemExit(f"ERROR: Could not find current sidebar block: {label}")
    return text.replace(old, new, 1)

if 'AdminRecordSearchContext' not in sidebar:
    sidebar = swap(
        sidebar,
        'import { AdminEventsTidingsContext } from "@/components/portal/admin-events-tidings-context";\n',
        'import { AdminEventsTidingsContext } from "@/components/portal/admin-events-tidings-context";\n'
        'import { AdminRecordSearchContext } from "@/components/portal/admin-record-search-context";\n',
        "context import",
    )

sidebar = swap(
    sidebar,
    '''  const isAdminTidingsPath =
    pathname === "/admin/tidings";

  const isAdminPath =
''',
    '''  const isAdminTidingsPath =
    pathname === "/admin/tidings";

  const isAdminItemsPath =
    pathname === "/admin/items";

  const isAdminLocationsPath =
    pathname === "/admin/rooms";

  const isAdminUsersPath =
    pathname === "/admin/users";

  const isAdminPath =
''',
    "path flags",
)

sidebar = swap(
    sidebar,
    '''              {isAdminOrdersPath ? (
                <AdminOrdersContext key={`orders-${adminRevision}`} />
              ) : isAdminRulesPath ? (
''',
    '''              {isAdminOrdersPath ? (
                <AdminRecordSearchContext
                  key={`orders-${adminRevision}`}
                  mode="orders"
                />
              ) : isAdminRulesPath ? (
''',
    "orders route",
)

sidebar = swap(
    sidebar,
    '''              ) : isAdminEventsPath ? (
                <AdminEventsTidingsContext key={`events-${adminRevision}`} mode="events" />
              ) : isAdminTidingsPath ? (
                <AdminEventsTidingsContext key={`tidings-${adminRevision}`} mode="tidings" />
              ) : isOwnCharacterPath ? (
''',
    '''              ) : isAdminEventsPath ? (
                <AdminRecordSearchContext
                  key={`events-${adminRevision}`}
                  mode="events"
                />
              ) : isAdminTidingsPath ? (
                <AdminRecordSearchContext
                  key={`tidings-${adminRevision}`}
                  mode="tidings"
                />
              ) : isAdminItemsPath ? (
                <AdminRecordSearchContext
                  key={`items-${adminRevision}`}
                  mode="items"
                />
              ) : isAdminLocationsPath ? (
                <AdminRecordSearchContext
                  key={`locations-${adminRevision}`}
                  mode="locations"
                />
              ) : isAdminUsersPath ? (
                <AdminRecordSearchContext
                  key={`users-${adminRevision}`}
                  mode="users"
                />
              ) : isOwnCharacterPath ? (
''',
    "events/tidings/items/locations/users routes",
)

sidebar_path.write_text(sidebar, encoding="utf-8")

print("SUCCESS")
print("Installed searchable context panels for Items, Locations, Orders, Users, Events and Tidings.")
print("Rules retain the current dedicated searchable Rules & Glossary navigator.")
print("Added docs/admin-context-sidebar.md as the future admin-page convention.")
print("No SQL required.")
print("Now run: npm run build")

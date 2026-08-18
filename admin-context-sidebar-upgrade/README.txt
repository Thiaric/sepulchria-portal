SEPULCHRIA — ADMIN RIGHT SIDEBAR CONTEXT UPGRADE

Built against the current "Admin almost done" repository.

UPGRADED
Items
- search by Item name, Category or Quality
- Category dropdown
- Quality dropdown
- Category + Quality shown per record
- jump to Item

Locations (/admin/rooms)
- search by Location name, slug or Area
- Area shown per record
- jump to/open Location

Orders
- search by Order name, slug or Association
- Association shown per record
- jump to/open Order

Users
- search by email, associated Character or role
- role dropdown
- role shown
- associated Character(s) shown
- jump to User

CREATED / STANDARDISED
Events
- search
- date shown
- create-new jump
- jump to/open event

Tidings
- search
- priority shown
- create-new jump
- jump to record

Rules
The repository already has a dedicated AdminRulesContext with searchable Rules
and Glossary lists, status information, and jump-to-record behaviour. It remains
the dedicated context panel.

LIVE
All these panels are keyed by adminRevision, so the existing
sepulchria:admin-data-changed event immediately reloads the panel after successful
admin changes.

FUTURE RULE
docs/admin-context-sidebar.md is added to the repository: every new /admin
management page must ship with a searchable right-sidebar context navigator in
the same development change.

INSTALL
From repository root:

  py .\admin-context-sidebar-upgrade\install.py
  npm run build

No SQL required.

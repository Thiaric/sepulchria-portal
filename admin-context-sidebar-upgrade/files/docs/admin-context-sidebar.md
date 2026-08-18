# Admin right-sidebar context convention

Every new management page under `/admin/...` must ship with a right-sidebar context navigator in the same change.

Minimum requirements:
- Search field.
- Useful filters when records have classifications, qualities, roles, statuses, etc.
- Compact record list.
- Clicking a result jumps to and opens the matching record on the current page.
- Live refresh via the existing `sepulchria:admin-data-changed` / `adminRevision` mechanism.
- `Create new` jump when the admin page has a creation section.

Use a dedicated context component for richer admin pages, or register the page in the generic `AdminContextPanel` when simple navigation is sufficient.

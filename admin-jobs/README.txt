SEPULCHRIA — ADMIN JOBS

Adds /admin/jobs with:
- Admin navigation link
- Create Odd Job
- Edit name
- Edit description
- Searchable right-sidebar Admin Context
- Jump-to-record and Create New navigation

The economy rules are deliberately NOT editable here:
- starting pay remains random 10–50
- daily capacity remains 50
- pay decay remains 10% every 5 completed shifts
- UK-midnight reset remains unchanged

No SQL required.

Install:
  py .\admin-jobs\install.py
  npm run build

from pathlib import Path

css_path = Path("components/sepulchria/sep-ui-unified.css")

if not css_path.exists():
    raise SystemExit(
        "Missing components/sepulchria/sep-ui-unified.css. "
        "Apply the unification patch first."
    )

css = css_path.read_text(encoding="utf-8")

bad_rule = """[data-portal-shell]
  :is(
    button[class~="border"]:not([aria-label]),
    a[class~="border"]
  )
  :where(*) {
  border-radius: inherit;
}

"""

if bad_rule in css:
    css = css.replace(bad_rule, "", 1)
else:
    raise SystemExit(
        "The bad descendant border-radius rule was not found. "
        "No files were changed."
    )

css_path.write_text(css, encoding="utf-8")

print("SUCCESS")
print("Removed the rule that forced children inside buttons/links")
print("to inherit square border-radius.")
print("")
print("Rounded status dots, circular badges and round child icons")
print("can now keep their own rounded-full styling.")
print("")
print("Changed only:")
print("  components/sepulchria/sep-ui-unified.css")
print("")
print("Run: npm run build")

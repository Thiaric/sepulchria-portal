from pathlib import Path

ROOT = Path.cwd()

page_path = ROOT / "app/(portal)/admin/character-audit/page.tsx"
api_path = ROOT / "app/api/character-audit/route.ts"

for path in (page_path, api_path):
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")

def remove_between(text: str, start_marker: str, end_marker: str) -> str:
    start = text.find(start_marker)
    if start < 0:
        return text

    end = text.find(end_marker, start)
    if end < 0:
        raise SystemExit(
            f"Could not find end marker after: {start_marker}"
        )

    return text[:start] + text[end:]

# ------------------------------------------------------------
# ADMIN CHARACTER AUDIT PAGE
# Keep Odd Job claim records visible.
# ------------------------------------------------------------

page = page_path.read_text(encoding="utf-8")

page = remove_between(
    page,
    "function isOddJobsDirectRow(",
    "function isNearbyOddJobCurrencyRow(",
)

page = remove_between(
    page,
    "function isNearbyOddJobCurrencyRow(",
    "function removeExpertise(",
)

old_page_pipeline = """  const oddJobMarkers =
    allRows
      .filter(
        isOddJobsDirectRow,
      )
      .map((row) => ({
        characterId:
          row.character_id,
        createdAt:
          new Date(
            row.created_at,
          ).getTime(),
      }))
      .filter(
        (marker) =>
          Number.isFinite(
            marker.createdAt,
          ),
      );

  const rawRows =
    allRows
      .filter(
        (row) =>
          !isOddJobsDirectRow(
            row,
          ) &&
          !isNearbyOddJobCurrencyRow(
            row,
            oddJobMarkers,
          ),
      )
      .filter(
        (row) =>
          !isExpertiseOnlyUpdate(
            row,
          ),
      )
      .map(
        scrubExpertise,
      );
"""

new_page_pipeline = """  const rawRows =
    allRows
      .filter(
        (row) =>
          !isExpertiseOnlyUpdate(
            row,
          ),
      )
      .map(
        scrubExpertise,
      );
"""

if old_page_pipeline in page:
    page = page.replace(old_page_pipeline, new_page_pipeline, 1)
elif "oddJobMarkers" in page:
    raise SystemExit(
        "Could not safely replace Character Audit Odd Jobs filtering."
    )

page_path.write_text(page, encoding="utf-8")

# ------------------------------------------------------------
# CHARACTER AUDIT API
# Keep Odd Job claim records and their ledger movements visible
# in the character-sheet audit view too.
# ------------------------------------------------------------

api = api_path.read_text(encoding="utf-8")

api = remove_between(
    api,
    "function isOddJobsDirectRow(",
    "function isNearbyOddJobCurrencyRow(",
)

api = remove_between(
    api,
    "function isNearbyOddJobCurrencyRow(",
    "function actorLabel(",
)

old_api_pipeline = """  const oddJobTimes =
    rawRows
      .filter(
        isOddJobsDirectRow,
      )
      .map((row) =>
        new Date(
          row.created_at,
        ).getTime(),
      )
      .filter(
        Number.isFinite,
      );

  const rows =
    rawRows
      .filter(
        (row) =>
          !isOddJobsDirectRow(
            row,
          ) &&
          !isNearbyOddJobCurrencyRow(
            row,
            oddJobTimes,
          ),
      )
      .filter((row) => {
"""

new_api_pipeline = """  const rows =
    rawRows
      .filter((row) => {
"""

if old_api_pipeline in api:
    api = api.replace(old_api_pipeline, new_api_pipeline, 1)
elif "oddJobTimes" in api:
    raise SystemExit(
        "Could not safely replace Character Audit API Odd Jobs filtering."
    )

api_path.write_text(api, encoding="utf-8")

print("SUCCESS")
print("Character Audit thinning UI patch applied.")
print("Odd Job claims and Odd Job ledger records are no longer hidden.")
print("Now run: npm run build")

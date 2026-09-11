from pathlib import Path
import shutil, subprocess, sys

ROOT = Path.cwd()
EXPECTED_HEAD = "3f0b2c7f9d271f468cf08bba0ae6e2f2804e0cb0"
PAGE = ROOT / "app" / "(portal)" / "game" / "page.tsx"
PANEL = ROOT / "app" / "(portal)" / "game" / "components" / "OddJobsPanel.tsx"
BACKUP = ROOT / ".odd-jobs-images-backup"

def fail(msg):
    print(f"\nSTOPPED: {msg}", file=sys.stderr)
    sys.exit(1)

def one(text, old, new, label):
    c = text.count(old)
    if c != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {c}.")
    return text.replace(old, new, 1)

if not (ROOT / "package.json").exists():
    fail("Run this from the sepulchria-portal repository root.")

head = subprocess.check_output(["git","rev-parse","HEAD"], cwd=ROOT, text=True).strip()
if head != EXPECTED_HEAD:
    fail(f"Patch is locked to {EXPECTED_HEAD[:7]}; current HEAD is {head[:7]}.")

for p in (PAGE, PANEL):
    if not p.exists():
        fail(f"Missing expected file: {p.relative_to(ROOT)}")
    dst = BACKUP / p.relative_to(ROOT)
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(p, dst)

try:
    panel = PANEL.read_text(encoding="utf-8")
    panel = one(
        panel,
        '  job_description: string;\n  pay: number;',
        '  job_description: string;\n  image_url: string | null;\n  pay: number;',
        "OddJobStateRow",
    )
    old_card = '''              <article
                key={job.job_id}
                className="flex min-h-[124px] flex-col border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-3 game_components_oddjobspanel_article_article"
              >'''
    new_card = '''              <article
                key={job.job_id}
                className="flex min-h-[124px] flex-col border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] bg-cover bg-center bg-no-repeat p-3 game_components_oddjobspanel_article_article"
                style={
                  job.image_url
                    ? {
                        backgroundImage: `linear-gradient(rgba(8, 7, 6, 0.76), rgba(8, 7, 6, 0.9)), url("${job.image_url}")`,
                      }
                    : undefined
                }
              >'''
    panel = one(panel, old_card, new_card, "Odd Job card")
    PANEL.write_text(panel, encoding="utf-8")

    page = PAGE.read_text(encoding="utf-8")
    old_merge = '''  const oddJobs =
    (oddJobsData ?? []) as OddJobStateRow[];

  const {
    data: houseOfChancesData,
    error: houseOfChancesError,
  } = houseOfChancesResult;'''
    new_merge = '''  const oddJobsBase =
    (oddJobsData ?? []) as Omit<
      OddJobStateRow,
      "image_url"
    >[];

  const oddJobIds =
    oddJobsBase.map((job) => job.job_id);

  const oddJobImagesResult =
    oddJobIds.length > 0
      ? await supabase
          .from("odd_jobs")
          .select("id, image_url")
          .in("id", oddJobIds)
      : { data: [], error: null };

  if (oddJobImagesResult.error) {
    throw new Error(
      `Unable to load Odd Job images: ${oddJobImagesResult.error.message}`,
    );
  }

  const oddJobImageById =
    new Map<string, string | null>(
      (oddJobImagesResult.data ?? []).map(
        (job) => [
          String(job.id),
          job.image_url ? String(job.image_url) : null,
        ],
      ),
    );

  const oddJobs: OddJobStateRow[] =
    oddJobsBase.map((job) => ({
      ...job,
      image_url:
        oddJobImageById.get(job.job_id) ?? null,
    }));

  const {
    data: houseOfChancesData,
    error: houseOfChancesError,
  } = houseOfChancesResult;'''
    page = one(page, old_merge, new_merge, "Odd Jobs merge")
    PAGE.write_text(page, encoding="utf-8")

    validator = '''
const fs=require("fs"),ts=require("typescript");
for(const file of process.argv.slice(1)){
 const source=fs.readFileSync(file,"utf8");
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 if(sf.parseDiagnostics.length){console.error(sf.parseDiagnostics);process.exit(1);}
}
'''
    subprocess.run(["node","-e",validator,str(PAGE),str(PANEL)], cwd=ROOT, check=True)

except Exception as e:
    for p in (PAGE, PANEL):
        src = BACKUP / p.relative_to(ROOT)
        if src.exists():
            shutil.copy2(src, p)
    fail(f"{e}\nBoth files were restored automatically.")

print("ODD JOB CARD IMAGES PATCH APPLIED")
print("Changed:")
print("  app/(portal)/game/page.tsx")
print("  app/(portal)/game/components/OddJobsPanel.tsx")
print("NEXT: npm run build")

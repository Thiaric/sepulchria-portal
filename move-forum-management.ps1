$ErrorActionPreference = "Stop"

$projectRoot = Get-Location

function Assert-Exists([string]$relativePath) {
  $fullPath = Join-Path $projectRoot $relativePath

  if (-not (Test-Path -LiteralPath $fullPath)) {
    throw "Required path not found: $relativePath"
  }
}

function Ensure-Directory([string]$relativePath) {
  $fullPath = Join-Path $projectRoot $relativePath
  New-Item -ItemType Directory -Force -Path $fullPath | Out-Null
  return $fullPath
}

function Replace-InFiles(
  [string]$relativePath,
  [hashtable]$replacements
) {
  $fullPath = Join-Path $projectRoot $relativePath

  Get-ChildItem `
    -LiteralPath $fullPath `
    -Recurse `
    -File `
    -Include *.ts,*.tsx |
  ForEach-Object {
    $content = Get-Content `
      -LiteralPath $_.FullName `
      -Raw

    $updated = $content

    foreach ($entry in $replacements.GetEnumerator()) {
      $updated = $updated.Replace(
        [string]$entry.Key,
        [string]$entry.Value
      )
    }

    if ($updated -ne $content) {
      Set-Content `
        -LiteralPath $_.FullName `
        -Value $updated `
        -Encoding UTF8
    }
  }
}

Assert-Exists "app\(portal)\admin\forum\page.tsx"
Assert-Exists "app\(portal)\forum\manage\sections"
Assert-Exists "app\(portal)\forum\manage\topics"
Assert-Exists "components\forum\forum-staff-tools.tsx"

$adminForumRoot = Ensure-Directory `
  "app\(portal)\admin\forum"

$oldSections = Join-Path `
  $projectRoot `
  "app\(portal)\forum\manage\sections"

$newSections = Join-Path `
  $projectRoot `
  "app\(portal)\admin\forum\sections"

$oldTopics = Join-Path `
  $projectRoot `
  "app\(portal)\forum\manage\topics"

$newTopics = Join-Path `
  $projectRoot `
  "app\(portal)\admin\forum\topics"

if (Test-Path -LiteralPath $newSections) {
  Remove-Item `
    -LiteralPath $newSections `
    -Recurse `
    -Force
}

if (Test-Path -LiteralPath $newTopics) {
  Remove-Item `
    -LiteralPath $newTopics `
    -Recurse `
    -Force
}

Move-Item `
  -LiteralPath $oldSections `
  -Destination $newSections

Move-Item `
  -LiteralPath $oldTopics `
  -Destination $newTopics

$oldModeration = Join-Path `
  $projectRoot `
  "app\(portal)\forum\moderation"

$newModeration = Join-Path `
  $projectRoot `
  "app\(portal)\admin\forum\moderation"

if (Test-Path -LiteralPath $oldModeration) {
  if (Test-Path -LiteralPath $newModeration) {
    Remove-Item `
      -LiteralPath $newModeration `
      -Recurse `
      -Force
  }

  Move-Item `
    -LiteralPath $oldModeration `
    -Destination $newModeration
}

$pathReplacements = [ordered]@{
  '"/forum/manage/sections' = '"/admin/forum/sections'
  '`/forum/manage/sections' = '`/admin/forum/sections'
  '"/forum/manage/topics' = '"/admin/forum/topics'
  '`/forum/manage/topics' = '`/admin/forum/topics'
  '"/forum/moderation' = '"/admin/forum/moderation'
  '`/forum/moderation' = '`/admin/forum/moderation'
  '"/forum/manage"' = '"/admin/forum"'
  '`/forum/manage`' = '`/admin/forum`'
}

Replace-InFiles `
  "app\(portal)\admin\forum" `
  $pathReplacements

$staffToolsPath = Join-Path `
  $projectRoot `
  "components\forum\forum-staff-tools.tsx"

$staffTools = Get-Content `
  -LiteralPath $staffToolsPath `
  -Raw

$staffTools = $staffTools.Replace(
  'href="/forum/manage"',
  'href="/admin/forum"'
)

$staffTools = $staffTools.Replace(
  'href="/forum/manage/sections"',
  'href="/admin/forum/sections"'
)

$staffTools = $staffTools.Replace(
  'href="/forum/moderation"',
  'href="/admin/forum/moderation"'
)

Set-Content `
  -LiteralPath $staffToolsPath `
  -Value $staffTools `
  -Encoding UTF8

function Update-Breadcrumbs([string]$relativePath) {
  $fullPath = Join-Path $projectRoot $relativePath

  Get-ChildItem `
    -LiteralPath $fullPath `
    -Recurse `
    -File `
    -Include *.tsx |
  ForEach-Object {
    $content = Get-Content `
      -LiteralPath $_.FullName `
      -Raw

    $content = $content.Replace(
@'
<Link
          href="/forum"
          className="transition hover:text-[#c7a16d]"
        >
          Forum
        </Link>
'@,
@'
<Link
          href="/admin"
          className="transition hover:text-[#c7a16d]"
        >
          Administration
        </Link>
'@
    )

    $content = $content.Replace(
@'
<Link
          href="/admin/forum"
          className="transition hover:text-[#c7a16d]"
        >
          Staff management
        </Link>
'@,
@'
<Link
          href="/admin/forum"
          className="transition hover:text-[#c7a16d]"
        >
          Forum
        </Link>
'@
    )

    Set-Content `
      -LiteralPath $_.FullName `
      -Value $content `
      -Encoding UTF8
  }
}

Update-Breadcrumbs `
  "app\(portal)\admin\forum"

$legacyManage = Ensure-Directory `
  "app\(portal)\forum\manage"

@'
import { redirect } from "next/navigation";

export default function LegacyForumManagementPage() {
  redirect("/admin/forum");
}
'@ | Set-Content `
  -LiteralPath (
    Join-Path $legacyManage "page.tsx"
  ) `
  -Encoding UTF8

$legacySections = Ensure-Directory `
  "app\(portal)\forum\manage\sections"

@'
import { redirect } from "next/navigation";

export default function LegacyForumSectionsPage() {
  redirect("/admin/forum/sections");
}
'@ | Set-Content `
  -LiteralPath (
    Join-Path $legacySections "page.tsx"
  ) `
  -Encoding UTF8

$legacyNewSection = Ensure-Directory `
  "app\(portal)\forum\manage\sections\new"

@'
import { redirect } from "next/navigation";

export default function LegacyNewForumSectionPage() {
  redirect("/admin/forum/sections/new");
}
'@ | Set-Content `
  -LiteralPath (
    Join-Path $legacyNewSection "page.tsx"
  ) `
  -Encoding UTF8

$legacySectionId = Ensure-Directory `
  "app\(portal)\forum\manage\sections\[sectionId]"

@'
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{
    sectionId: string;
  }>;
};

export default async function LegacyEditForumSectionPage({
  params,
}: Props) {
  const { sectionId } = await params;

  redirect(
    `/admin/forum/sections/${encodeURIComponent(
      sectionId,
    )}`,
  );
}
'@ | Set-Content `
  -LiteralPath (
    Join-Path $legacySectionId "page.tsx"
  ) `
  -Encoding UTF8

$legacyTopics = Ensure-Directory `
  "app\(portal)\forum\manage\topics"

@'
import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<
    Record<
      string,
      string | string[] | undefined
    >
  >;
};

export default async function LegacyForumTopicsPage({
  searchParams,
}: Props) {
  const resolved = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(
    resolved,
  )) {
    if (typeof value === "string") {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  const query = params.toString();

  redirect(
    query
      ? `/admin/forum/topics?${query}`
      : "/admin/forum/topics",
  );
}
'@ | Set-Content `
  -LiteralPath (
    Join-Path $legacyTopics "page.tsx"
  ) `
  -Encoding UTF8

if (Test-Path -LiteralPath $newModeration) {
  $legacyModeration = Ensure-Directory `
    "app\(portal)\forum\moderation"

@'
import { redirect } from "next/navigation";

export default function LegacyForumModerationPage() {
  redirect("/admin/forum/moderation");
}
'@ | Set-Content `
    -LiteralPath (
      Join-Path $legacyModeration "page.tsx"
    ) `
    -Encoding UTF8
}

Write-Host ""
Write-Host "Forum management moved successfully." -ForegroundColor Green
Write-Host ""
Write-Host "New routes:"
Write-Host "  /admin/forum"
Write-Host "  /admin/forum/sections"
Write-Host "  /admin/forum/sections/new"
Write-Host "  /admin/forum/sections/[sectionId]"
Write-Host "  /admin/forum/topics"

if (Test-Path -LiteralPath $newModeration) {
  Write-Host "  /admin/forum/moderation"
}

Write-Host ""
Write-Host "Old /forum/manage routes now redirect to /admin/forum."
Write-Host "Run: npm run build"

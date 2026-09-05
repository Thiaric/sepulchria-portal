from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(
        ["git", *args],
        cwd=ROOT,
        text=True,
    ).strip()

head = git("rev-parse", "HEAD")
if not head.startswith("f786b0cc"):
    raise SystemExit(
        f"STOP: expected HEAD f786b0cc, but found {head[:12]}.\n"
        "No files were changed."
    )

files = {
    "globals": ROOT / "app" / "globals.css",
    "homepage": ROOT / "components" / "homepage" / "sepulchria-homepage.tsx",
    "auth_shell": ROOT / "components" / "auth-page-shell.tsx",
    "community": ROOT / "app" / "community-rules" / "page.tsx",
    "cookies_page": ROOT / "app" / "cookies" / "page.tsx",
    "cookie_controls": ROOT / "components" / "privacy" / "cookie-storage-controls.tsx",
    "registration_badge": ROOT / "components" / "admin" / "registration-application-badge.tsx",
    "mobile_nav": ROOT / "components" / "portal" / "mobile-portal-navigation.tsx",
    "messages": ROOT / "app" / "(portal)" / "messages" / "components" / "messages-inbox-client.tsx",
}

for label, path in files.items():
    if not path.exists():
        raise SystemExit(
            f"STOP: missing {label}: {path.relative_to(ROOT)}\n"
            "No files were changed."
        )

texts = {
    key: path.read_text(encoding="utf-8")
    for key, path in files.items()
}

def replace_once(key, old, new, description):
    text = texts[key]
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"STOP: {description}: expected 1 match, found {count}.\n"
            "No files were changed."
        )
    texts[key] = text.replace(old, new, 1)

# 1) PUBLIC/HOMEPAGE/AUTH/LEGAL/COOKIE SKIN SEMANTICS

replace_once(
    "homepage",
    '''    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))] lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden">''',
    '''    <main
      data-public-skin-surface="true"
      className="relative min-h-[100dvh] overflow-x-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))] lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden"
    >''',
    "homepage public skin surface",
)

replace_once(
    "homepage",
    '''linear-gradient(to_bottom,#130e0b_0%,#0b0807_50%,#070605_100%)''',
    '''linear-gradient(to_bottom,rgb(var(--sep-colour-130e0b))_0%,rgb(var(--sep-colour-0b0807))_50%,rgb(var(--sep-colour-090706))_100%)''',
    "homepage skin-aware atmospheric gradient",
)

replace_once(
    "auth_shell",
    '''    <main className="relative min-h-[100dvh] overflow-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))]">''',
    '''    <main
      data-public-skin-surface="true"
      className="relative min-h-[100dvh] overflow-hidden bg-[rgb(var(--sep-colour-090706))] text-[rgb(var(--sep-colour-e8dcc4))]"
    >''',
    "auth public skin surface",
)

replace_once(
    "auth_shell",
    '''linear-gradient(to_bottom,#130e0b_0%,#0b0807_52%,#070605_100%)''',
    '''linear-gradient(to_bottom,rgb(var(--sep-colour-130e0b))_0%,rgb(var(--sep-colour-0b0807))_52%,rgb(var(--sep-colour-090706))_100%)''',
    "auth skin-aware atmospheric gradient",
)

replace_once(
    "community",
    '''      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-4 py-10 text-[rgb(var(--sep-colour-e8dcc4))] sm:px-6 lg:px-8">''',
    '''      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-4 py-10 text-[rgb(var(--sep-colour-e8dcc4))] sm:px-6 lg:px-8"
      >''',
    "community rules public skin surface",
)

replace_once(
    "cookies_page",
    '''      <main className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]">''',
    '''      <main
        data-public-skin-surface="true"
        className="min-h-screen bg-[rgb(var(--sep-colour-090706))] px-5 py-12 text-[rgb(var(--sep-colour-d8cbb5))]"
      >''',
    "cookies page public skin surface",
)

replace_once(
    "cookie_controls",
    '''        <section
          aria-label="Cookie and storage notice"''',
    '''        <section
          data-public-skin-surface="true"
          aria-label="Cookie and storage notice"''',
    "cookie banner public skin surface",
)

replace_once(
    "cookie_controls",
    '''          <section className="relative z-10 max-h-[90dvh] w-full max-w-[620px] overflow-y-auto border border-[rgb(var(--sep-colour-6b5032))]/55 bg-[rgb(var(--sep-colour-100c09))] p-5 text-[rgb(var(--sep-colour-d8cbb5))] shadow-[0_25px_90px_rgba(0,0,0,0.9)] sm:p-7">''',
    '''          <section
            data-public-skin-surface="true"
            className="relative z-10 max-h-[90dvh] w-full max-w-[620px] overflow-y-auto border border-[rgb(var(--sep-colour-6b5032))]/55 bg-[rgb(var(--sep-colour-100c09))] p-5 text-[rgb(var(--sep-colour-d8cbb5))] shadow-[0_25px_90px_rgba(0,0,0,0.9)] sm:p-7"
          >''',
    "cookie settings public skin surface",
)

public_css_marker = "SEPULCHRIA PUBLIC SKIN SEMANTICS — C1/C2"

if public_css_marker not in texts["globals"]:
    texts["globals"] = texts["globals"].rstrip() + '''

/* ------------------------------------------------------------------ */
/* SEPULCHRIA PUBLIC SKIN SEMANTICS — C1/C2                           */
/* Public/home/auth/legal/cookie surfaces follow the same semantic     */
/* skin vocabulary as the portal: C1 = primary/emphasis, C2 = normal. */
/* ------------------------------------------------------------------ */

html[data-portal-skin]
  [data-public-skin-surface="true"] {
  color:
    rgb(
      var(
        --sep-skin-c2,
        var(--sep-colour-e8dcc4)
      )
    ) !important;
}

html[data-portal-skin]
  [data-public-skin-surface="true"]
  :where(span) {
  color: inherit !important;
}

html[data-portal-skin]
  [data-public-skin-surface="true"]
  :where(
    p,
    li,
    dt,
    dd,
    label,
    input,
    textarea,
    select,
    small,
    blockquote,
    footer
  ):not([role="alert"]):not([role="alert"] *) {
  color:
    rgb(
      var(
        --sep-skin-c2,
        var(--sep-colour-e8dcc4)
      )
    ) !important;
}

html[data-portal-skin]
  [data-public-skin-surface="true"]
  :where(
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    strong,
    b,
    a,
    button
  ):not([class*="red-"]):not([class*="rose-"]):not(
    [class*="emerald-"]
  ) {
  color:
    rgb(
      var(
        --sep-skin-c1,
        var(--sep-colour-ead8b4)
      )
    ) !important;
}

html[data-portal-skin]
  [data-public-skin-surface="true"]
  :is(input, textarea)::placeholder {
  color:
    rgb(
      var(
        --sep-skin-c2,
        var(--sep-colour-8f806d)
      ) / 0.58
    ) !important;
}
''' + "\n"

# 2) REGISTRATION BADGE + MOBILE MORE

replace_once(
    "registration_badge",
    '''      <span
        title={title}
        className={`absolute -left-2 -top-2 h-5 min-w-5 px-1 text-[8px] ${baseClass}`}''',
    '''      <span
        data-sep-counter-badge="true"
        title={title}
        className={`absolute -left-2 -top-2 h-5 min-w-5 px-1 text-[8px] ${baseClass}`}''',
    "registration floating badge canonical marker",
)

replace_once(
    "registration_badge",
    '''    <span
      title={title}
      className={`ml-auto h-4 min-w-4 px-1 text-[7px] ${baseClass}`}''',
    '''    <span
      data-sep-counter-badge="true"
      title={title}
      className={`ml-auto h-4 min-w-4 px-1 text-[7px] ${baseClass}`}''',
    "registration admin-nav badge canonical marker",
)

replace_once(
    "mobile_nav",
    '''  const moreAttentionCount =
    currentUnreadForumCount +
    unreadPollCount +
    notificationCounts.tickets.player +
    notificationCounts.sanctions.player;''',
    '''  const moreAttentionCount =
    currentUnreadForumCount +
    unreadPollCount +
    notificationCounts.tickets.player +
    notificationCounts.sanctions.player +
    (isStaff
      ? notificationCounts
          .registrationApplications
      : 0);''',
    "mobile More registration attention count",
)

replace_once(
    "mobile_nav",
    '''      <Settings
        className="h-[22px] w-[22px] shrink-0 text-[rgb(var(--sep-colour-d4ad70))]"
      />

      <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b8a98f))]">
        Administration
      </span>''',
    '''      <Settings
        className="h-[22px] w-[22px] shrink-0 text-[rgb(var(--sep-colour-d4ad70))]"
        style={{
          filter:
            "var(--sep-skin-nav-icon-filter, none)",
        }}
      />

      <span className="min-w-0 flex-1 truncate text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b8a98f))]">
        Administration
      </span>

      <Badge
        count={
          notificationCounts
            .registrationApplications
        }
      />''',
    "mobile Administration icon + registration badge",
)

# 3) MESSAGES MOBILE COMPACTNESS

replace_once(
    "messages",
    '''        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[rgb(var(--sep-colour-654b2e))]/40 pb-3">''',
    '''        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-[rgb(var(--sep-colour-654b2e))]/40 pb-2 sm:gap-3 sm:pb-3">''',
    "messages mobile header spacing",
)

replace_once(
    "messages",
    '''          <div className="flex flex-wrap gap-2">''',
    '''          <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:gap-2">''',
    "messages mobile action row",
)

replace_once(
    "messages",
    '''              <Link href="/messages/new" className="border border-[rgb(var(--sep-colour-a07742))] bg-[rgb(var(--sep-colour-402a17))] px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f1d5a2))] transition hover:border-[rgb(var(--sep-colour-c49351))] hover:bg-[rgb(var(--sep-colour-56371c))]">New message</Link>''',
    '''              <Link href="/messages/new" className="flex items-center justify-center border border-[rgb(var(--sep-colour-a07742))] bg-[rgb(var(--sep-colour-402a17))] px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-f1d5a2))] transition hover:border-[rgb(var(--sep-colour-c49351))] hover:bg-[rgb(var(--sep-colour-56371c))] sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.18em]">New message</Link>''',
    "messages mobile new-message button",
)

old_inbox_common = '''              className={`border px-4 py-2 text-[10px] uppercase tracking-[0.18em] transition ${'''
new_inbox_common = '''              className={`flex items-center justify-center border px-2 py-1.5 text-center text-[8px] uppercase tracking-[0.14em] transition sm:px-4 sm:py-2 sm:text-[10px] sm:tracking-[0.18em] ${'''

count_common = texts["messages"].count(old_inbox_common)
if count_common != 2:
    raise SystemExit(
        f"STOP: messages Inbox/Archived classes: expected 2 matches, found {count_common}.\n"
        "No files were changed."
    )

texts["messages"] = texts["messages"].replace(
    old_inbox_common,
    new_inbox_common,
    2,
)

replace_once(
    "messages",
    '''        <section className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-3">''',
    '''        <section className="mt-2 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-2 sm:mt-3 sm:p-3">''',
    "messages mobile filter panel spacing",
)

replace_once(
    "messages",
    '''            <span className="mb-2 block text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806b50))]">''',
    '''            <span className="mb-1 block text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] sm:mb-2 sm:text-[8px] sm:tracking-[0.22em]">''',
    "messages mobile filter label spacing",
)

replace_once(
    "messages",
    '''              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"''',
    '''              className="w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-100c09))] px-2.5 py-1.5 text-xs text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))] sm:px-3 sm:py-2 sm:text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"''',
    "messages mobile filter input height",
)

replace_once(
    "messages",
    '''            <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-887a67))]">''',
    '''            <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887a67))] sm:mt-3 sm:text-[10px]">''',
    "messages mobile search-result spacing",
)

replace_once(
    "messages",
    '''        <div className="mt-3 space-y-2">''',
    '''        <div className="mt-2 space-y-2 sm:mt-3">''',
    "messages mobile conversation-list spacing",
)

# WRITE ONLY AFTER ALL CHECKS PASSED

changed = []

for key, path in files.items():
    original = path.read_text(encoding="utf-8")
    updated = texts[key]

    if updated == original:
        continue

    backup = path.with_suffix(
        path.suffix + ".before_cleanup_4items.bak"
    )

    if not backup.exists():
        shutil.copy2(path, backup)

    path.write_text(updated, encoding="utf-8")
    changed.append(str(path.relative_to(ROOT)))

print("DONE")
print()
print("Patched HEAD f786b0cc.")
print()
print("1) Public skin semantics fixed for homepage/about, auth/login,")
print("   registration info, Community Rules, Cookie Notice and cookie choices.")
print("2) Registration badge now uses canonical counter styling and appears")
print("   in mobile MORE / beside Administration.")
print("3) Messages mobile top controls + filter are substantially shorter.")
print("4) Mobile Administration cog now uses the same skin icon filter as")
print("   the other navigation icons.")
print()
print("Changed files:")
for item in changed:
    print(f"  - {item}")
print()
print("Now run:")
print("  npm run build")

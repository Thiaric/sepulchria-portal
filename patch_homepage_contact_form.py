from pathlib import Path

ROOT = Path.cwd()

def fail(message: str) -> None:
    raise SystemExit(f"\nERROR: {message}\n")

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing expected file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, content: str) -> None:
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8", newline="\n")
    print(f"updated: {path}")

def replace_once(path: str, old: str, new: str, label: str) -> None:
    text = read(path)
    if new in text:
        print(f"already done: {path} ({label})")
        return
    count = text.count(old)
    if count != 1:
        fail(f"{path}: {label}: expected exactly 1 match, found {count}")
    write(path, text.replace(old, new, 1))

# ---------------------------------------------------------------------------
# 1) Contact modal component
# ---------------------------------------------------------------------------

contact_component = r'''["use client"].map(Boolean);

import { FormEvent, useEffect, useState } from "react";

type HomepageContactModalProps = {
  open: boolean;
  onClose: () => void;
};

export function HomepageContactModal({
  open,
  onClose,
}: HomepageContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (status === "sending") return;

    setStatus("sending");
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || payload?.ok !== true) {
        throw new Error(
          payload?.error || "Your message could not be sent.",
        );
      }

      setStatus("sent");
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
      setWebsite("");
    } catch (caught) {
      setStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Your message could not be sent.",
      );
    }
  }

  return (
    <div
      data-public-skin-surface="true"
      className="fixed inset-0 z-[10010] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="homepage-contact-title"
    >
      <button
        type="button"
        aria-label="Close Contact"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(var(--sep-colour-050403))]/88 backdrop-blur-[3px]"
      />

      <section className="relative z-10 w-full max-w-[680px] overflow-hidden border border-[rgb(var(--sep-colour-795a34))]/70 bg-[rgb(var(--sep-colour-0d0907))] shadow-[0_30px_100px_rgba(var(--sep-rgb-0-0-0),0.9)]">
        <header className="relative border-b border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-120d0a))] px-5 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Contact"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-17110d))] text-lg text-[rgb(var(--sep-colour-bda57f))] transition hover:border-[rgb(var(--sep-colour-9b7443))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
          >
            ×
          </button>

          <p className="text-[8px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-80684c))]">
            Sepulchria
          </p>

          <h2
            id="homepage-contact-title"
            className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e0c99e))]"
          >
            Contact
          </h2>

          <p className="mt-2 text-xs leading-5 text-[rgb(var(--sep-colour-9f907b))]">
            Send a message to the Sepulchria team.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 px-5 py-5 sm:px-6 sm:py-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))]">
                Name
              </span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                autoComplete="name"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))]"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))]">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={254}
                required
                autoComplete="email"
                className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))]"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))]">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={160}
              required
              className="w-full border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a98c67))]">
              Message
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={10}
              maxLength={5000}
              required
              rows={8}
              className="w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/60 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-e1d3bd))] outline-none focus:border-[rgb(var(--sep-colour-a77a42))]"
            />
          </label>

          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden"
          >
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {status === "sent" ? (
            <div
              role="status"
              className="border border-emerald-700/60 bg-emerald-950/35 px-4 py-3 text-sm text-emerald-200"
            >
              Your message has been sent successfully.
            </div>
          ) : null}

          {status === "error" ? (
            <div
              role="alert"
              className="border border-red-800/60 bg-red-950/35 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/35 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] text-[rgb(var(--sep-colour-817566))]">
              Messages are delivered to sepulchriarpg@gmail.com.
            </p>

            <button
              type="submit"
              disabled={status === "sending"}
              className="border border-[rgb(var(--sep-colour-a77a42))]/75 bg-[rgb(var(--sep-colour-382313))] px-5 py-2.5 font-serif text-sm text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] disabled:cursor-wait disabled:opacity-60"
            >
              {status === "sending" ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
'''

# Fix first line cleanly.
contact_component = contact_component.replace('["use client"].map(Boolean);', '"use client";', 1)
write("components/homepage/homepage-contact-modal.tsx", contact_component)

# ---------------------------------------------------------------------------
# 2) Public API route using existing RESEND_API_KEY + STORE_EMAIL_FROM
# ---------------------------------------------------------------------------

contact_route = r'''import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const CONTACT_TO = "sepulchriarpg@gmail.com";

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.CONTACT_EMAIL_FROM?.trim() ||
    process.env.STORE_EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    return NextResponse.json(
      {
        ok: false,
        error: "Contact email is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const record =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const name = cleanText(record.name, 100);
  const email = cleanText(record.email, 254).toLowerCase();
  const subject = cleanText(record.subject, 160);
  const message = cleanText(record.message, 5000);
  const website = cleanText(record.website, 500);

  // Honeypot: pretend success for bots.
  if (website) {
    return NextResponse.json({ ok: true });
  }

  if (!name || !email || !subject || message.length < 10) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please complete all fields.",
      },
      { status: 400 },
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please enter a valid email address.",
      },
      { status: 400 },
    );
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [CONTACT_TO],
      reply_to: email,
      subject: `[Sepulchria Contact] ${subject}`,
      text: [
        "New message from the Sepulchria public contact form",
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        `Subject: ${subject}`,
        "",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2b2118">
          <h2>New Sepulchria contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <hr />
          <p>${safeMessage}</p>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");

    console.error(
      "Contact form Resend failure:",
      response.status,
      detail,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "Your message could not be sent right now.",
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
'''
write("app/api/contact/route.ts", contact_route)

# ---------------------------------------------------------------------------
# 3) Make API public
# ---------------------------------------------------------------------------

proxy_path = "lib/supabase/proxy.ts"
proxy = read(proxy_path)

public_start = proxy.find("const PUBLIC_ROUTES = [")
public_end = proxy.find("];", public_start)

if public_start == -1 or public_end == -1:
    fail("Could not find PUBLIC_ROUTES in lib/supabase/proxy.ts")

public_block = proxy[public_start:public_end]

if '"/api/contact"' not in public_block:
    anchor = '  "/api/auth",'
    anchor_pos = public_block.find(anchor)

    if anchor_pos == -1:
        fail("Could not find /api/auth anchor in PUBLIC_ROUTES")

    absolute = public_start + anchor_pos
    proxy = (
        proxy[:absolute]
        + '  "/api/contact",\n'
        + proxy[absolute:]
    )

write(proxy_path, proxy)

# ---------------------------------------------------------------------------
# 4) Homepage: import + state + render + Contact button
# ---------------------------------------------------------------------------

homepage_path = "components/homepage/sepulchria-homepage.tsx"

replace_once(
    homepage_path,
    'import { HomepagePublicModal } from "@/components/homepage/homepage-public-modal";',
    'import { HomepagePublicModal } from "@/components/homepage/homepage-public-modal";\nimport { HomepageContactModal } from "@/components/homepage/homepage-contact-modal";',
    "contact modal import",
)

replace_once(
    homepage_path,
    '''  const [aboutOpen, setAboutOpen] =
    useState(false);''',
    '''  const [aboutOpen, setAboutOpen] =
    useState(false);

  const [contactOpen, setContactOpen] =
    useState(false);''',
    "contact modal state",
)

# Replace any existing mailto Contact anchor inside the footer with a button.
homepage = read(homepage_path)
footer_marker = 'data-homepage-footer-nav="true"'
marker_pos = homepage.find(footer_marker)
if marker_pos == -1:
    fail("Could not find homepage footer navigation")

nav_start = homepage.rfind("<nav", 0, marker_pos)
nav_end = homepage.find("</nav>", marker_pos)

if nav_start == -1 or nav_end == -1:
    fail("Could not isolate homepage footer navigation")

nav_end += len("</nav>")
nav = homepage[nav_start:nav_end]

import re
mailto_pattern = re.compile(
    r'''<a\b[^>]*href="mailto:sepulchriarpg@gmail\.com"[^>]*>.*?</a>''',
    re.DOTALL,
)

contact_button = '''<button
                type="button"
                onClick={() => setContactOpen(true)}
              >
                Contact
              </button>'''

if mailto_pattern.search(nav):
    nav = mailto_pattern.sub(contact_button, nav, count=1)
elif "setContactOpen(true)" not in nav:
    close = nav.rfind("</nav>")
    if close == -1:
        fail("Could not find footer nav close tag")

    nav = (
        nav[:close]
        + '''              <button
                type="button"
                onClick={() => setContactOpen(true)}
              >
                Contact
              </button>
            '''
        + nav[close:]
    )

homepage = homepage[:nav_start] + nav + homepage[nav_end:]
write(homepage_path, homepage)

replace_once(
    homepage_path,
    '''      <HomepagePublicModal
        modal={publicModal}
        onClose={() =>
          setPublicModal(null)
        }
      />''',
    '''      <HomepagePublicModal
        modal={publicModal}
        onClose={() =>
          setPublicModal(null)
        }
      />

      <HomepageContactModal
        open={contactOpen}
        onClose={() =>
          setContactOpen(false)
        }
      />''',
    "contact modal render",
)

print("\nPatch applied successfully.")
print("Contact now opens an internal Sepulchria form.")
print("Form sends directly to sepulchriarpg@gmail.com through Resend.")
print("It uses your existing RESEND_API_KEY and STORE_EMAIL_FROM.")
print("Now run: npm run build")

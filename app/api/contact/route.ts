import { NextRequest, NextResponse } from "next/server";

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

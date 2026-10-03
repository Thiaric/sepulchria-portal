from pathlib import Path
import sys

def replace_once(path, old, new):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"ERROR: Missing {p}")
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    if n != 1:
        raise SystemExit(f"ERROR: {p}: expected 1 match, found {n}")
    p.write_text(s.replace(old, new, 1), encoding="utf-8")

page = "app/(portal)/contribution/page.tsx"
replace_once(page,
'className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-876a46))]"',
'className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-876a46))]"')
replace_once(page, "Sepulchria · Contribution", "Sepulchria · contribution")
replace_once(page, "No Contribution options are currently available.", "No contribution options are currently available.")

checkout = "components/contributions/contribution-checkout.tsx"
replace_once(checkout,
'className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]"',
'className="text-[9px] tracking-[0.08em] text-[rgb(var(--sep-colour-806b50))]"')
replace_once(checkout,
'className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[9px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-d7c4a5))]"',
'className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))]"')
replace_once(checkout, "Confirming Contribution", "Confirming contribution")
replace_once(checkout,
'"border p-4 text-left transition",',
'"relative border p-4 pr-24 text-left transition",')
replace_once(checkout,
'? "border-[rgb(var(--sep-colour-b58a50))] bg-[rgb(var(--sep-colour-332719))]"',
'? "border-2 border-[rgb(var(--sep-colour-b58a50))] bg-[rgb(var(--sep-colour-332719))] ring-1 ring-[rgb(var(--sep-colour-b58a50))]/55 shadow-lg"')
replace_once(checkout,
': "border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]",',
': "border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))]",')
replace_once(checkout,
'<span className="mb-1 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-8f8271))]">',
'<span className="mb-1 block text-[9px] tracking-[0.04em] text-[rgb(var(--sep-colour-8f8271))]">')
replace_once(checkout,
'className="mt-5 w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] disabled:opacity-55"',
'className="mt-5 w-full border border-[rgb(var(--sep-colour-987344))]/70 bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-3 text-[10px] tracking-[0.04em] text-[rgb(var(--sep-colour-efd9aa))] disabled:opacity-55"')
replace_once(checkout,
'''              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedOptionId(option.id)}
                className={[
''',
'''              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelectedOptionId(option.id)}
                className={[
''')
replace_once(checkout,
'''              >
                <span className="block font-serif text-xl text-[rgb(var(--sep-colour-efd6aa))]">
                  {option.productName}
                </span>
''',
'''              >
                {active ? (
                  <span className="absolute right-3 top-3 border border-[rgb(var(--sep-colour-b58a50))]/70 bg-[rgb(var(--sep-colour-211a14))] px-2 py-1 text-[9px] font-semibold text-[rgb(var(--sep-colour-efd6aa))]">
                    ✓ Selected
                  </span>
                ) : null}

                <span className="block font-serif text-xl text-[rgb(var(--sep-colour-efd6aa))]">
                  {option.productName}
                </span>
''')

email = "lib/contributions/contribution-email.ts"
replace_once(email,
'''export async function sendContributionThankYouEmail(contributionId: string) {
  const admin = createAdminClient();

  const { data: contribution, error } = await admin
''',
'''export async function sendContributionThankYouEmail(contributionId: string) {
  const admin = createAdminClient();

  const { data: alreadySent, error: sentLookupError } = await admin
    .from("support_contribution_email_log")
    .select("id, provider_message_id")
    .eq("contribution_id", contributionId)
    .eq("kind", "thank_you")
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sentLookupError) {
    throw new Error(sentLookupError.message);
  }

  if (alreadySent) {
    return {
      sent: true,
      skipped: false,
      alreadySent: true,
      providerMessageId: alreadySent.provider_message_id ?? null,
    };
  }

  const { data: contribution, error } = await admin
''')
replace_once(email,
'''  if (!recipient) return;

  const apiKey = process.env.RESEND_API_KEY?.trim();
''',
'''  if (!recipient) {
    await logContributionEmail({
      contributionId,
      recipient: "unknown",
      status: "skipped",
      error: "Contribution has no recipient email address.",
    });
    throw new Error("Contribution has no recipient email address.");
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
''')
replace_once(email,
'''  if (!apiKey || !from) {
    await logContributionEmail({
      contributionId,
      recipient,
      status: "skipped",
      error:
        "RESEND_API_KEY or CONTRIBUTIONS_EMAIL_FROM is not configured.",
    });
    return { sent: false, skipped: true };
  }
''',
'''  if (!apiKey || !from) {
    const message =
      "RESEND_API_KEY or CONTRIBUTIONS_EMAIL_FROM is not configured.";

    await logContributionEmail({
      contributionId,
      recipient,
      status: "skipped",
      error: message,
    });

    throw new Error(message);
  }
''')
replace_once(email,
'''    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
''',
'''    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `contribution-thank-you/${contribution.id}`,
    },
''')

webhook = "app/api/contributions/stripe/webhook/route.ts"
replace_once(webhook,
'''  if (
    contribution.status === "paid" ||
    contribution.status === "refunded" ||
    contribution.status === "partially_refunded"
  ) {
    return NextResponse.json({ ok: true });
  }
''',
'''  if (
    contribution.status === "paid" ||
    contribution.status === "refunded" ||
    contribution.status === "partially_refunded"
  ) {
    try {
      await sendContributionThankYouEmail(contributionId);
      return NextResponse.json({ ok: true });
    } catch (emailError) {
      const message =
        emailError instanceof Error ? emailError.message : String(emailError);

      console.error(
        "Contribution is already recorded, but thank-you email retry failed:",
        emailError,
      );

      return NextResponse.json(
        { error: `Contribution email failed: ${message}` },
        { status: 500 },
      );
    }
  }
''')
replace_once(webhook,
'''  try {
    await sendContributionThankYouEmail(contributionId);
  } catch (emailError) {
    console.error(
      "Contribution was recorded, but thank-you email failed:",
      emailError,
    );
  }

  return NextResponse.json({ ok: true });
''',
'''  try {
    await sendContributionThankYouEmail(contributionId);
  } catch (emailError) {
    const message =
      emailError instanceof Error ? emailError.message : String(emailError);

    console.error(
      "Contribution was recorded, but thank-you email failed:",
      emailError,
    );

    return NextResponse.json(
      { error: `Contribution email failed: ${message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
''')

old_patch = Path("add_custom_contribution_amount_b0353ac.py")
if old_patch.exists():
    old_patch.unlink()

print("Patched Contributions reliability + UI for baseline 240e855.")
print("Run: npm run build")

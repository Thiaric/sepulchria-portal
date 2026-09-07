from pathlib import Path

ROOT = Path.cwd()
rel = "app/api/store/stripe/webhook/route.ts"
p = ROOT / rel

if not p.exists():
    raise SystemExit(f"PATCH STOPPED: missing {rel}")

text = p.read_text(encoding="utf-8")

old = '''  if (order.status === "fulfilled") {
    await admin.rpc("finalize_store_discount_redemption", {
      p_order_id: orderId,
    });

    try {
      await issueStorePostPurchaseOffersAndNotify({
        orderId,
        characterId: order.character_id,
        userId: order.user_id,
      });
    } catch (offerError) {
      console.error(
        "Store order was already fulfilled, but post-purchase rewards could not be processed:",
        offerError,
      );
    }

    return NextResponse.json({ ok: true });
  }
'''

new = '''  if (
    order.status === "refunded" ||
    order.status === "partially_refunded"
  ) {
    // Stripe may retry or manually/automatically resend an old successful
    // Checkout event long after a refund. A refunded order is terminal and
    // must never be resurrected by an older checkout.session.completed event.
    return NextResponse.json({ ok: true });
  }

  if (order.status === "fulfilled") {
    // Duplicate successful Checkout delivery: fulfilment is already complete.
    // Do not send another receipt or grant anything again.
    await admin.rpc("finalize_store_discount_redemption", {
      p_order_id: orderId,
    });

    return NextResponse.json({ ok: true });
  }
'''

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"PATCH STOPPED: expected exactly 1 fulfilled duplicate-event block, found {count}"
    )

text = text.replace(old, new, 1)

old_failed = '''    if (orderId) {
      const { error } = await admin
        .from("store_orders")
        .update({ status: "failed" })
        .eq("id", orderId);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        );
      }
    }
'''

new_failed = '''    if (orderId) {
      // Do not let a late async-failure event overwrite a terminal order.
      const { error } = await admin
        .from("store_orders")
        .update({ status: "failed" })
        .eq("id", orderId)
        .in("status", ["pending", "paid"]);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 },
        );
      }
    }
'''

count = text.count(old_failed)
if count != 1:
    raise SystemExit(
        f"PATCH STOPPED: expected exactly 1 async failure block, found {count}"
    )

text = text.replace(old_failed, new_failed, 1)

p.write_text(text, encoding="utf-8", newline="\n")

print("Hardened Stripe webhook against stale/duplicate event resurrection.")
print("Next: npm run build")

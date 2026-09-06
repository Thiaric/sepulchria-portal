from pathlib import Path

def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"Could not find expected {label}. No further changes were made.")
    return text.replace(old, new, 1)

store_page = Path("app/(portal)/store/page.tsx")
text = store_page.read_text(encoding="utf-8")

text = replace_once(
    text,
    'import { StorePaddlePurchaseButton } from "@/components/store/store-paddle-purchase-button";\nimport { StoreRemnantPurchaseButton } from "@/components/store/store-remnant-purchase-button";\nimport { createClient } from "@/lib/supabase/server";',
    'import { StorePaddlePurchaseButton } from "@/components/store/store-paddle-purchase-button";\nimport { StoreRemnantPurchaseButton } from "@/components/store/store-remnant-purchase-button";\nimport { StoreMusicPreview } from "@/components/store/store-music-preview";\nimport { createAdminClient } from "@/lib/supabase/admin";\nimport { createClient } from "@/lib/supabase/server";',
    "Store imports",
)

text = replace_once(
    text,
    '''type MusicTrack = {
  id: string;
  name: string;
};''',
    '''type MusicTrack = {
  id: string;
  name: string;
  storage_path: string;
};''',
    "MusicTrack type",
)

text = replace_once(
    text,
    '''  if (!user) {
    redirect("/auth/login");
  }

  const { data: character } = await supabase''',
    '''  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  const { data: character } = await supabase''',
    "Store admin client insertion",
)

text = replace_once(
    text,
    '''    supabase
      .from("music_tracks")
      .select("id, name")
      .eq("is_active", true)
      .eq("is_personal_selectable", true)''',
    '''    admin
      .from("music_tracks")
      .select("id, name, storage_path")
      .eq("is_active", true)
      .eq("is_personal_selectable", true)''',
    "music query",
)

text = replace_once(
    text,
    '''  const musicTracks =
    (musicResult.data ?? []) as MusicTrack[];

  const ownedSkinIds = new Set(''',
    '''  const musicTracks =
    (musicResult.data ?? []) as MusicTrack[];

  const musicPreviewUrls = new Map<string, string>();
  await Promise.all(
    musicTracks.map(async (track) => {
      if (!track.storage_path) return;

      const { data, error } = await admin.storage
        .from("music")
        .createSignedUrl(track.storage_path, 15 * 60);

      if (!error && data?.signedUrl) {
        musicPreviewUrls.set(track.id, data.signedUrl);
      }
    }),
  );

  const ownedSkinIds = new Set(''',
    "music preview URL creation",
)

text = text.replace(
    '''                    musicNames={musicNames}
                    featured''',
    '''                    musicNames={musicNames}
                    musicPreviewUrls={musicPreviewUrls}
                    featured''',
)
text = text.replace(
    '''                    musicNames={musicNames}
                  />''',
    '''                    musicNames={musicNames}
                    musicPreviewUrls={musicPreviewUrls}
                  />''',
)

text = replace_once(
    text,
    '''  cosmeticNames,
  musicNames,
  featured = false,''',
    '''  cosmeticNames,
  musicNames,
  musicPreviewUrls,
  featured = false,''',
    "StoreProductCard arguments",
)

text = replace_once(
    text,
    '''  cosmeticNames: Map<string, string>;
  musicNames: Map<string, string>;
  featured?: boolean;''',
    '''  cosmeticNames: Map<string, string>;
  musicNames: Map<string, string>;
  musicPreviewUrls: Map<string, string>;
  featured?: boolean;''',
    "StoreProductCard prop types",
)

text = replace_once(
    text,
    '''  const skin =
    skinGrant?.portal_skin_id
      ? skinDetails.get(skinGrant.portal_skin_id)
      : null;

  const grantLabels = grants.map((grant) => {''',
    '''  const skin =
    skinGrant?.portal_skin_id
      ? skinDetails.get(skinGrant.portal_skin_id)
      : null;

  const musicGrant = grants.find(
    (grant) =>
      grant.grant_type === "music" &&
      grant.music_track_id,
  );

  const musicPreviewUrl =
    musicGrant?.music_track_id
      ? musicPreviewUrls.get(musicGrant.music_track_id) ?? null
      : null;

  const musicPreviewName =
    musicGrant?.music_track_id
      ? musicNames.get(musicGrant.music_track_id) ?? product.name
      : product.name;

  const grantLabels = grants.map((grant) => {''',
    "music grant preview lookup",
)

text = replace_once(
    text,
    '''        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          {product.description ||
            "A premium unlock from the Sepulchria Store."}
        </p>

        {grantLabels.length ? (''',
    '''        <p className="mt-2 text-[10px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
          {product.description ||
            "A premium unlock from the Sepulchria Store."}
        </p>

        {product.category === "music" && musicPreviewUrl ? (
          <StoreMusicPreview
            src={musicPreviewUrl}
            title={musicPreviewName}
          />
        ) : null}

        {grantLabels.length ? (''',
    "music preview render",
)

store_page.write_text(text, encoding="utf-8")

preview_component = Path("components/store/store-music-preview.tsx")
preview_component.write_text('''"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_SECONDS = 10;

export function StoreMusicPreview({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const stop = (reset = true) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    if (reset) {
      audio.currentTime = 0;
      setElapsed(0);
    }
    setPlaying(false);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      stop();
      return;
    }

    audio.currentTime = 0;
    setElapsed(0);

    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(event) => {
          const current = event.currentTarget.currentTime;
          const bounded = Math.min(PREVIEW_SECONDS, current);
          setElapsed(bounded);

          if (current >= PREVIEW_SECONDS) {
            stop();
          }
        }}
        onEnded={() => stop()}
      />

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-756958))]">
            10 second preview
          </p>
          <p className="mt-1 truncate text-[9px] text-[rgb(var(--sep-colour-a99b89))]">
            {title}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void toggle()}
          className="shrink-0 border border-[rgb(var(--sep-colour-80613b))]/60 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-a17a49))]"
        >
          {playing ? "Stop" : "▶ Preview"}
        </button>
      </div>

      <div className="mt-2 h-px overflow-hidden bg-[rgb(var(--sep-colour-4f3d29))]">
        <div
          className="h-full bg-[rgb(var(--sep-colour-a17a49))] transition-[width] duration-100"
          style={{
            width: `${Math.min(100, (elapsed / PREVIEW_SECONDS) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}
''', encoding="utf-8")

actions_path = Path("app/(portal)/store/actions.ts")
actions = actions_path.read_text(encoding="utf-8")

actions = replace_once(
    actions,
    '''export type StorePaddleState = {
  ok: boolean;
  error: string | null;
  checkoutUrl: string | null;
  transactionId: string | null;
};''',
    '''export type StorePaddleState = {
  ok: boolean;
  error: string | null;
  checkoutUrl: string | null;
  transactionId: string | null;
  customerEmail: string | null;
};''',
    "StorePaddleState",
)

start = actions.index("export async function startStorePaddleCheckout")
head = actions[:start]
checkout = actions[start:]
checkout = checkout.replace(
    "transactionId: null };",
    "transactionId: null, customerEmail: null };",
)
checkout = checkout.replace(
    '''      transactionId: null,
    };''',
    '''      transactionId: null,
      customerEmail: null,
    };''',
)

checkout = replace_once(
    checkout,
    '''  if (!user) {
    return { ok: false, error: "You must be signed in.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const [characterResult, productResult, priceResult, grantsResult] =''',
    '''  if (!user) {
    return { ok: false, error: "You must be signed in.", checkoutUrl: null, transactionId: null, customerEmail: null };
  }

  const customerEmail = user.email?.trim() ?? "";
  if (!customerEmail) {
    return {
      ok: false,
      error: "Your account does not have an email address for Paddle receipts.",
      checkoutUrl: null,
      transactionId: null,
      customerEmail: null,
    };
  }

  const [characterResult, productResult, priceResult, grantsResult] =''',
    "Paddle user email validation",
)

checkout = replace_once(
    checkout,
    '''  return {
    ok: true,
    error: null,
    checkoutUrl: payload.data.checkout.url,
    transactionId: payload.data.id,
  };''',
    '''  return {
    ok: true,
    error: null,
    checkoutUrl: payload.data.checkout.url,
    transactionId: payload.data.id,
    customerEmail,
  };''',
    "Paddle success email",
)

actions_path.write_text(head + checkout, encoding="utf-8")

button_path = Path("components/store/store-paddle-purchase-button.tsx")
button = button_path.read_text(encoding="utf-8")

button = replace_once(
    button,
    '''const initialState: StorePaddleState = {
  ok: false,
  error: null,
  checkoutUrl: null,
  transactionId: null,
};''',
    '''const initialState: StorePaddleState = {
  ok: false,
  error: null,
  checkoutUrl: null,
  transactionId: null,
  customerEmail: null,
};''',
    "Paddle initial state",
)

button = replace_once(
    button,
    '''    if (!state.ok || !state.transactionId) return;''',
    '''    if (!state.ok || !state.transactionId || !state.customerEmail) return;''',
    "Paddle effect guard",
)

button = replace_once(
    button,
    '''        paddle.Checkout.open({
          transactionId: state.transactionId!,
        });''',
    '''        paddle.Checkout.open({
          transactionId: state.transactionId!,
          customer: {
            email: state.customerEmail!,
          },
          settings: {
            allowLogout: false,
          },
        });''',
    "Paddle checkout customer email",
)

button = replace_once(
    button,
    '''  }, [state.ok, state.transactionId]);''',
    '''  }, [state.ok, state.transactionId, state.customerEmail]);''',
    "Paddle effect dependencies",
)

button_path.write_text(button, encoding="utf-8")

ledger_entries = Path("components/economy/ledger-entries.tsx")
ledger_entries.write_text('''"use client";

import { useMemo, useState } from "react";
import { formatRemnants, formatSignedRemnants } from "@/lib/economy/currency";

export type LedgerFilterEntry = {
  id: string;
  amount: number | string;
  balance_after: number | string | null;
  reason: string;
  created_at: string;
  kind?: "remnants" | "money";
  currency?: string | null;
  money_amount_minor?: number | string | null;
};

type Props = {
  entries: LedgerFilterEntry[];
  compact?: boolean;
};

function moneyLabel(entry: LedgerFilterEntry) {
  const amountMinor = Math.abs(Number(entry.money_amount_minor ?? entry.amount ?? 0));
  const currency = entry.currency ?? "GBP";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function amountLabel(entry: LedgerFilterEntry) {
  if (entry.kind === "money") {
    return `−${moneyLabel(entry)}`;
  }

  return formatSignedRemnants(Number(entry.amount));
}

function movementValue(entry: LedgerFilterEntry) {
  if (entry.kind === "money") return -Math.abs(Number(entry.money_amount_minor ?? 0));
  return Number(entry.amount);
}

export function LedgerEntries({ entries, compact = false }: Props) {
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [movement, setMovement] = useState<"all" | "positive" | "negative">("all");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return entries.filter((entry) => {
      const amount = movementValue(entry);
      if (movement === "positive" && amount <= 0) return false;
      if (movement === "negative" && amount >= 0) return false;

      if (date) {
        const entryDate = new Date(entry.created_at);
        const localDate = [
          entryDate.getFullYear(),
          String(entryDate.getMonth() + 1).padStart(2, "0"),
          String(entryDate.getDate()).padStart(2, "0"),
        ].join("-");
        if (localDate !== date) return false;
      }

      if (needle && !entry.reason.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [entries, search, date, movement]);

  return (
    <>
      <div className="grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] p-3 sm:grid-cols-[minmax(180px,1fr)_150px_150px_auto]">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shop, item, type, reason..."
          className="min-w-0 border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d7c4a5))] outline-none placeholder:text-[rgb(var(--sep-colour-625747))] focus:border-[rgb(var(--sep-colour-a17a49))]"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
        />
        <select
          value={movement}
          onChange={(e) => setMovement(e.target.value as "all" | "positive" | "negative")}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0a08))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-bba98c))] outline-none focus:border-[rgb(var(--sep-colour-a17a49))]"
        >
          <option value="all">All movements</option>
          <option value="positive">Positive only</option>
          <option value="negative">Negative only</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setDate("");
            setMovement("all");
          }}
          className="border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-a99578))] hover:border-[rgb(var(--sep-colour-8c6b43))] hover:text-[rgb(var(--sep-colour-dfc79c))]"
        >
          Clear
        </button>
      </div>

      <div className={compact ? "max-h-[230px] space-y-1.5 overflow-y-auto p-1 pr-1" : "max-h-[520px] overflow-y-auto"}>
        {filtered.length ? (
          filtered.map((entry) => {
            const isMoney = entry.kind === "money";
            const amount = movementValue(entry);
            const amountClass = amount > 0 ? "text-emerald-400" : "text-red-400";
            const balanceText = isMoney
              ? "Real-money Store purchase"
              : `Balance ${formatRemnants(Number(entry.balance_after ?? 0))}`;

            return compact ? (
              <div key={entry.id} className="grid gap-1 border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2 sm:grid-cols-[90px_minmax(0,1fr)_135px_120px]">
                <span className={`text-[10px] ${amountClass}`}>{amountLabel(entry)}</span>
                <span className="min-w-0 text-[9px] text-[rgb(var(--sep-colour-a99578))]">{entry.reason}</span>
                <span className="text-right text-[8px] text-[rgb(var(--sep-colour-756958))]">{balanceText}</span>
                <time className="text-right text-[8px] text-[rgb(var(--sep-colour-665b4d))]">{new Date(entry.created_at).toLocaleString("en-GB")}</time>
              </div>
            ) : (
              <div key={entry.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-3 last:border-b-0 sm:grid-cols-[120px_minmax(0,1fr)_150px_145px] sm:items-center sm:px-5">
                <span className={`text-[11px] ${amountClass}`}>{amountLabel(entry)}</span>
                <span className="min-w-0 text-[10px] leading-5 text-[rgb(var(--sep-colour-a99578))]">{entry.reason}</span>
                <span className="text-[9px] text-[rgb(var(--sep-colour-756958))] sm:text-right">{balanceText}</span>
                <time className="text-[8px] text-[rgb(var(--sep-colour-665b4d))] sm:text-right">{new Date(entry.created_at).toLocaleString("en-GB")}</time>
              </div>
            );
          })
        ) : (
          <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))]">No Ledger transactions match these filters.</p>
        )}
      </div>
    </>
  );
}
''', encoding="utf-8")

character_ledger = Path("components/characters/character-ledger.tsx")
character_ledger.write_text('''"use server";

import { LedgerEntries, type LedgerFilterEntry } from "@/components/economy/ledger-entries";
import { createClient } from "@/lib/supabase/server";

type StoreOrder = {
  id: string;
  currency: string | null;
  total_money_minor: number | null;
  paid_at: string | null;
  created_at: string;
};

type StoreOrderItem = {
  order_id: string;
  product_name_snapshot: string;
};

export async function CharacterLedger({ characterId }: { characterId: string }) {
  const supabase = await createClient();

  const [remnantResult, orderResult] = await Promise.all([
    supabase
      .from("remnant_ledger")
      .select("id, amount, balance_after, reason, created_at")
      .eq("character_id", characterId)
      .order("created_at", { ascending: false })
      .limit(250),

    supabase
      .from("store_orders")
      .select("id, currency, total_money_minor, paid_at, created_at")
      .eq("character_id", characterId)
      .eq("payment_method", "paddle")
      .eq("status", "fulfilled")
      .order("created_at", { ascending: false })
      .limit(250),
  ]);

  const firstError = remnantResult.error ?? orderResult.error;
  if (firstError) {
    throw new Error(`Unable to load Ledger: ${firstError.message}`);
  }

  const orders = (orderResult.data ?? []) as StoreOrder[];
  const orderIds = orders.map((order) => order.id);

  const itemResult = orderIds.length
    ? await supabase
        .from("store_order_items")
        .select("order_id, product_name_snapshot")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (itemResult.error) {
    throw new Error(`Unable to load Store purchases in Ledger: ${itemResult.error.message}`);
  }

  const itemNamesByOrder = new Map<string, string[]>();
  for (const item of (itemResult.data ?? []) as StoreOrderItem[]) {
    const names = itemNamesByOrder.get(item.order_id) ?? [];
    names.push(item.product_name_snapshot);
    itemNamesByOrder.set(item.order_id, names);
  }

  const remnantEntries: LedgerFilterEntry[] = (remnantResult.data ?? []).map(
    (entry) => ({
      ...entry,
      kind: "remnants",
    }),
  );

  const moneyEntries: LedgerFilterEntry[] = orders.map((order) => {
    const productNames = itemNamesByOrder.get(order.id) ?? [];
    const totalMinor = Number(order.total_money_minor ?? 0);

    return {
      id: `store-${order.id}`,
      amount: -Math.abs(totalMinor),
      balance_after: null,
      reason: `Store purchase · ${productNames.join(" + ") || "Sepulchria Store"}`,
      created_at: order.paid_at ?? order.created_at,
      kind: "money",
      currency: order.currency,
      money_amount_minor: totalMinor,
    };
  });

  const entries = [...remnantEntries, ...moneyEntries]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime(),
    )
    .slice(0, 500);

  return (
    <section className="border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-130f0c))]">
      <div className="border-b border-[rgb(var(--sep-colour-59432c))]/30 px-4 py-3 sm:px-5">
        <p className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">Economy</p>
        <h2 className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-dfc79c))]">Immutable Ledger</h2>
        <p className="mt-1 text-[10px] leading-5 text-[rgb(var(--sep-colour-827564))]">
          Every Remnant gained or spent, and every completed real-money Store purchase, is recorded here.
        </p>
      </div>
      {entries.length ? (
        <LedgerEntries entries={entries} />
      ) : (
        <p className="px-5 py-8 text-center text-[10px] text-[rgb(var(--sep-colour-756958))]">No Ledger transactions yet.</p>
      )}
    </section>
  );
}
''', encoding="utf-8")

print("Applied Store improvements:")
print("1) 10-second manual previews for Store music.")
print("2) Fulfilled Paddle purchases appear in the character Ledger.")
print("3) Paddle receipt email is the checkout customer email.")
print("4) Checkout email is automatically the logged-in Supabase account email and is locked.")

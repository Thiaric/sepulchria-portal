import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const dynamic =
  "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: NextRequest,
) {
  const supabase =
    await createClient();

  const {
    data: { user },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          "Not authorised.",
      },
      {
        status: 401,
      },
    );
  }

  const rawIds =
    request.nextUrl.searchParams
      .get("ids") ??
    "";

  const characterIds =
    Array.from(
      new Set(
        rawIds
          .split(",")
          .map(
            (value) =>
              value.trim(),
          )
          .filter(
            (value) =>
              UUID.test(
                value,
              ),
          ),
      ),
    ).slice(0, 100);

  if (
    characterIds.length ===
    0
  ) {
    return NextResponse.json({
      frames: {},
    });
  }

  const admin =
    createAdminClient();

  const {
    data: preferences,
    error: preferenceError,
  } = await admin
    .from(
      "character_cosmetic_preferences",
    )
    .select(
      "character_id, equipped_chat_frame_id",
    )
    .in(
      "character_id",
      characterIds,
    )
    .not(
      "equipped_chat_frame_id",
      "is",
      null,
    );

  if (preferenceError) {
    return NextResponse.json(
      {
        error:
          preferenceError.message,
      },
      {
        status: 500,
      },
    );
  }

  const cosmeticIds =
    Array.from(
      new Set(
        (
          preferences ?? []
        )
          .map(
            (entry) =>
              entry
                .equipped_chat_frame_id,
          )
          .filter(Boolean),
      ),
    );

  if (
    cosmeticIds.length === 0
  ) {
    return NextResponse.json({
      frames: {},
    });
  }

  const [
    cosmeticsResult,
    entitlementsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "cosmetic_items",
        )
        .select(
          "id, asset_url, category, is_active",
        )
        .in(
          "id",
          cosmeticIds,
        )
        .eq(
          "category",
          "chat_frame",
        )
        .eq(
          "is_active",
          true,
        ),

      admin
        .from(
          "character_cosmetic_entitlements",
        )
        .select(
          "character_id, cosmetic_item_id, enabled",
        )
        .in(
          "character_id",
          characterIds,
        )
        .in(
          "cosmetic_item_id",
          cosmeticIds,
        )
        .eq(
          "enabled",
          true,
        ),
    ]);

  const firstError =
    cosmeticsResult.error ??
    entitlementsResult.error;

  if (firstError) {
    return NextResponse.json(
      {
        error:
          firstError.message,
      },
      {
        status: 500,
      },
    );
  }

  const cosmetics =
    new Map(
      (
        cosmeticsResult.data ??
        []
      )
        .filter(
          (entry) =>
            Boolean(
              entry.asset_url,
            ),
        )
        .map(
          (entry) => [
            entry.id,
            entry.asset_url,
          ],
        ),
    );

  const enabledPairs =
    new Set(
      (
        entitlementsResult.data ??
        []
      ).map(
        (entry) =>
          `${entry.character_id}:${entry.cosmetic_item_id}`,
      ),
    );

  const frames:
    Record<
      string,
      string
    > = {};

  for (
    const preference of
      preferences ?? []
  ) {
    const cosmeticId =
      preference
        .equipped_chat_frame_id;

    if (
      !cosmeticId ||
      !enabledPairs.has(
        `${preference.character_id}:${cosmeticId}`,
      )
    ) {
      continue;
    }

    const assetUrl =
      cosmetics.get(
        cosmeticId,
      );

    if (assetUrl) {
      frames[
        preference.character_id
      ] = assetUrl;
    }
  }

  return NextResponse.json({
    frames,
  });
}

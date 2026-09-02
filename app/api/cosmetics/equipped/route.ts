import { NextRequest, NextResponse } from "next/server";

import {
  PUBLIC_COSMETIC_CATEGORIES,
  type CosmeticCategory,
} from "@/lib/cosmetics/catalogue";
import {
  getEquippedCosmeticsForCharacters,
} from "@/lib/cosmetics/get-equipped-cosmetic";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PUBLIC_SET = new Set<string>(PUBLIC_COSMETIC_CATEGORIES);

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const ids = Array.from(
    new Set(
      (request.nextUrl.searchParams.get("ids") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter((value) => UUID.test(value)),
    ),
  ).slice(0, 100);

  const requested = (request.nextUrl.searchParams.get("categories") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(
      (value): value is CosmeticCategory =>
        PUBLIC_SET.has(value),
    );

  const categories =
    requested.length > 0
      ? requested
      : [...PUBLIC_COSMETIC_CATEGORIES];

  try {
    const cosmetics = await getEquippedCosmeticsForCharacters(
      ids,
      categories,
    );

    return NextResponse.json({ cosmetics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load cosmetics.",
      },
      { status: 500 },
    );
  }
}

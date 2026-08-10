import {
  NextResponse,
} from "next/server";

import {
  tickAutomaticWeather,
} from "@/lib/world/weather-engine";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result =
      await tickAutomaticWeather();

    return NextResponse.json(
      result,
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    console.error(
      "World weather tick failed:",
      error,
    );

    return NextResponse.json(
      {
        changed: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown weather engine error.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}

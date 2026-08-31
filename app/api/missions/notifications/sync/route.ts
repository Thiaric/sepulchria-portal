import { NextResponse } from "next/server";

import {
  syncMyDailyMissionNotifications,
} from "@/lib/missions/notifications";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result =
      await syncMyDailyMissionNotifications();

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Daily Mission notification sync:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to synchronize Daily Mission notifications.",
      },
      { status: 500 },
    );
  }
}

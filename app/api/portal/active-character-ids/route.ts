import {
  NextResponse,
} from "next/server";

import {
  getAuthenticatedUser,
} from "@/lib/auth/get-authenticated-user";
import {
  getStaffSession,
} from "@/lib/auth/require-staff";
import {
  getActivePortalCharacterIds,
} from "@/lib/portal/get-active-portal-character-ids";

export const dynamic =
  "force-dynamic";

export async function GET() {
  const {
    data: { user },
    error: userError,
  } =
    await getAuthenticatedUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        ok: false,
        characterIds: [],
      },
      {
        status: 401,
      },
    );
  }

  try {
    const staffSession =
      await getStaffSession();

    const characterIds =
      await getActivePortalCharacterIds({
        includeAppearOffline:
          staffSession !== null,
      });

    return NextResponse.json(
      {
        ok: true,
        characterIds,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Unable to load active Portal Characters:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        characterIds: [],
      },
      {
        status: 500,
      },
    );
  }
}

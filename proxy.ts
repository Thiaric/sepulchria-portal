import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(
  request: NextRequest,
) {
  if (
    request.nextUrl.searchParams.get(
      "embedded",
    ) === "1"
  ) {
    request.headers.set(
      "x-sepulchria-embedded",
      "1",
    );
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|offline.html|icons/pwa|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|m4a|aac|mp4|webm|ogg)$).*)",
  ],
};

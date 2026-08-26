import {
  createClient as createSupabaseClient,
  type EmailOtpType,
} from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

function getSafeRedirectPath(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/auth/login";
  }

  return value;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = getSafeRedirectPath(
    searchParams.get("next"),
  );

  if (token_hash && type) {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    );

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirect(next);
    }

    redirect(
      `/auth/error?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/auth/error?error=${encodeURIComponent(
      "No token hash or type",
    )}`,
  );
}

import type { Metadata } from "next";

import { SepulchriaHomepage } from "@/components/homepage/sepulchria-homepage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sepulchria",
  description:
    "Enter Sepulchria, a living fantasy world forged from the remains of fallen gods.",
};

export const dynamic = "force-dynamic";

export default async function HomepagePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <SepulchriaHomepage
      isAuthenticated={Boolean(user)}
      enterHref={user ? "/" : "/auth/login"}
    />
  );
}

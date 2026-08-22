import type { Metadata } from "next";

import { SepulchriaHomepage } from "@/components/homepage/sepulchria-homepage";
import { createClient } from "@/lib/supabase/server";
import { getRegistrationsOpen } from "@/lib/registration/get-registrations-open";

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

  const registrationsOpen =
    await getRegistrationsOpen();

  return (
    <SepulchriaHomepage
      isAuthenticated={Boolean(user)}
      registrationsOpen={registrationsOpen}
      enterHref={user ? "/" : "/auth/login"}
    />
  );
}

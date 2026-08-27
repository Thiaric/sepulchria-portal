import { redirect } from "next/navigation";

import { OrderSubmissionForm } from "@/components/orders/order-submission-form";
import { createClient } from "@/lib/supabase/server";

export default async function SubmitOrderIdeaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character } = await supabase
    .from("characters")
    .select("id, display_name, first_name, surname, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!character || character.status !== "approved") {
    redirect("/orders");
  }

  const characterName =
    character.display_name?.trim() ||
    `${character.first_name ?? ""} ${character.surname ?? ""}`.trim();

  return (
    <main className="mx-auto w-full max-w-5xl p-5 sm:p-7 lg:p-9">
      <header className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] px-5 py-5 sm:px-7">
        <p className="text-[9px] uppercase tracking-[0.26em] text-[rgb(var(--sep-colour-8c704b))]">
          Orders of Sepulchria
        </p>
        <h1 className="mt-2 font-serif text-3xl text-[rgb(var(--sep-colour-e1c89f))]">
          Submit Your Order Idea
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[rgb(var(--sep-colour-a99b89))]">
          Propose a new Order, its identity, visual direction and roles across all six levels.
          Your submission will be attached to {characterName}.
        </p>
      </header>

      <OrderSubmissionForm />
    </main>
  );
}

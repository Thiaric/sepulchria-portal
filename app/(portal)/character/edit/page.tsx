import Link from "next/link";
import { redirect } from "next/navigation";

import CharacterForm from "../CharacterForm";
import { updateCharacter } from "./actions";
import {
  submitCharacterForReview,
} from "../actions";
import {
  PendingSubmitButton,
} from "@/components/forms/pending-submit-button";
import { getRaces } from "@/lib/races";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/get-authenticated-user";

type EditCharacterPageProps = {
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function EditCharacterPage({
  searchParams,
}: EditCharacterPageProps) {
  const {
    error,
    updated,
  } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) redirect("/auth/login");

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (characterError) throw new Error(characterError.message);
  if (!character) redirect("/character/create");

  /*
   * The full creation-style editor is specifically the correction /
   * rework state. Submitted Characters remain locked and Approved
   * Characters use their normal approved profile editor.
   */
  if (
    character.status !== "draft" &&
    character.status !== "rejected"
  ) {
    redirect("/character");
  }

  const races = await getRaces();

  return (
    <main className="min-h-screen bg-[rgb(var(--sep-colour-100d0b))] px-5 py-8 text-[rgb(var(--sep-colour-e7d5b0))] sm:py-10 character_edit_page_main_main">
      <div className="mx-auto max-w-7xl character_edit_page_div_container">
        <Link
          href="/character"
          className="text-sm text-[rgb(var(--sep-colour-b8945d))] transition hover:text-[rgb(var(--sep-colour-e3c28c))]"
        >
          ← Cancel editing
        </Link>

        <header className="my-8 max-w-3xl character_edit_page_header_edit">
          <p className="text-[10px] uppercase tracking-[0.34em] text-[rgb(var(--sep-colour-957448))] character_edit_page_p_edit">
            Character record
          </p>
          <h1 className="mt-3 break-words font-serif text-4xl text-[rgb(var(--sep-colour-ecd9b2))] sm:text-5xl character_edit_page_h1_edit">
            Edit {character.display_name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-9e907d))] sm:text-base character_edit_page_p_edit_2">
            Continue through the Character creation process, update the record,
            save your changes, then submit it for staff approval again.
            Ancestry remains locked; Association and Order membership are
            controlled by the Order system.
          </p>
        </header>

        {character.status === "rejected" ? (
          <section className="mb-6 border border-[rgb(var(--sep-colour-853e35))]/70 bg-[rgb(var(--sep-colour-2d1512))]/75 p-5">
            <p className="text-[9px] uppercase tracking-[0.25em] text-[rgb(var(--sep-colour-d2786d))]">
              Corrections requested
            </p>

            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[rgb(var(--sep-colour-ddb2aa))]">
              {character.rejection_reason?.trim() ||
                "No rejection reason was provided. Contact the staff for clarification."}
            </p>
          </section>
        ) : null}

        {updated === "true" ? (
          <p className="mb-6 border border-[rgb(var(--sep-colour-4f704e))]/65 bg-[rgb(var(--sep-colour-172619))]/70 p-4 text-sm text-[rgb(var(--sep-colour-b7d2ae))]">
            Character changes saved. You can continue editing or submit the Character for approval.
          </p>
        ) : null}

        {error ? (
          <p className="mb-6 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-[rgb(var(--sep-colour-e4b4aa))] character_edit_page_p_text">
            {error}
          </p>
        ) : null}

        <CharacterForm
          action={updateCharacter}
          character={character}
          races={races}
          submitLabel="Save changes"
          mode="update"
        />

        <section className="mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))]">
            Ready for review?
          </p>

          <p className="mt-2 text-sm leading-6 text-[rgb(var(--sep-colour-9e907d))]">
            Save your latest changes above, then submit the Character to staff.
            Submission locks the Character again until staff approve it or request
            further corrections.
          </p>

          <form
            action={submitCharacterForReview}
            className="mt-4"
          >
            <PendingSubmitButton
              idleText={
                character.status === "rejected"
                  ? "Submit again"
                  : "Submit for approval"
              }
              pendingText="Submitting..."
              className="border border-[rgb(var(--sep-colour-a47b43))] bg-[rgb(var(--sep-colour-472d18))] px-5 py-3 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-f3d7a5))] transition hover:border-[rgb(var(--sep-colour-d0a15c))] hover:bg-[rgb(var(--sep-colour-5c391d))] disabled:cursor-not-allowed disabled:opacity-60"
            />
          </form>
        </section>
      </div>
    </main>
  );
}

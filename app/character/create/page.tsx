import { createCharacter } from "./actions";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";

type CharacterCreationPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function CharacterCreationPage({
  searchParams,
}: CharacterCreationPageProps) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
  data: { user },
} = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: existingCharacter } = await supabase
    .from("characters")
    .select("id, display_name, status")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,82,38,0.16),_transparent_38%),linear-gradient(to_bottom,_#18120e,_#0d0a08)]">
        <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
          <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between px-5">
            <div>
              <Link
                href="/"
                className="font-serif text-2xl font-semibold tracking-[0.22em] text-[#d9bd82]"
              >
                SEPULCHRIA
              </Link>

              <p className="mt-1 text-[10px] uppercase tracking-[0.32em] text-[#887966]">
                Chronicle of the Veiled City
              </p>
            </div>

            <Link
              href="/"
              className="text-xs uppercase tracking-[0.22em] text-[#b8945d] transition hover:text-[#ecd29e]"
            >
              ← Return
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <div className="mb-9 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-[#9b7848]">
              Character record
            </p>

            <h1 className="mt-3 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
              Create your character
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#a99a86] sm:text-base">
              This is the first draft of the person who will enter Sepulchria.
              You will be able to expand the character system as the game is
              developed.
            </p>
          </div>

          {error && (
            <div className="mb-6 border border-[#8c463d] bg-[#2a1513] px-5 py-4 text-sm text-[#e4b4aa]">
              {error}
            </div>
          )}

          {existingCharacter ? (
            <section className="max-w-2xl border border-[#705535]/50 bg-[#18120e] p-7">
              <p className="text-xs uppercase tracking-[0.3em] text-[#92734a]">
                Existing record
              </p>

              <h2 className="mt-3 font-serif text-3xl text-[#dec69a]">
                {existingCharacter.display_name}
              </h2>

              <p className="mt-3 text-sm text-[#a39683]">
                This account already has a character.
              </p>

              <p className="mt-2 text-sm text-[#a39683]">
                Current status:{" "}
                <span className="capitalize text-[#c9a66d]">
                  {existingCharacter.status}
                </span>
              </p>

              <Link
                href="/"
                className="mt-7 inline-flex border border-[#85653c] bg-[#342617] px-5 py-3 text-xs uppercase tracking-[0.22em] text-[#efd4a0]"
              >
                Return to dashboard
              </Link>
            </section>
          ) : (
            <form
              action={createCharacter}
              className="border border-[#6c5132]/50 bg-[#17110d]/95"
            >
              <div className="grid gap-6 border-b border-[#5d452d]/40 p-6 sm:grid-cols-2 sm:p-8">
                <Field
                  label="First name"
                  name="first_name"
                  required
                  placeholder="Character's first name"
                />

                <Field
                  label="Surname"
                  name="surname"
                  required
                  placeholder="Character's surname"
                />

                <Field
                  label="Pronouns"
                  name="pronouns"
                  placeholder="For example: he/him"
                />

                <Field
                  label="Date of birth"
                  name="date_of_birth"
                  type="date"
                />

                <Field
                  label="Birthplace"
                  name="birthplace"
                  placeholder="Where were they born?"
                />

                <Field
                  label="Origin"
                  name="origin"
                  placeholder="Family, district or homeland"
                />

                <div className="sm:col-span-2">
                  <Field
                    label="Occupation"
                    name="occupation"
                    placeholder="Trade, calling or position"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="biography"
                    className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]"
                  >
                    Biography
                  </label>

                  <textarea
                    id="biography"
                    name="biography"
                    rows={8}
                    placeholder="Describe the character's history, personality and circumstances..."
                    className="w-full resize-y border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm leading-6 text-[#dfceb0] outline-none transition placeholder:text-[#665b4d] focus:border-[#a17a45]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-[#110d0a] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                <p className="max-w-xl text-xs leading-5 text-[#807463]">
                  The character will initially be saved as a draft. Approval
                  and staff review will be added later.
                </p>

                <button
                  type="submit"
                  className="border border-[#95703f] bg-[#3c2b1a] px-7 py-3 text-xs uppercase tracking-[0.25em] text-[#f0d39b] transition hover:bg-[#513923]"
                >
                  Create character
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

type FieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
};

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
}: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-[11px] uppercase tracking-[0.25em] text-[#a38357]"
      >
        {label}
        {required && <span className="ml-1 text-[#b65d4f]">*</span>}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm text-[#dfceb0] outline-none transition placeholder:text-[#665b4d] focus:border-[#a17a45]"
      />
    </div>
  );
}
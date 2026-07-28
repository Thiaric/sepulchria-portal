import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCharacter } from "./actions";

type CharacterEditPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default function CharacterEditPage({
  searchParams,
}: CharacterEditPageProps) {
  return (
    <Suspense fallback={<EditCharacterLoading />}>
      <EditCharacterContent searchParams={searchParams} />
    </Suspense>
  );
}

async function EditCharacterContent({
  searchParams,
}: CharacterEditPageProps) {
  const { error: formError } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: character, error } = await supabase
    .from("characters")
    .select(
      `
        id,
        first_name,
        surname,
        display_name,
        pronouns,
        date_of_birth,
        birthplace,
        origin,
        occupation,
        biography,
        portrait_url,
        status
      `,
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load character: ${error.message}`);
  }

  if (!character) {
    redirect("/character/create");
  }

  return (
    <main className="min-h-screen bg-[#100d0b] text-[#e7d5b0]">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(120,82,38,0.16),_transparent_38%),linear-gradient(to_bottom,_#18120e,_#0d0a08)]">
        <header className="border-b border-[#654b2e]/40 bg-[#0c0a08]/90">
          <div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between gap-5 px-5">
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
              href="/character"
              className="text-xs uppercase tracking-[0.22em] text-[#b8945d] transition hover:text-[#ecd29e]"
            >
              ← Cancel editing
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
          <div className="mb-9 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-[#9b7848]">
              Character record
            </p>

            <h1 className="mt-3 font-serif text-4xl text-[#ecd9b2] sm:text-5xl">
              Edit {character.display_name}
            </h1>

            <p className="mt-4 text-sm leading-7 text-[#a99a86] sm:text-base">
              Update the information stored in your character record. Changes
              will appear immediately on the character page.
            </p>
          </div>

          {formError && (
            <div className="mb-6 border border-[#8c463d] bg-[#2a1513] px-5 py-4 text-sm text-[#e4b4aa]">
              {formError}
            </div>
          )}

          <form
            action={updateCharacter}
            className="border border-[#6c5132]/50 bg-[#17110d]/95"
          >
            <div className="grid gap-6 border-b border-[#5d452d]/40 p-6 sm:grid-cols-2 sm:p-8">
              <Field
                label="First name"
                name="first_name"
                required
                defaultValue={character.first_name}
                placeholder="Character's first name"
              />

              <Field
                label="Surname"
                name="surname"
                required
                defaultValue={character.surname}
                placeholder="Character's surname"
              />

              <Field
                label="Pronouns"
                name="pronouns"
                defaultValue={character.pronouns ?? ""}
                placeholder="For example: he/him"
              />

              <Field
                label="Date of birth"
                name="date_of_birth"
                type="date"
                defaultValue={character.date_of_birth ?? ""}
              />

              <Field
                label="Birthplace"
                name="birthplace"
                defaultValue={character.birthplace ?? ""}
                placeholder="Where were they born?"
              />

              <Field
                label="Origin"
                name="origin"
                defaultValue={character.origin ?? ""}
                placeholder="Family, district or homeland"
              />

              <div className="sm:col-span-2">
                <Field
                  label="Occupation"
                  name="occupation"
                  defaultValue={character.occupation ?? ""}
                  placeholder="Trade, calling or position"
                />
              </div>

              <div className="sm:col-span-2">
                <Field
                  label="Portrait URL"
                  name="portrait_url"
                  type="url"
                  defaultValue={character.portrait_url ?? ""}
                  placeholder="https://example.com/portrait.jpg"
                />

                <p className="mt-2 text-xs leading-5 text-[#756b5d]">
                  For now, paste a direct public image URL. File uploads will be
                  added later.
                </p>
              </div>

              {character.portrait_url && (
                <div className="sm:col-span-2">
                  <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-[#a38357]">
                    Current portrait
                  </p>

                  <div className="h-64 w-52 overflow-hidden border border-[#654c31] bg-[#0f0c09]">
                    <img
                      src={character.portrait_url}
                      alt={`Current portrait of ${character.display_name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

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
                  rows={10}
                  defaultValue={character.biography ?? ""}
                  placeholder="Describe the character's history, personality and circumstances..."
                  className="w-full resize-y border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm leading-6 text-[#dfceb0] outline-none transition placeholder:text-[#665b4d] focus:border-[#a17a45]"
                />
              </div>
            </div>

            <div className="flex flex-col gap-4 bg-[#110d0a] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-[#806b50]">
                  Character status
                </p>

                <p className="mt-2 text-sm capitalize text-[#b9a68a]">
                  {character.status}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/character"
                  className="border border-[#60492f] px-6 py-3 text-center text-xs uppercase tracking-[0.22em] text-[#ad9a7d] transition hover:border-[#806344] hover:text-[#e0c99e]"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="border border-[#95703f] bg-[#3c2b1a] px-7 py-3 text-xs uppercase tracking-[0.25em] text-[#f0d39b] transition hover:bg-[#513923]"
                >
                  Save changes
                </button>
              </div>
            </div>
          </form>
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
  defaultValue?: string;
};

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  defaultValue = "",
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
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full border border-[#654c31] bg-[#0f0c09] px-4 py-3 text-sm text-[#dfceb0] outline-none transition placeholder:text-[#665b4d] focus:border-[#a17a45]"
      />
    </div>
  );
}

function EditCharacterLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#100d0b] text-[#b8945d]">
      <p className="font-serif text-xl tracking-[0.15em]">
        Opening character record...
      </p>
    </main>
  );
}
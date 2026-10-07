from pathlib import Path

FORM = Path("components/admin/admin-character-edit-form.tsx")
PAGE = Path("app/(portal)/admin/characters/[id]/page.tsx")

def fail(message: str) -> None:
    raise SystemExit(f"ERROR: {message}\nNo changes were made.")

for path in (FORM, PAGE):
    if not path.exists():
        fail(f"Missing expected file: {path}")

form = FORM.read_text(encoding="utf-8")
page = PAGE.read_text(encoding="utf-8")

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        fail(f"Could not uniquely locate {label}: expected 1, found {count}.")
    return source.replace(old, new, 1)

form = replace_once(
    form,
    '''import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
''',
    '''import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
''',
    "React imports",
)

marker = '''type AdminCharacterEditFormProps = {
'''
insert = '''type AdminCharacterSaveState = {
  isSaving: boolean;
  error: string | null;
};

const AdminCharacterSaveContext =
  createContext<AdminCharacterSaveState>({
    isSaving: false,
    error: null,
  });

export function AdminCharacterSaveButton() {
  const {
    isSaving,
    error,
  } = useContext(
    AdminCharacterSaveContext,
  );

  return (
    <div className="mt-6">
      <button
        type="submit"
        data-admin-character-main-save="true"
        disabled={isSaving}
        className="w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] disabled:cursor-not-allowed disabled:opacity-60 admin_characters_id_page_button_save_character_record"
      >
        {isSaving
          ? "Saving..."
          : "Save character record"}
      </button>

      {error ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-3 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))]"
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}

'''
if form.count(marker) != 1:
    fail("Could not uniquely locate AdminCharacterEditFormProps.")
form = form.replace(marker, insert + marker, 1)

form = replace_once(
    form,
    '''  const [ageError, setAgeError] =
    useState<string | null>(null);
''',
    '''  const [ageError, setAgeError] =
    useState<string | null>(null);

  const [submitError, setSubmitError] =
    useState<string | null>(null);

  const [isSaving, setIsSaving] =
    useState(false);
''',
    "save state",
)

start = form.find(
    '''  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
'''
)
if start < 0:
    fail("Could not locate handleSubmit start.")

end = form.find(
    '''  return (
    <form
''',
    start,
)
if end < 0:
    fail("Could not locate handleSubmit end.")

new_handle = '''  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    const nativeEvent =
      event.nativeEvent as SubmitEvent;

    const submitter =
      nativeEvent.submitter;

    const isMainSave =
      submitter instanceof HTMLButtonElement &&
      submitter.dataset.adminCharacterMainSave ===
        "true";

    if (!isMainSave) {
      return;
    }

    event.preventDefault();

    if (isSaving) {
      return;
    }

    const form =
      event.currentTarget;

    setSubmitError(null);
    setAttributeError(null);
    setAgeError(null);
    setIsSaving(true);

    if (!allowMissingAge) {
      if (!validateAttributes(form)) {
        setIsSaving(false);
        return;
      }

      if (!validateAge()) {
        setIsSaving(false);
        return;
      }
    }

    const formData =
      new FormData(form);

    if (!allowMissingAge) {
      formData.set(
        "age",
        age,
      );

      const result =
        await saveAdminCharacterAge(
          formData,
        );

      if (!result.ok) {
        setAgeError(
          result.error,
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      await action(
        formData,
      );

      setIsSaving(false);
    } catch (error) {
      const digest =
        error &&
        typeof error === "object" &&
        "digest" in error
          ? String(
              (
                error as {
                  digest?: unknown;
                }
              ).digest ?? "",
            )
          : "";

      if (
        digest.startsWith(
          "NEXT_REDIRECT",
        )
      ) {
        throw error;
      }

      setSubmitError(
        error instanceof Error
          ? error.message
          : "The character record could not be saved.",
      );

      setIsSaving(false);
    }
  }

'''
form = form[:start] + new_handle + form[end:]

top_errors = '''      {attributeError ? (
        <div
          role="alert"
          className="mb-5 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))] components_admin_admin_character_edit_form_div_alert"
        >
          {attributeError}
        </div>
      ) : null}

      {ageError ? (
        <div
          role="alert"
          className="mb-5 border border-[rgb(var(--sep-colour-8c463d))] bg-[rgb(var(--sep-colour-2a1513))] p-4 text-sm leading-6 text-[rgb(var(--sep-colour-e4b4aa))] components_admin_admin_character_edit_form_div_alert_2"
        >
          {ageError}
        </div>
      ) : null}

'''
if form.count(top_errors) != 1:
    fail(f"Could not uniquely locate top error boxes: found {form.count(top_errors)}.")
form = form.replace(top_errors, "", 1)

form = replace_once(
    form,
    '''  return (
    <form
''',
    '''  const visibleError =
    submitError ??
    ageError ??
    attributeError;

  return (
    <AdminCharacterSaveContext.Provider
      value={{
        isSaving,
        error: visibleError,
      }}
    >
    <form
''',
    "provider start",
)

form = replace_once(
    form,
    '''    </form>
  );
}
''',
    '''    </form>
    </AdminCharacterSaveContext.Provider>
  );
}
''',
    "provider end",
)

page = replace_once(
    page,
    '''import { AdminCharacterEditForm } from "@/components/admin/admin-character-edit-form";
''',
    '''import {
  AdminCharacterEditForm,
  AdminCharacterSaveButton,
} from "@/components/admin/admin-character-edit-form";
''',
    "page import",
)

old_button = '''              <button
                type="submit"
                className="mt-6 w-full border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] admin_characters_id_page_button_save_character_record"
              >
                Save character record
              </button>
'''
page = replace_once(
    page,
    old_button,
    '''              <AdminCharacterSaveButton />
''',
    "save button",
)

FORM.write_text(form, encoding="utf-8")
PAGE.write_text(page, encoding="utf-8")

print("SUCCESS")
print(f"Updated: {FORM}")
print(f"Updated: {PAGE}")
print("Next: npm run build")

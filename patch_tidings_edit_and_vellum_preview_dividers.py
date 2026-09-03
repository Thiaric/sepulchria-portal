from pathlib import Path

ROOT = Path.cwd()

def die(msg):
    raise SystemExit(msg)

def read(path):
    p = ROOT / path
    if not p.exists():
        die(f"Missing file: {path}")
    return p.read_text(encoding="utf-8")

def write(path, text):
    (ROOT / path).write_text(text, encoding="utf-8", newline="\n")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        die(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)

changed = []

path = "app/(portal)/admin/tidings/actions.ts"
text = read(path)

anchor = """export async function toggleTidingAction(
  formData: FormData,
) {"""

edit_action = """export async function editTidingAction(
  formData: FormData,
) {
  await requireAdminSection("tidings");
  const supabase = await createClient();

  const id = String(
    formData.get("id") ?? "",
  ).trim();

  const title = String(
    formData.get("title") ?? "",
  ).trim();

  const message = String(
    formData.get("message") ?? "",
  ).trim();

  const priority = String(
    formData.get("priority") ?? "normal",
  );

  const duration = String(
    formData.get("duration") ?? "keep",
  );

  if (!id) {
    throw new Error("Missing Tidings entry.");
  }

  if (!title || title.length > 80) {
    throw new Error(
      "Tidings title must be between 1 and 80 characters.",
    );
  }

  if (!message || message.length > 300) {
    throw new Error(
      "Tidings message must be between 1 and 300 characters.",
    );
  }

  if (
    !ALLOWED_PRIORITIES.includes(
      priority as (typeof ALLOWED_PRIORITIES)[number],
    )
  ) {
    throw new Error("Invalid Tidings priority.");
  }

  const updates: {
    title: string;
    message: string;
    priority: string;
    priority_rank: number;
    updated_at: string;
    expires_at?: string | null;
  } = {
    title,
    message,
    priority,
    priority_rank:
      priority === "urgent"
        ? 2
        : priority === "important"
          ? 1
          : 0,
    updated_at: new Date().toISOString(),
  };

  if (duration !== "keep") {
    updates.expires_at =
      expiryFromDuration(duration);
  }

  const { error } = await supabase
    .from("tidings")
    .update(updates)
    .eq("id", id);

  if (error) {
    throw new Error(
      `Unable to edit Tidings: ${error.message}`,
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/admin/tidings");
}

"""

text = replace_once(
    text,
    anchor,
    edit_action + anchor,
    f"{path}: add edit action",
)
write(path, text)
changed.append(path)

path = "app/(portal)/admin/tidings/page.tsx"
text = read(path)

text = replace_once(
    text,
    """  createTidingAction,
  deleteTidingAction,
  toggleTidingAction,""",
    """  createTidingAction,
  deleteTidingAction,
  editTidingAction,
  toggleTidingAction,""",
    f"{path}: import edit action",
)

old_actions = """                      <div className="flex shrink-0 gap-2">
                        {!expired ? (
                          <AdminActionForm action={toggleTidingAction}>
                            <input type="hidden" name="id" value={entry.id} />
                            <input
                              type="hidden"
                              name="nextActive"
                              value={entry.is_active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="border border-[rgb(var(--sep-colour-685036))] bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bea27b))] transition hover:border-[rgb(var(--sep-colour-987344))]"
                            >
                              {entry.is_active ? "Hide" : "Show"}
                            </button>
                          </AdminActionForm>
                        ) : null}

                        <AdminActionForm action={deleteTidingAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <button
                            type="submit"
                            className="border border-[rgb(var(--sep-colour-6f4037))] bg-[rgb(var(--sep-colour-1c100e))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c98e83))] transition hover:border-[rgb(var(--sep-colour-9a594c))]"
                          >
                            Delete
                          </button>
                        </AdminActionForm>
                      </div>"""

new_actions = """                      <div className="flex shrink-0 flex-wrap gap-2">
                        <details className="group relative">
                          <summary className="cursor-pointer list-none border border-[rgb(var(--sep-colour-685036))] bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bea27b))] transition hover:border-[rgb(var(--sep-colour-987344))]">
                            Edit
                          </summary>

                          <div className="absolute right-0 z-50 mt-2 w-[min(88vw,430px)] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] p-4 shadow-2xl">
                            <AdminActionForm
                              action={editTidingAction}
                              className="grid gap-3"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={entry.id}
                              />

                              <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))]">
                                Title
                                <input
                                  name="title"
                                  required
                                  maxLength={80}
                                  defaultValue={entry.title}
                                  className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))]"
                                />
                              </label>

                              <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))]">
                                Priority
                                <select
                                  name="priority"
                                  defaultValue={entry.priority}
                                  className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))]"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="important">Important</option>
                                  <option value="urgent">Urgent</option>
                                </select>
                              </label>

                              <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))]">
                                Message
                                <textarea
                                  name="message"
                                  required
                                  maxLength={300}
                                  rows={4}
                                  defaultValue={entry.message}
                                  className="resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case leading-6 tracking-normal text-[rgb(var(--sep-colour-d8c4a4))]"
                                />
                              </label>

                              <label className="grid gap-1 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9f8765))]">
                                Expiry
                                <select
                                  name="duration"
                                  defaultValue="keep"
                                  className="border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2 text-sm normal-case tracking-normal text-[rgb(var(--sep-colour-d8c4a4))]"
                                >
                                  <option value="keep">Keep current expiry</option>
                                  <option value="1">1 hour from now</option>
                                  <option value="6">6 hours from now</option>
                                  <option value="12">12 hours from now</option>
                                  <option value="24">24 hours from now</option>
                                  <option value="72">3 days from now</option>
                                  <option value="168">7 days from now</option>
                                  <option value="720">30 days from now</option>
                                  <option value="never">Never</option>
                                </select>
                              </label>

                              <button
                                type="submit"
                                className="mt-1 border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-4 py-2 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-efd6a8))]"
                              >
                                Save changes
                              </button>
                            </AdminActionForm>
                          </div>
                        </details>

                        {!expired ? (
                          <AdminActionForm action={toggleTidingAction}>
                            <input type="hidden" name="id" value={entry.id} />
                            <input
                              type="hidden"
                              name="nextActive"
                              value={entry.is_active ? "false" : "true"}
                            />
                            <button
                              type="submit"
                              className="border border-[rgb(var(--sep-colour-685036))] bg-[rgb(var(--sep-colour-18110d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-bea27b))] transition hover:border-[rgb(var(--sep-colour-987344))]"
                            >
                              {entry.is_active ? "Hide" : "Show"}
                            </button>
                          </AdminActionForm>
                        ) : null}

                        <AdminActionForm action={deleteTidingAction}>
                          <input type="hidden" name="id" value={entry.id} />
                          <button
                            type="submit"
                            className="border border-[rgb(var(--sep-colour-6f4037))] bg-[rgb(var(--sep-colour-1c100e))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c98e83))] transition hover:border-[rgb(var(--sep-colour-9a594c))]"
                          >
                            Delete
                          </button>
                        </AdminActionForm>
                      </div>"""

text = replace_once(
    text,
    old_actions,
    new_actions,
    f"{path}: add edit UI",
)
write(path, text)
changed.append(path)

path = "components/portal/portal-skin-gallery.tsx"
text = read(path)

text = replace_once(
    text,
    """                    <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-4">""",
    """                    <div
                      data-portal-skin-preview-divider="true"
                      className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-4"
                    >""",
    f"{path}: mark preview divider",
)
write(path, text)
changed.append(path)

path = "components/sepulchria/sep-ui-unified.css"
text = read(path)

marker = "/* SEPULCHRIA APPEARANCE PREVIEW DIVIDER ISOLATION */"
if marker not in text:
    text += """

/* SEPULCHRIA APPEARANCE PREVIEW DIVIDER ISOLATION */
.portal-skin-preview-card[data-portal-skin]
  [data-portal-skin-preview-divider="true"] {
  border-top-color:
    rgb(var(--sep-skin-c1, var(--sep-colour-a98a60)) / 0.34) !important;
}

.portal-skin-preview-card[data-portal-skin] hr {
  border-color:
    rgb(var(--sep-skin-c1, var(--sep-colour-a98a60)) / 0.34) !important;
}
/* END SEPULCHRIA APPEARANCE PREVIEW DIVIDER ISOLATION */
"""
    write(path, text)
    changed.append(path)

print("Patch applied.")
for p in changed:
    print(" -", p)

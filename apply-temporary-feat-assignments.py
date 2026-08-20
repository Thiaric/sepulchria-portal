
from pathlib import Path
ROOT=Path.cwd()
def read(rel):
    p=ROOT/rel
    if not p.exists(): raise SystemExit(f"Missing expected file: {rel}")
    return p.read_text(encoding="utf-8")
def write(rel,t):
    (ROOT/rel).write_text(t,encoding="utf-8"); print("Updated",rel)
def rep(t,old,new,rel):
    if old not in t: raise SystemExit(f"Patch stopped: expected block not found in {rel}")
    return t.replace(old,new,1)

rel="app/(portal)/admin/gifts/actions.ts"; t=read(rel)
t=rep(t,'''    const giftId = requiredText(formData, "giftId", "Gift");
    const characterId = requiredText(formData, "characterId", "Character");

    if (!isUuid(giftId) || !isUuid(characterId)) {
      throw new Error("Invalid Gift or character.");
    }

    const {
      data: assignment,
      error,
    } = await supabase
''','''    const giftId = requiredText(formData, "giftId", "Gift");
    const characterId = requiredText(formData, "characterId", "Character");
    const assignmentMode = requiredText(formData, "assignmentMode", "Assignment duration");

    if (!isUuid(giftId) || !isUuid(characterId)) {
      throw new Error("Invalid Gift or character.");
    }

    if (!["permanent", "temporary"].includes(assignmentMode)) {
      throw new Error("Invalid Feat assignment duration.");
    }

    const assignmentDays =
      assignmentMode === "temporary"
        ? integer(formData, "assignmentDays", 0)
        : 0;

    if (assignmentMode === "temporary" && assignmentDays <= 0) {
      throw new Error("Temporary Feat assignments need at least 1 day.");
    }

    const expiresAt =
      assignmentMode === "temporary"
        ? new Date(Date.now() + assignmentDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const { error: expiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: characterId },
    );

    if (expiryError) {
      throw new Error(`Unable to clear expired Feat assignments: ${expiryError.message}`);
    }

    const {
      data: assignment,
      error,
    } = await supabase
''',rel)
t=rep(t,'''        acquisition_source: "staff",
        assigned_by: staff.userId,
      })
''','''        acquisition_source: "staff",
        assigned_by: staff.userId,
        expires_at: expiresAt,
      })
''',rel)
write(rel,t)

rel="app/(portal)/admin/gifts/page.tsx"; t=read(rel)
t=rep(t,'''    acquisition_source: "ancestry" | "order" | "staff";
  }[] | null;
''','''    acquisition_source: "ancestry" | "order" | "staff";
    expires_at: string | null;
  }[] | null;
''',rel)
t=rep(t,'''          assignments:character_gifts(
            id, character_id, acquisition_source
          )
''','''          assignments:character_gifts(
            id, character_id, acquisition_source, expires_at
          )
''',rel)
t=rep(t,'''                    </select>

                    <button
                      type="submit"
''','''                    </select>

                    <select
                      name="assignmentMode"
                      required
                      defaultValue="permanent"
                      className="min-w-[150px] border border-[#60482e]/55 bg-[#15100d] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none"
                    >
                      <option value="permanent">Permanent</option>
                      <option value="temporary">Temporary</option>
                    </select>

                    <input
                      type="number"
                      name="assignmentDays"
                      min={1}
                      step={1}
                      placeholder="Days"
                      aria-label="Temporary assignment duration in days"
                      className="w-[100px] border border-[#60482e]/55 bg-[#15100d] px-3 py-2.5 text-xs text-[#d7c4a5] outline-none"
                    />

                    <button
                      type="submit"
''',rel)
t=rep(t,'''                            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#6e6252]">
                              {assignment.acquisition_source}
                            </p>
''','''                            <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-[#6e6252]">
                              {assignment.acquisition_source}
                              {assignment.acquisition_source === "staff"
                                ? assignment.expires_at
                                  ? ` · Until ${new Date(assignment.expires_at).toLocaleDateString("en-GB")}`
                                  : " · Permanent"
                                : ""}
                            </p>
''',rel)
write(rel,t)

rel="lib/gifts/get-character-gift-modifiers.ts"; t=read(rel)
t=rep(t,'''  const supabase = await createClient();

  // Revert any temporary Vigour Health that has expired before
''','''  const supabase = await createClient();

  const { error: staffExpiryError } = await supabase.rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );

  if (staffExpiryError) {
    throw new Error(`Unable to reconcile expired staff Feats: ${staffExpiryError.message}`);
  }

  // Revert any temporary Vigour Health that has expired before
''',rel)
write(rel,t)

rel="components/characters/character-gifts-display.tsx"; t=read(rel)
t=rep(t,'''  acquisition_source: "ancestry" | "order" | "staff";
  gift: Gift | Gift[] | null;
''','''  acquisition_source: "ancestry" | "order" | "staff";
  expires_at: string | null;
  gift: Gift | Gift[] | null;
''',rel)
t=rep(t,'''  const supabase = await createClient();

  const { data, error } = await supabase
''','''  const supabase = await createClient();

  const { error: staffExpiryError } = await supabase.rpc(
    "reconcile_expired_staff_gifts",
    { p_character_id: characterId },
  );

  if (staffExpiryError) {
    throw new Error(`Unable to reconcile expired staff Feats: ${staffExpiryError.message}`);
  }

  const { data, error } = await supabase
''',rel)
t=rep(t,'''      id,
      acquisition_source,
      gift:gifts(
''','''      id,
      acquisition_source,
      expires_at,
      gift:gifts(
''',rel)
t=rep(t,'''                    {sourceLabel(
                      ownership.acquisition_source,
                    )}{" "}
                    · {state}
''','''                    {sourceLabel(
                      ownership.acquisition_source,
                    )}
                    {ownership.acquisition_source === "staff" && ownership.expires_at
                      ? ` · Granted until ${new Date(ownership.expires_at).toLocaleDateString("en-GB")}`
                      : ""}{" "}
                    · {state}
''',rel)
write(rel,t)

rel="app/(portal)/game/actions.ts"; t=read(rel)
t=rep(t,'''    const roomId =
      character.current_room_id;

    const { data: ownership, error: ownershipError } =
''','''    const roomId =
      character.current_room_id;

    const { error: staffExpiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: character.id },
    );

    if (staffExpiryError) {
      return { ok: false, message: `Unable to reconcile expired Feats: ${staffExpiryError.message}` };
    }

    const { data: ownership, error: ownershipError } =
''',rel)
t=rep(t,'''    if (!user) {
      return {
        ok: false,
        message: "Your session has expired.",
      };
    }

    const {
      data: ownership,
''','''    if (!user) {
      return {
        ok: false,
        message: "Your session has expired.",
      };
    }

    const { error: staffExpiryError } = await supabase.rpc(
      "reconcile_expired_staff_gifts",
      { p_character_id: character.id },
    );

    if (staffExpiryError) {
      return { ok: false, message: `Unable to reconcile expired Feats: ${staffExpiryError.message}` };
    }

    const {
      data: ownership,
''',rel)
write(rel,t)

print("Patch applied. Run npm run build.")

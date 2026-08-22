from pathlib import Path

ROOT = Path.cwd()

def patch(path, old, new):
    p = ROOT / path
    if not p.exists():
        raise SystemExit(f"Missing expected file: {path}")
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"Could not locate expected block in {path}.")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Patched {path}")

# Automatic native confirmation for destructive AdminActionForm submits.
patch("components/admin/admin-action-form.tsx", r'''          if (
  submitter instanceof HTMLButtonElement
) {
  const buttonConfirmMessage =
    submitter.dataset.confirmMessage;

  if (
    buttonConfirmMessage &&
    !window.confirm(
      buttonConfirmMessage,
    )
  ) {
    event.preventDefault();
    return;
  }
}''', r'''          if (
            submitter instanceof HTMLButtonElement
          ) {
            const buttonConfirmMessage =
              submitter.dataset.confirmMessage;

            const submitterText =
              (submitter.textContent ?? "")
                .trim()
                .toLowerCase();

            const isDestructive =
              submitterText.includes("delete") ||
              submitterText.includes("remove") ||
              submitterText.includes("destroy");

            const message =
              buttonConfirmMessage ??
              (isDestructive
                ? "Are you sure you want to continue? This action may permanently delete data and cannot necessarily be undone."
                : null);

            if (
              message &&
              !window.confirm(message)
            ) {
              event.preventDefault();
              return;
            }
          }''')

# Room deletion: protect Order Headquarters.
patch("app/(portal)/admin/rooms/actions.ts", r'''    outgoingConnectionsResult,
    incomingConnectionsResult,
  ] = await Promise.all([''', r'''    outgoingConnectionsResult,
    incomingConnectionsResult,
    headquartersResult,
  ] = await Promise.all([''')

patch("app/(portal)/admin/rooms/actions.ts", r'''    supabase
      .from("room_connections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("to_room_id", roomId),
  ]);''', r'''    supabase
      .from("room_connections")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("to_room_id", roomId),

    supabase
      .from("order_headquarters")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("room_id", roomId),
  ]);''')

patch("app/(portal)/admin/rooms/actions.ts", r'''    outgoingConnectionsResult.error ??
    incomingConnectionsResult.error;''', r'''    outgoingConnectionsResult.error ??
    incomingConnectionsResult.error ??
    headquartersResult.error;''')

patch("app/(portal)/admin/rooms/actions.ts", r'''  const connectionCount =
    (outgoingConnectionsResult.count ??
      0) +
    (incomingConnectionsResult.count ??
      0);

  if (characterCount > 0) {''', r'''  const connectionCount =
    (outgoingConnectionsResult.count ??
      0) +
    (incomingConnectionsResult.count ??
      0);

  const headquartersCount =
    headquartersResult.count ?? 0;

  if (headquartersCount > 0) {
    throw new Error(
      "This room cannot be deleted because it is currently assigned as an Order Headquarters. Remove or change the Headquarters first.",
    );
  }

  if (characterCount > 0) {''')

# Association deletion: protect Orders.
patch("app/(portal)/admin/associations/actions.ts", r'''    const { error: deleteError } =
      await supabase
        .from("associations")
        .delete()
        .eq("id", associationId);''', r'''    const {
      count: orderCount,
      error: orderError,
    } = await supabase
      .from("orders")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("association_id", associationId);

    if (orderError) {
      throw new Error(
        `Unable to verify linked Orders: ${orderError.message}`,
      );
    }

    if ((orderCount ?? 0) > 0) {
      throw new Error(
        `This association cannot be deleted because it still contains ${orderCount} ${
          orderCount === 1 ? "Order" : "Orders"
        }. Delete or move those Orders first.`,
      );
    }

    const { error: deleteError } =
      await supabase
        .from("associations")
        .delete()
        .eq("id", associationId);''')

# Ancestry deletion: preserve acquisition provenance.
patch("app/(portal)/admin/races/actions.ts", r'''    const { error: deleteError } =
      await supabase
        .from("races")
        .delete()
        .eq("id", raceId);''', r'''    const {
      count: acquiredFeatCount,
      error: acquiredFeatError,
    } = await supabase
      .from("character_gifts")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("acquisition_source", "ancestry")
      .eq("source_race_id", raceId);

    if (acquiredFeatError) {
      throw new Error(
        `Unable to verify Ancestry-acquired Feats: ${acquiredFeatError.message}`,
      );
    }

    if ((acquiredFeatCount ?? 0) > 0) {
      throw new Error(
        `This ancestry cannot be deleted because ${acquiredFeatCount} character ${
          acquiredFeatCount === 1 ? "Feat records it" : "Feats record it"
        } as the acquisition source. Remove or reassign those Feats first.`,
      );
    }

    const { error: deleteError } =
      await supabase
        .from("races")
        .delete()
        .eq("id", raceId);''')

# Order role deletion: preserve acquisition provenance.
patch("app/(portal)/admin/orders/structure-actions.ts", r'''  const { error } = await supabase.from("order_jobs").delete().eq("id", jobId);''', r'''  const {
    count: acquiredFeatCount,
    error: acquiredFeatError,
  } = await supabase
    .from("character_gifts")
    .select("id", { count: "exact", head: true })
    .eq("acquisition_source", "order")
    .eq("source_order_job_id", jobId);

  if (acquiredFeatError) {
    throw new Error(
      `Unable to verify Order-acquired Feats: ${acquiredFeatError.message}`,
    );
  }

  if ((acquiredFeatCount ?? 0) > 0) {
    throw new Error(
      `This role cannot be deleted because ${acquiredFeatCount} character ${
        acquiredFeatCount === 1 ? "Feat records it" : "Feats record it"
      } as the acquisition source. Remove or reassign those Feats first.`,
    );
  }

  const { error } = await supabase.from("order_jobs").delete().eq("id", jobId);''')

# Shape deletion: protect active/preserved effects.
patch("app/(portal)/admin/shapes/actions.ts", r'''export async function deleteShape(f:FormData){
  await requireStaff(); const db=await createClient(); const id=txt(f,"shape_id");
  const {error}=await db.from("shapes").delete().eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20deleted");
}''', r'''export async function deleteShape(f:FormData){
  await requireStaff(); const db=await createClient(); const id=txt(f,"shape_id");

  const {count:effectCount,error:effectError}=await db
    .from("character_shape_effects")
    .select("id",{count:"exact",head:true})
    .eq("shape_id",id);

  if(effectError){
    redirect(`/admin/shapes?error=${encodeURIComponent(`Unable to inspect Shape effects: ${effectError.message}`)}`);
  }

  if((effectCount??0)>0){
    redirect(`/admin/shapes?error=${encodeURIComponent(`This Shape cannot be deleted because ${effectCount} active or preserved character effect${effectCount===1?"":"s"} still refer to it. Remove those effects first.`)}`);
  }

  const {error}=await db.from("shapes").delete().eq("id",id);
  if(error) redirect(`/admin/shapes?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shapes"); redirect("/admin/shapes?success=Shape%20deleted");
}''')

# Order creation rollback if level pay fails.
patch("app/(portal)/admin/orders/actions.ts", r'''      if (payError) {
        throw new Error(
          `Order created, but Level ${level} pay could not be saved: ${payError.message}`,
        );
      }''', r'''      if (payError) {
        await supabase
          .from("order_headquarters")
          .delete()
          .eq("order_id", createdOrder.id);

        await supabase
          .from("rooms")
          .delete()
          .eq("id", headquartersRoom.id);

        await supabase
          .from("orders")
          .delete()
          .eq("id", createdOrder.id);

        throw new Error(
          `Order creation was rolled back because Level ${level} pay could not be saved: ${payError.message}`,
        );
      }''')

# Feat eligibility rollback.
patch("app/(portal)/admin/gifts/actions.ts", r'''  const [raceDelete, roleDelete] = await Promise.all([
    supabase.from("gift_races").delete().eq("gift_id", giftId),
    supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
  ]);

  const deleteError = raceDelete.error ?? roleDelete.error;
  if (deleteError) throw new Error(deleteError.message);

  if (raceIds.length) {''', r'''  const [oldRacesResult, oldRolesResult] = await Promise.all([
    supabase.from("gift_races").select("race_id").eq("gift_id", giftId),
    supabase.from("gift_order_jobs").select("order_job_id").eq("gift_id", giftId),
  ]);

  const snapshotError =
    oldRacesResult.error ?? oldRolesResult.error;

  if (snapshotError) {
    throw new Error(
      `Unable to preserve existing Feat eligibility: ${snapshotError.message}`,
    );
  }

  const oldRaceIds =
    (oldRacesResult.data ?? []).map((row) => row.race_id);
  const oldRoleIds =
    (oldRolesResult.data ?? []).map((row) => row.order_job_id);

  const restoreEligibility = async () => {
    await Promise.all([
      supabase.from("gift_races").delete().eq("gift_id", giftId),
      supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
    ]);

    if (oldRaceIds.length) {
      await supabase.from("gift_races").insert(
        oldRaceIds.map((raceId) => ({
          gift_id: giftId,
          race_id: raceId,
        })),
      );
    }

    if (oldRoleIds.length) {
      await supabase.from("gift_order_jobs").insert(
        oldRoleIds.map((roleId) => ({
          gift_id: giftId,
          order_job_id: roleId,
        })),
      );
    }
  };

  const [raceDelete, roleDelete] = await Promise.all([
    supabase.from("gift_races").delete().eq("gift_id", giftId),
    supabase.from("gift_order_jobs").delete().eq("gift_id", giftId),
  ]);

  const deleteError = raceDelete.error ?? roleDelete.error;
  if (deleteError) {
    await restoreEligibility();
    throw new Error(deleteError.message);
  }

  if (raceIds.length) {''')

patch("app/(portal)/admin/gifts/actions.ts", r'''    if (error) throw new Error(`Unable to save Ancestry eligibility: ${error.message}`);''', r'''    if (error) {
      await restoreEligibility();
      throw new Error(`Unable to save Ancestry eligibility: ${error.message}`);
    }''')

patch("app/(portal)/admin/gifts/actions.ts", r'''    if (error) throw new Error(`Unable to save Order Role eligibility: ${error.message}`);''', r'''    if (error) {
      await restoreEligibility();
      throw new Error(`Unable to save Order Role eligibility: ${error.message}`);
    }''')

# Feat assignment compensating rollback.
patch("app/(portal)/admin/gifts/actions.ts", r'''    await applyGiftOwnershipHealthEffects(
      assignment.id,
    );''', r'''    try {
      await applyGiftOwnershipHealthEffects(
        assignment.id,
      );
    } catch (healthError) {
      await supabase
        .from("character_gifts")
        .delete()
        .eq("id", assignment.id);

      throw healthError;
    }''')

# Feat removal: if delete fails, restore the health effects.
patch("app/(portal)/admin/gifts/actions.ts", r'''    const { error } = await supabase
      .from("character_gifts")
      .delete()
      .eq("id", assignmentId);

    if (error) throw new Error(error.message);''', r'''    const { error } = await supabase
      .from("character_gifts")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      try {
        await applyGiftOwnershipHealthEffects(
          assignmentId,
        );
      } catch {
        // Keep the original delete error. The ownership row still exists.
      }

      throw new Error(error.message);
    }''')

# Shape link rollback on sync failure (first sync loop = link).
patch("app/(portal)/admin/shapes/actions.ts", r'''  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error)throw new Error(sync.error.message);
  }

  revalidatePath("/admin/shapes");''', r'''  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error){
      await db.rpc("staff_unlink_shape_from_order_level",{
        p_shape_id:shapeId,
        p_order_level_id:txt(f,"order_level_id"),
      });

      for(const rollbackMember of members??[]){
        await db.rpc(
          "sync_character_order_shapes",
          {p_character_id:rollbackMember.character_id},
        );
      }

      throw new Error(
        `Shape link was rolled back because character synchronisation failed: ${sync.error.message}`,
      );
    }
  }

  revalidatePath("/admin/shapes");''')

# Remaining sync loop = unlink.
patch("app/(portal)/admin/shapes/actions.ts", r'''  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error)throw new Error(sync.error.message);
  }

  revalidatePath("/admin/shapes");''', r'''  for(const member of members??[]){
    const sync=await db.rpc(
      "sync_character_order_shapes",
      {p_character_id:member.character_id},
    );
    if(sync.error){
      await db.rpc("staff_link_shape_to_order_level",{
        p_shape_id:shapeId,
        p_order_level_id:txt(f,"order_level_id"),
      });

      for(const rollbackMember of members??[]){
        await db.rpc(
          "sync_character_order_shapes",
          {p_character_id:rollbackMember.character_id},
        );
      }

      throw new Error(
        `Shape unlink was rolled back because character synchronisation failed: ${sync.error.message}`,
      );
    }
  }

  revalidatePath("/admin/shapes");''')

print()
print("Patch complete.")
print("Run: npm run build")

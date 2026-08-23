"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireSupportIdentity } from "@/lib/support/current-support-user";
import { createAdminClient } from "@/lib/supabase/admin";

function read(value: FormDataEntryValue | null, max: number) {
  return typeof value === "string"
    ? value.trim().slice(0, max)
    : "";
}

function sanctionLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export async function createSanctionAppeal(formData: FormData) {
  const identity = await requireSupportIdentity();
  const sanctionId = read(formData.get("sanctionId"), 80);
  const body = read(formData.get("body"), 10000);

  if (!sanctionId) throw new Error("The sanction is missing.");
  if (!body) {
    throw new Error("Please explain why you are appealing this sanction.");
  }

  const admin = createAdminClient();

  const { data: sanction, error: sanctionError } = await admin
    .from("sanctions")
    .select("id,sanction_type,status,target_user_id,issued_at")
    .eq("id", sanctionId)
    .eq("target_user_id", identity.userId)
    .maybeSingle();

  if (sanctionError || !sanction) {
    throw new Error("This sanction is unavailable.");
  }

  if (sanction.status === "revoked") {
    throw new Error("Revoked sanctions cannot be appealed.");
  }

  const { data: existingEvents, error: existingError } = await admin
    .from("ticket_events")
    .select("ticket_id,details")
    .eq("event_type", "sanction_appeal_created")
    .contains("details", { sanction_id: sanction.id })
    .order("created_at", { ascending: false })
    .limit(1);

  if (existingError) throw new Error(existingError.message);

  const existingTicketId = existingEvents?.[0]?.ticket_id ?? null;

  if (existingTicketId) {
    const { data: existingTicket } = await admin
      .from("tickets")
      .select("public_reference")
      .eq("id", existingTicketId)
      .maybeSingle();

    if (existingTicket?.public_reference) {
      redirect(`/support/${existingTicket.public_reference}`);
    }
  }

  const { data: ticket, error: ticketError } = await admin
    .from("tickets")
    .insert({
      category: "support",
      status: "open",
      priority: "normal",
      subject: `Appeal · ${sanctionLabel(sanction.sanction_type)}`,
      opened_by_user_id: identity.userId,
      opened_by_character_id: identity.characterId,
    })
    .select("id,public_reference")
    .single();

  if (ticketError || !ticket) {
    throw new Error(
      `Unable to create appeal ticket: ${ticketError?.message ?? "unknown error"}`,
    );
  }

  const { error: messageError } = await admin
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      author_user_id: identity.userId,
      author_character_id: identity.characterId,
      visibility: "player",
      body,
    });

  if (messageError) {
    throw new Error(
      `Appeal ticket created but the appeal statement could not be saved: ${messageError.message}`,
    );
  }

  const { error: createdEventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "ticket_created",
      details: {
        category: "support",
        source: "sanction_appeal",
        sanction_id: sanction.id,
      },
    });

  if (createdEventError) {
    throw new Error(
      `Appeal ticket created but its notification event could not be recorded: ${createdEventError.message}`,
    );
  }

  const { error: eventError } = await admin
    .from("ticket_events")
    .insert({
      ticket_id: ticket.id,
      actor_user_id: identity.userId,
      actor_character_id: identity.characterId,
      event_type: "sanction_appeal_created",
      details: {
        source: "sanction_appeal",
        sanction_id: sanction.id,
        sanction_type: sanction.sanction_type,
        sanction_status: sanction.status,
      },
    });

  if (eventError) {
    throw new Error(
      `Appeal ticket created but the sanction link could not be recorded: ${eventError.message}`,
    );
  }

  revalidatePath("/sanctions");
  revalidatePath("/support");

  redirect(`/support/${ticket.public_reference}`);
}

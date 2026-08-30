"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireAdminSection,
} from "@/lib/auth/require-staff";
import {
  aurethDateToUtcDate,
  toIsoDateKey,
} from "@/lib/world/calendar";
import { createClient } from "@/lib/supabase/server";

function readRequiredUuid(
  value: FormDataEntryValue | null,
  fieldName: string,
) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value.trim(),
    )
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return value.trim();
}

function readOptionalUuid(
  value: FormDataEntryValue | null,
  fieldName: string,
) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  const trimmed = value.trim();

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      trimmed,
    )
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return trimmed;
}

function readRequiredText(
  value: FormDataEntryValue | null,
  fieldName: string,
  maxLength: number,
) {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const next = value.trim();

  if (!next) {
    throw new Error(`${fieldName} is required.`);
  }

  return next.slice(0, maxLength);
}

function readOptionalText(
  value: FormDataEntryValue | null,
  maxLength: number,
) {
  if (typeof value !== "string") {
    return null;
  }

  const next = value.trim();

  return next
    ? next.slice(0, maxLength)
    : null;
}

function readInteger(
  value: FormDataEntryValue | null,
  fieldName: string,
) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new Error(`${fieldName} is required.`);
  }

  const parsed = Number.parseInt(
    value.trim(),
    10,
  );

  if (!Number.isInteger(parsed)) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return parsed;
}

function readCheckbox(
  value: FormDataEntryValue | null,
) {
  return (
    value === "on" ||
    value === "true"
  );
}

function readTime(
  value: FormDataEntryValue | null,
  fieldName: string,
) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  const next = value.trim();

  if (
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(
      next,
    )
  ) {
    throw new Error(`${fieldName} is invalid.`);
  }

  return next;
}

function readEventDate(
  formData: FormData,
) {
  const year = readInteger(
    formData.get("aurethYear"),
    "Year",
  );

  const monthIndex = readInteger(
    formData.get("monthIndex"),
    "Month",
  );

  const day = readInteger(
    formData.get("day"),
    "Day",
  );

  if (
    year < 1 ||
    year > 9999
  ) {
    throw new Error(
      "Year must be between 1 and 9999 ADN.",
    );
  }

  const date =
    aurethDateToUtcDate(
      year,
      monthIndex,
      day,
    );

  return toIsoDateKey(date);
}

function refreshEventPages() {
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath("/", "layout");
}

export async function createCalendarEvent(
  formData: FormData,
) {
  const staff = await requireAdminSection("events");

  const title = readRequiredText(
    formData.get("title"),
    "Event title",
    160,
  );

  const description =
    readOptionalText(
      formData.get("description"),
      20_000,
    );

  const eventDate =
    readEventDate(formData);

  const startTime = readTime(
    formData.get("startTime"),
    "Start time",
  );

  const endTime = readTime(
    formData.get("endTime"),
    "End time",
  );

  if (
    startTime &&
    endTime &&
    endTime < startTime
  ) {
    throw new Error(
      "End time cannot be before start time.",
    );
  }

  const roomId =
    readOptionalUuid(
      formData.get("roomId"),
      "Location",
    );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(
    formData.get("notifyOnPublish"),
  );
  const notify24h = readCheckbox(
    formData.get("notify24h"),
  );
  const notify1h = readCheckbox(
    formData.get("notify1h"),
  );

  if ((notify24h || notify1h) && !startTime) {
    throw new Error(
      "24-hour and 1-hour notifications require an Event start time.",
    );
  }

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .insert({
      title,
      description,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      room_id: roomId,
      location_name: null,
      is_active: isActive,
      notify_on_publish: notifyOnPublish,
      notify_24h: notify24h,
      notify_1h: notify1h,
      created_by: staff.userId,
    });

  if (error) {
    throw new Error(
      `Unable to create event: ${error.message}`,
    );
  }

  refreshEventPages();
}

export async function updateCalendarEvent(
  formData: FormData,
) {
  await requireAdminSection("events");

  const eventId =
    readRequiredUuid(
      formData.get("eventId"),
      "Event",
    );

  const title = readRequiredText(
    formData.get("title"),
    "Event title",
    160,
  );

  const description =
    readOptionalText(
      formData.get("description"),
      20_000,
    );

  const eventDate =
    readEventDate(formData);

  const startTime = readTime(
    formData.get("startTime"),
    "Start time",
  );

  const endTime = readTime(
    formData.get("endTime"),
    "End time",
  );

  if (
    startTime &&
    endTime &&
    endTime < startTime
  ) {
    throw new Error(
      "End time cannot be before start time.",
    );
  }

  const roomId =
    readOptionalUuid(
      formData.get("roomId"),
      "Location",
    );

  const isActive = readCheckbox(
    formData.get("isActive"),
  );

  const notifyOnPublish = readCheckbox(
    formData.get("notifyOnPublish"),
  );
  const notify24h = readCheckbox(
    formData.get("notify24h"),
  );
  const notify1h = readCheckbox(
    formData.get("notify1h"),
  );

  if ((notify24h || notify1h) && !startTime) {
    throw new Error(
      "24-hour and 1-hour notifications require an Event start time.",
    );
  }

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .update({
      title,
      description,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      room_id: roomId,
      location_name: null,
      is_active: isActive,
      notify_on_publish: notifyOnPublish,
      notify_24h: notify24h,
      notify_1h: notify1h,
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(
      `Unable to update event: ${error.message}`,
    );
  }

  refreshEventPages();
}

export async function deleteCalendarEvent(
  formData: FormData,
) {
  await requireAdminSection("events");

  const eventId =
    readRequiredUuid(
      formData.get("eventId"),
      "Event",
    );

  const confirmation =
    typeof formData.get(
      "confirmation",
    ) === "string"
      ? String(
          formData.get(
            "confirmation",
          ),
        )
          .trim()
          .toUpperCase()
      : "";

  if (confirmation !== "DELETE") {
    throw new Error(
      'Type "DELETE" to confirm event deletion.',
    );
  }

  const supabase =
    await createClient();

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    throw new Error(
      `Unable to delete event: ${error.message}`,
    );
  }

  refreshEventPages();
}

"use server";

import { revalidatePath } from "next/cache";

import { requireStaff } from "@/lib/auth/require-staff";
import { createAdminClient } from "@/lib/supabase/admin";

const REVIEW_TYPES = [
  "annual",
  "serious_incident",
  "significant_change",
  "regulatory_change",
  "other",
] as const;

type ReviewType =
  (typeof REVIEW_TYPES)[number];

function isReviewType(
  value: string,
): value is ReviewType {
  return REVIEW_TYPES.includes(
    value as ReviewType,
  );
}

export async function recordOnlineSafetyReview(
  formData: FormData,
) {
  const staff =
    await requireStaff();

  const reviewDate = String(
    formData.get("reviewDate") ?? "",
  ).trim();

  const reviewType = String(
    formData.get("reviewType") ?? "",
  ).trim();

  const notes = String(
    formData.get("notes") ?? "",
  ).trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      reviewDate,
    )
  ) {
    throw new Error(
      "A valid review date is required.",
    );
  }

  if (
    !isReviewType(reviewType)
  ) {
    throw new Error(
      "Invalid online-safety review type.",
    );
  }

  if (!notes) {
    throw new Error(
      "Please record a short review note.",
    );
  }

  if (notes.length > 2000) {
    throw new Error(
      "Review notes must be 2000 characters or fewer.",
    );
  }

  const admin =
    createAdminClient();

  const {
    data: character,
  } = await admin
    .from("characters")
    .select(
      "display_name, first_name, surname",
    )
    .eq(
      "user_id",
      staff.userId,
    )
    .maybeSingle();

  const label =
    character?.display_name?.trim() ||
    [
      character?.first_name,
      character?.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    staff.email ||
    "Staff";

  const { error } =
    await admin
      .from(
        "online_safety_reviews",
      )
      .insert({
        review_date:
          reviewDate,
        review_type:
          reviewType,
        notes,
        completed_by_user_id:
          staff.userId,
        completed_by_label:
          label,
      });

  if (error) {
    throw new Error(
      error.message,
    );
  }

  revalidatePath(
    "/admin/safety",
  );
}

"use client";

import {
  setCharacterFeatureEntitlement,
  setCharacterPortalSkinEntitlement,
} from "@/app/(portal)/admin/characters/actions";
import {
  AdminSaveFeedbackMessage,
  useAdminEntitlementSubmit,
} from "@/components/admin/admin-entitlement-submit";

export type CharacterFeatureEntitlementRow = {
  feature_key:
    | "private_chat"
    | "friend_list";
  enabled: boolean;
  source:
    | "paid"
    | "expertise"
    | "staff";
  note: string | null;
  granted_at: string;
  updated_at: string;
};

export type CharacterPortalSkinRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  is_default: boolean;
};

export type CharacterPortalSkinEntitlementRow = {
  skin_id: string;
  enabled: boolean;
  source:
    | "paid"
    | "staff";
  note: string | null;
};

const FEATURES = [
  {
    key: "private_chat",
    name: "Private Chats",
    description:
      "Allows this character to use staff-created invitation-only Private Chats.",
  },
  {
    key: "friend_list",
    name: "Friend List",
    description:
      "Allows this character to use friend requests and character relationships.",
  },
] as const;

export function AdminCharacterFeatureAccess({
  characterId,
  entitlements,
  portalSkins,
  portalSkinEntitlements,
}: {
  characterId: string;
  entitlements:
    CharacterFeatureEntitlementRow[];
  portalSkins:
    CharacterPortalSkinRow[];
  portalSkinEntitlements:
    CharacterPortalSkinEntitlementRow[];
}) {
  const byFeature = new Map(
    entitlements.map(
      (entry) => [
        entry.feature_key,
        entry,
      ],
    ),
  );

  const bySkin = new Map(
    portalSkinEntitlements.map(
      (entry) => [
        entry.skin_id,
        entry,
      ],
    ),
  );

  const premiumSkins =
    portalSkins.filter(
      (skin) =>
        !skin.is_default,
    );

  const initialEnabled =
    Object.fromEntries([
      ...FEATURES.map((feature) => [
        `feature:${feature.key}`,
        byFeature.get(feature.key)?.enabled === true,
      ]),
      ...premiumSkins.map((skin) => [
        `skin:${skin.id}`,
        bySkin.get(skin.id)?.enabled === true,
      ]),
    ]);

  const {
    enabledByKey,
    pendingKey,
    feedbackByKey,
    submit,
  } = useAdminEntitlementSubmit(
    initialEnabled,
  );

  return (
    <section className="mt-6 overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_admin_admin_character_feature_access_section_section">
      <div className="border-b border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 components_admin_admin_character_feature_access_div_premium_reward_features">
        <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] components_admin_admin_character_feature_access_p_premium_reward_features">
          Feature access
        </p>

        <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-e1c89f))] components_admin_admin_character_feature_access_h2_premium_reward_features">
          Premium & reward features
        </h2>

        <p className="mt-2 max-w-3xl text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_feature_access_p_premium_reward_features_2">
          Staff controls optional character and account features.
          Paid records a real-money purchase already confirmed by staff.
        </p>
      </div>

      <div className="grid gap-px bg-[rgb(var(--sep-colour-4f3b28))]/35 lg:grid-cols-2 components_admin_admin_character_feature_access_div_container">
        {FEATURES.map((feature) => {
          const entitlement =
            byFeature.get(
              feature.key,
            );
          const formKey =
            `feature:${feature.key}`;

          const enabled =
            enabledByKey[formKey] ??
            (entitlement?.enabled === true);

          return (
            <form
              key={feature.key}
              id={`premium-feature-${feature.key}`}
              data-admin-premium-feature="true"
              data-admin-feature-name={feature.name}
              data-admin-feature-type="Feature"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(
                  formKey,
                  new FormData(event.currentTarget),
                  setCharacterFeatureEntitlement,
                  "Access saved.",
                );
              }}
              className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5 components_admin_admin_character_feature_access_form_form"
            >
              <input className="components_admin_admin_character_feature_access_input_character_id"
                type="hidden"
                name="characterId"
                value={characterId}
              />
              <input className="components_admin_admin_character_feature_access_input_field"
                type="hidden"
                name="featureKey"
                value={feature.key}
              />

              <div className="flex items-start justify-between gap-4 components_admin_admin_character_feature_access_div_container_2">
                <div className="components_admin_admin_character_feature_access_div_container_3">
                  <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] components_admin_admin_character_feature_access_h3_heading">
                    {feature.name}
                  </h3>
                  <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_feature_access_p_text">
                    {
                      feature.description
                    }
                  </p>
                </div>

                <span
                  className={[((enabled
                      ? "shrink-0 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a8cf92))]"
                      : "shrink-0 border border-[rgb(var(--sep-colour-65483e))] bg-[rgb(var(--sep-colour-221512))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b78378))]")), "components_admin_admin_character_feature_access_span_text"].filter(Boolean).join(" ")}
                >
                  {enabled
                    ? "Enabled"
                    : "Disabled"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 components_admin_admin_character_feature_access_div_container_4">
                <label className="components_admin_admin_character_feature_access_label_label">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_2">
                    Access
                  </span>

                  <select
                    name="enabled"
                    defaultValue={
                      enabled
                        ? "true"
                        : "false"
                    }
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_select_enabled"
                  >
                    <option className="components_admin_admin_character_feature_access_option_enabled" value="false">
                      Disabled
                    </option>
                    <option className="components_admin_admin_character_feature_access_option_enabled_2" value="true">
                      Enabled
                    </option>
                  </select>
                </label>

                <label className="components_admin_admin_character_feature_access_label_label_2">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_3">
                    Unlock source
                  </span>

                  <select
                    name="source"
                    defaultValue={
                      entitlement?.source ??
                      "staff"
                    }
                    className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_select_source"
                  >
                    <option className="components_admin_admin_character_feature_access_option_paid" value="paid">
                      Real-money purchase
                    </option>
                    <option className="components_admin_admin_character_feature_access_option_expertise" value="expertise">
                      Expertise reward
                    </option>
                    <option className="components_admin_admin_character_feature_access_option_staff" value="staff">
                      Staff grant
                    </option>
                  </select>
                </label>

                <label className="components_admin_admin_character_feature_access_label_label_3">
                  <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_4">
                    Staff note
                  </span>

                  <textarea
                    name="note"
                    rows={3}
                    maxLength={1000}
                    defaultValue={
                      entitlement?.note ??
                      ""
                    }
                    placeholder="Optional: payment reference, reward reason, event prize..."
                    className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_textarea_note"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-[rgb(var(--sep-colour-5d452d))]/35 pt-4 components_admin_admin_character_feature_access_div_container_5">
                <AdminSaveFeedbackMessage
                  feedback={feedbackByKey[formKey]}
                />

                <button
                  type="submit"
                  disabled={pendingKey === formKey}
                  className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] disabled:cursor-wait disabled:opacity-60 components_admin_admin_character_feature_access_button_action"
                >
                  {pendingKey === formKey
                    ? "Saving..."
                    : "Save access"}
                </button>
              </div>
            </form>
          );
        })}

        {premiumSkins.map(
          (skin) => {
            const entitlement =
              bySkin.get(
                skin.id,
              );
            const formKey =
              `skin:${skin.id}`;

            const enabled =
              enabledByKey[formKey] ??
              (entitlement?.enabled === true);

            return (
              <form
                key={
                  `skin-${skin.id}`
                }
                id={`premium-feature-skin-${skin.id}`}
                data-admin-premium-feature="true"
                data-admin-feature-name={skin.name}
                data-admin-feature-type="Portal Skin"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(
                    formKey,
                    new FormData(event.currentTarget),
                    setCharacterPortalSkinEntitlement,
                    "Access saved.",
                  );
                }}
                className="scroll-mt-6 bg-[rgb(var(--sep-colour-17110d))] p-5 components_admin_admin_character_feature_access_form_form_2"
              >
                <input className="components_admin_admin_character_feature_access_input_character_id_2"
                  type="hidden"
                  name="characterId"
                  value={characterId}
                />
                <input className="components_admin_admin_character_feature_access_input_skin_id"
                  type="hidden"
                  name="skinId"
                  value={skin.id}
                />

                <div className="flex items-start justify-between gap-4 components_admin_admin_character_feature_access_div_container_6">
                  <div className="components_admin_admin_character_feature_access_div_container_7">
                    <p className="mb-1 text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_p_text_2">
                      Portal skin
                    </p>

                    <h3 className="font-serif text-lg text-[rgb(var(--sep-colour-dfc79c))] components_admin_admin_character_feature_access_h3_heading_2">
                      {skin.name}
                    </h3>

                    <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))] components_admin_admin_character_feature_access_p_text_3">
                      {skin.description ||
                        "Unlocks this premium portal appearance for the account that owns this character."}
                    </p>
                  </div>

                  <span
                    className={[((enabled
                        ? "shrink-0 border border-[rgb(var(--sep-colour-668657))] bg-[rgb(var(--sep-colour-172313))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-a8cf92))]"
                        : "shrink-0 border border-[rgb(var(--sep-colour-65483e))] bg-[rgb(var(--sep-colour-221512))] px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-b78378))]")), "components_admin_admin_character_feature_access_span_text_5"].filter(Boolean).join(" ")}
                  >
                    {enabled
                      ? "Enabled"
                      : "Disabled"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 components_admin_admin_character_feature_access_div_container_8">
                  <label className="components_admin_admin_character_feature_access_label_label_4">
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_6">
                      Access
                    </span>

                    <select
                      name="enabled"
                      defaultValue={
                        enabled
                          ? "true"
                          : "false"
                      }
                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_select_enabled_2"
                    >
                      <option className="components_admin_admin_character_feature_access_option_enabled_3" value="false">
                        Disabled
                      </option>
                      <option className="components_admin_admin_character_feature_access_option_enabled_4" value="true">
                        Enabled
                      </option>
                    </select>
                  </label>

                  <label className="components_admin_admin_character_feature_access_label_label_5">
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_7">
                      Unlock source
                    </span>

                    <select
                      name="source"
                      defaultValue={
                        entitlement?.source ??
                        "staff"
                      }
                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_select_source_2"
                    >
                      <option className="components_admin_admin_character_feature_access_option_paid_2" value="paid">
                        Real-money purchase
                      </option>
                      <option className="components_admin_admin_character_feature_access_option_staff_2" value="staff">
                        Staff grant
                      </option>
                    </select>
                  </label>

                  <label className="components_admin_admin_character_feature_access_label_label_6">
                    <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))] components_admin_admin_character_feature_access_span_text_8">
                      Staff note
                    </span>

                    <textarea
                      name="note"
                      rows={3}
                      maxLength={1000}
                      defaultValue={
                        entitlement?.note ??
                        ""
                      }
                      placeholder="Optional: payment reference or staff grant reason..."
                      className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-d7c4a5))] components_admin_admin_character_feature_access_textarea_note_2"
                    />
                  </label>
                </div>

                <div className="mt-5 flex items-center justify-end gap-3 border-t border-[rgb(var(--sep-colour-5d452d))]/35 pt-4 components_admin_admin_character_feature_access_div_container_9">
                  <AdminSaveFeedbackMessage
                    feedback={feedbackByKey[formKey]}
                  />

                  <button
                    type="submit"
                    disabled={pendingKey === formKey}
                    className="border border-[rgb(var(--sep-colour-8d6d3e))] bg-[rgb(var(--sep-colour-332719))] px-4 py-2 text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd9aa))] disabled:cursor-wait disabled:opacity-60 components_admin_admin_character_feature_access_button_action_2"
                  >
                    {pendingKey === formKey
                      ? "Saving..."
                      : "Save access"}
                  </button>
                </div>
              </form>
            );
          },
        )}
      </div>
    </section>
  );
}

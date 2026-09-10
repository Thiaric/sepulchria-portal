"use client";

import { useActionState, useState } from "react";

import {
  submitOrderIdeaAction,
  type SubmitOrderIdeaState,
} from "@/app/(portal)/orders/submit/actions";
import { RichTextEditor } from "@/components/editor/rich-text-editor";

type RoleDraft = {
  id: string;
  name: string;
  description: string;
};

type LevelDraft = {
  level: number;
  roles: RoleDraft[];
};

const initialState: SubmitOrderIdeaState = {
  success: false,
  message: "",
};

function newRole(): RoleDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: "",
  };
}

function initialLevels(): LevelDraft[] {
  return Array.from({ length: 6 }, (_, index) => ({
    level: index + 1,
    roles: [newRole()],
  }));
}

export function OrderSubmissionForm() {
  const [state, formAction, pending] = useActionState(
    submitOrderIdeaAction,
    initialState,
  );

  const [description, setDescription] = useState("");
  const [levels, setLevels] = useState<LevelDraft[]>(() => initialLevels());

  function addRole(levelNumber: number) {
    setLevels((current) =>
      current.map((level) =>
        level.level === levelNumber
          ? { ...level, roles: [...level.roles, newRole()] }
          : level,
      ),
    );
  }

  function removeRole(levelNumber: number, roleId: string) {
    setLevels((current) =>
      current.map((level) =>
        level.level === levelNumber && level.roles.length > 1
          ? {
              ...level,
              roles: level.roles.filter((role) => role.id !== roleId),
            }
          : level,
      ),
    );
  }

  function updateRole(
    levelNumber: number,
    roleId: string,
    field: "name" | "description",
    value: string,
  ) {
    setLevels((current) =>
      current.map((level) =>
        level.level === levelNumber
          ? {
              ...level,
              roles: level.roles.map((role) =>
                role.id === roleId ? { ...role, [field]: value } : role,
              ),
            }
          : level,
      ),
    );
  }

  const levelsJson = JSON.stringify(
    levels.map((level) => ({
      level: level.level,
      roles: level.roles.map(({ name, description }) => ({
        name,
        description,
      })),
    })),
  );

  return (
    <form action={formAction} className="mt-5 space-y-5 components_orders_order_submission_form_form_form_action">
      <input className="components_orders_order_submission_form_input_levels_json" type="hidden" name="levelsJson" value={levelsJson} />

      {state.success ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-submission-success-title"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm components_orders_order_submission_form_div_dialog"
        >
          <div className="w-full max-w-lg border border-[rgb(var(--sep-colour-8a673f))] bg-[rgb(var(--sep-colour-15100d))] p-6 text-center shadow-2xl sm:p-8 components_orders_order_submission_form_div_order_idea_submitted">
            <p className="text-[9px] uppercase tracking-[0.24em] text-[rgb(var(--sep-colour-8c704b))] components_orders_order_submission_form_p_order_idea_submitted">
              Submission Received
            </p>

            <h2
              id="order-submission-success-title"
              className="mt-3 font-serif text-2xl text-[rgb(var(--sep-colour-e1c89f))] components_orders_order_submission_form_h2_order_submission_success_title"
            >
              Order Idea Submitted
            </h2>

            <p className="mt-4 text-sm leading-7 text-[rgb(var(--sep-colour-b7a58c))] components_orders_order_submission_form_p_order_idea_submitted_2">
              Please wait for Staff to Review and we will let you know as soon as possible.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.replace("/orders");
              }}
              className="mt-6 min-w-28 border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] components_orders_order_submission_form_button_ok"
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {!state.success ? (
        <>
      <section className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6 components_orders_order_submission_form_section_order_name">
        <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_orders_order_submission_form_label_order_name">
          Order Name
        </label>
        <input
          name="orderName"
          required
          maxLength={120}
          disabled={pending}
          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))] components_orders_order_submission_form_input_order_name"
        />

        <div className="mt-5 components_orders_order_submission_form_div_description">
          <label className="block text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_orders_order_submission_form_label_description">
            Description
          </label>
          <RichTextEditor
            name="description"
            value={description}
            onChange={setDescription}
            maxTextLength={50000}
            minHeight={220}
            placeholder="Describe the Order, its purpose, culture, duties and place in Sepulchria..."
            disabled={pending}
            variant="lore"
          />
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2 components_orders_order_submission_form_div_order_name">
          <label className="block components_orders_order_submission_form_label_order_name_2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_orders_order_submission_form_span_order_name">
              Banner Description
            </span>
            <textarea
              name="bannerDescription"
              required
              maxLength={5000}
              rows={7}
              disabled={pending}
              placeholder="Describe the banner you imagine for this Order..."
              className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d8c4a4))] outline-none components_orders_order_submission_form_textarea_banner_description"
            />
          </label>

          <label className="block components_orders_order_submission_form_label_order_name_3">
            <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))] components_orders_order_submission_form_span_order_name_2">
              Icon Description
            </span>
            <textarea
              name="iconDescription"
              required
              maxLength={5000}
              rows={7}
              disabled={pending}
              placeholder="Describe the symbol or icon you imagine for this Order..."
              className="mt-2 w-full resize-y border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-4 py-3 text-sm leading-6 text-[rgb(var(--sep-colour-d8c4a4))] outline-none components_orders_order_submission_form_textarea_icon_description"
            />
          </label>
        </div>
      </section>

      {levels.map((level) => (
        <section
          key={level.level}
          className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] components_orders_order_submission_form_section_section"
        >
          <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/35 px-5 py-4 components_orders_order_submission_form_div_container">
            <div className="components_orders_order_submission_form_div_level_roles">
              <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-806a4d))] components_orders_order_submission_form_p_level_roles">
                Order hierarchy
              </p>
              <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-dec69d))] components_orders_order_submission_form_h2_level_roles">
                Level {level.level} Roles
              </h2>
            </div>

            <button
              type="button"
              disabled={pending}
              onClick={() => addRole(level.level)}
              className="border border-[rgb(var(--sep-colour-80613b))] bg-[rgb(var(--sep-colour-241a12))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-efd4a0))] components_orders_order_submission_form_button_add_role"
            >
              + Add Role
            </button>
          </div>

          <div className="space-y-4 p-5 components_orders_order_submission_form_div_container_2">
            {level.roles.map((role, index) => (
              <div
                key={role.id}
                className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 components_orders_order_submission_form_div_container_3"
              >
                <div className="flex items-center justify-between gap-3 components_orders_order_submission_form_div_container_4">
                  <p className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_orders_order_submission_form_p_text">
                    Role {index + 1}
                  </p>

                  {level.roles.length > 1 ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeRole(level.level, role.id)}
                      className="text-[8px] uppercase tracking-[0.13em] text-red-300/80 hover:text-red-200 components_orders_order_submission_form_button_remove"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>

                <input
                  required
                  maxLength={120}
                  value={role.name}
                  onChange={(event) =>
                    updateRole(level.level, role.id, "name", event.target.value)
                  }
                  placeholder="Role name"
                  className="mt-3 w-full border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm text-[rgb(var(--sep-colour-d8c4a4))] outline-none components_orders_order_submission_form_input_role_name"
                />

                <textarea
                  required
                  maxLength={5000}
                  rows={4}
                  value={role.description}
                  onChange={(event) =>
                    updateRole(
                      level.level,
                      role.id,
                      "description",
                      event.target.value,
                    )
                  }
                  placeholder="Describe this role, its responsibilities and place within the Order."
                  className="mt-3 w-full resize-y border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-sm leading-6 text-[rgb(var(--sep-colour-d8c4a4))] outline-none components_orders_order_submission_form_textarea_describe_role_responsibilities_place_within"
                />
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className="flex justify-end components_orders_order_submission_form_div_container_5">
        <button
          type="submit"
          disabled={pending}
          className="border border-[rgb(var(--sep-colour-987344))] bg-[rgb(var(--sep-colour-3b2919))] px-6 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-efd6a8))] transition hover:border-[rgb(var(--sep-colour-b98c50))] hover:bg-[rgb(var(--sep-colour-50371f))] disabled:opacity-60 components_orders_order_submission_form_button_action"
        >
          {pending ? "Submitting..." : "Submit Order Idea"}
        </button>
      </div>
        </>
      ) : null}
    </form>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import {
  addCharacterCondition,
  loadEditableCharacterConditions,
  removeCharacterCondition,
  type ConditionEditorScope,
} from "@/app/(portal)/character/condition-actions";
import {
  createClient,
} from "@/lib/supabase/client";
import type {
  CharacterCondition,
  PresentRoomCharacter,
} from "@/types/game";

type Props = {
  scope: ConditionEditorScope;
  characterId: string;
  characterName: string;
  selectableCharacters?:
    PresentRoomCharacter[];
};

export function CharacterConditionsEditor({
  scope,
  characterId,
  characterName,
  selectableCharacters = [],
}: Props) {
  const [
    targetCharacterId,
    setTargetCharacterId,
  ] = useState(
    characterId,
  );

  const [
    conditions,
    setConditions,
  ] = useState<
    CharacterCondition[]
  >([]);

  const [
    input,
    setInput,
  ] = useState("");

  const [
    status,
    setStatus,
  ] = useState("");

  const [
    statusOk,
    setStatusOk,
  ] = useState(true);

  const [
    pending,
    startTransition,
  ] = useTransition();

  const supabase =
    useMemo(
      () => createClient(),
      [],
    );

  const targets =
    useMemo(
      () => {
        if (
          scope !==
          "location"
        ) {
          return [
            {
              id:
                characterId,
              display_name:
                characterName,
            },
          ];
        }

        return [
          {
            id:
              characterId,
            display_name:
              characterName,
          },
          ...selectableCharacters.filter(
            (entry) =>
              entry.id !==
              characterId,
          ),
        ];
      },
      [
        characterId,
        characterName,
        scope,
        selectableCharacters,
      ],
    );

  useEffect(() => {
    if (
      targets.some(
        (entry) =>
          entry.id ===
          targetCharacterId,
      )
    ) {
      return;
    }

    setTargetCharacterId(
      characterId,
    );
  }, [
    characterId,
    targetCharacterId,
    targets,
  ]);

  const load =
    useCallback(
      async () => {
        const result =
          await loadEditableCharacterConditions(
            targetCharacterId,
            scope,
          );

        if (!result.ok) {
          setStatus(
            result.message,
          );
          setStatusOk(false);
          setConditions([]);
          return;
        }

        setConditions(
          result.conditions,
        );
      },
      [
        scope,
        targetCharacterId,
      ],
    );

  useEffect(() => {
    let active = true;

    void load();

    const channel =
      supabase
        .channel(
          `condition-editor-${targetCharacterId}-${crypto.randomUUID()}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_conditions",
            filter:
              `character_id=eq.${targetCharacterId}`,
          },
          () => {
            if (active) {
              void load();
            }
          },
        )
        .subscribe();

    return () => {
      active = false;

      void supabase
        .removeChannel(
          channel,
        );
    };
  }, [
    load,
    supabase,
    targetCharacterId,
  ]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setStatus("");
        },
        3000,
      );

    return () => {
      window.clearTimeout(
        timer,
      );
    };
  }, [status]);

  function addCondition() {
    const label =
      input
        .replace(/\s+/g, " ")
        .trim();

    if (
      !label ||
      pending
    ) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await addCharacterCondition(
            targetCharacterId,
            label,
            scope,
          );

        setStatus(
          result.message,
        );
        setStatusOk(
          result.ok,
        );

        if (result.ok) {
          setConditions(
            result.conditions,
          );
          setInput("");
        }
      },
    );
  }

  function removeCondition(
    conditionId: string,
  ) {
    if (pending) {
      return;
    }

    startTransition(
      async () => {
        const result =
          await removeCharacterCondition(
            targetCharacterId,
            conditionId,
            scope,
          );

        setStatus(
          result.message,
        );
        setStatusOk(
          result.ok,
        );

        if (result.ok) {
          setConditions(
            result.conditions,
          );
        }
      },
    );
  }

  return (
    <div
      data-character-conditions-editor="true"
      className="border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 components_characters_character_conditions_editor_div_container"
    >
      <div className="flex flex-wrap items-center gap-2 components_characters_character_conditions_editor_div_container_2">
        <span className="shrink-0 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))] components_characters_character_conditions_editor_span_text">
          Conditions
        </span>

        {scope ===
          "location" &&
        targets.length > 1 ? (
          <select
            value={
              targetCharacterId
            }
            onChange={(event) => {
              setTargetCharacterId(
                event.target.value,
              );
              setInput("");
              setStatus("");
            }}
            className="h-8 min-w-[160px] border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-2 text-[9px] text-[rgb(var(--sep-colour-cdb894))] outline-none focus:border-[rgb(var(--sep-colour-987344))] components_characters_character_conditions_editor_select_select"
          >
            {targets.map(
              (entry) => (
                <option className="components_characters_character_conditions_editor_option_option"
                  key={entry.id}
                  value={entry.id}
                >
                  {entry.id ===
                  characterId
                    ? `You — ${entry.display_name}`
                    : entry.display_name}
                </option>
              ),
            )}
          </select>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 components_characters_character_conditions_editor_div_container_3">
          {conditions.map(
            (condition) => (
              <span
                key={condition.id}
                className="inline-flex max-w-full items-center gap-1 border border-[rgb(var(--sep-skin-c1))]/45 bg-[rgb(var(--sep-colour-17110d))] px-2 py-1 text-[8px] text-[rgb(var(--sep-skin-c2))] components_characters_character_conditions_editor_span_text_2"
              >
                <span className="max-w-[190px] truncate components_characters_character_conditions_editor_span_text_3">
                  {
                    condition.label
                  }
                </span>

                {condition.can_remove ? (
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Remove ${condition.label}`}
                    title={`Remove ${condition.label}`}
                    onClick={() =>
                      removeCondition(
                        condition.id,
                      )
                    }
                    className="text-[11px] leading-none text-[rgb(var(--sep-skin-c1))] transition hover:text-[rgb(var(--sep-skin-c2))] disabled:opacity-40 components_characters_character_conditions_editor_button_action"
                  >
                    ×
                  </button>
                ) : (
                  <span
                    aria-label={`${condition.label} is staff-locked`}
                    title={
                      condition.created_by_role === "owner"
                        ? "Assigned by Owner"
                        : condition.created_by_role === "admin"
                          ? "Assigned by Admin"
                          : "Assigned by Master"
                    }
                    className="text-[10px] leading-none text-[rgb(var(--sep-colour-806b50))] components_characters_character_conditions_editor_span_text_4"
                  >
                    🔒
                  </span>
                )}
              </span>
            ),
          )}

          <div className="flex min-w-[200px] flex-1 items-center components_characters_character_conditions_editor_div_container_4">
            <input
              type="text"
              maxLength={40}
              value={input}
              disabled={
                pending ||
                conditions.length >=
                  10
              }
              onChange={(event) =>
                setInput(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key !==
                    "Enter" ||
                  event.nativeEvent
                    .isComposing
                ) {
                  return;
                }

                event.preventDefault();
                addCondition();
              }}
              placeholder={
                conditions.length >=
                10
                  ? "10 Conditions maximum"
                  : "Blind, Blue Skin, Left Arm Missing..."
              }
              className="h-8 min-w-0 flex-1 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-0f0c09))] px-2.5 text-[9px] text-[rgb(var(--sep-colour-d0bea1))] outline-none placeholder:text-[rgb(var(--sep-colour-5f574d))] focus:border-[rgb(var(--sep-skin-c1))] components_characters_character_conditions_editor_input_field"
            />

            <button
              type="button"
              disabled={
                pending ||
                !input.trim() ||
                conditions.length >=
                  10
              }
              onClick={
                addCondition
              }
              className="h-8 border border-l-0 border-[rgb(var(--sep-skin-c1))]/55 bg-[rgb(var(--sep-colour-21190f))] px-3 text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-skin-c1))] transition hover:bg-[rgb(var(--sep-colour-2b2014))] disabled:cursor-not-allowed disabled:opacity-40 components_characters_character_conditions_editor_button_add"
            >
              Add
            </button>
          </div>
        </div>

        <span className="shrink-0 text-[7px] text-[rgb(var(--sep-colour-685d50))] components_characters_character_conditions_editor_span_text_5">
          {conditions.length}/10
        </span>
      </div>

      {status ? (
        <p
          aria-live="polite"
          className={[((`mt-2 text-[8px] ${
            statusOk
              ? "text-[rgb(var(--sep-colour-9bb58c))]"
              : "text-[rgb(var(--sep-colour-d58d82))]"
          }`)), "components_characters_character_conditions_editor_p_text"].filter(Boolean).join(" ")}
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}

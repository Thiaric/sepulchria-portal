"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";
import { PriceTooltip } from "@/components/warping/price-tooltip";
import {
  useWarpingPrices,
} from "@/lib/warping/use-warping-prices";

import { sendRoomMessage } from "../actions";
import {
  prepareDispelEffect,
  resolveImmediateShapeCast,
} from "../warping-actions";
import { getShapeAccessForCurrentCharacter } from "../warping-progression-actions";

type C = {
  id: string;
  display_name?: string;
  displayName?: string;
};

type S = Record<string, any>;

const SAVE_LABEL: Record<
  string,
  string
> = {
  dodge: "Dodge",
  defend: "Defend",
  resist_vigour: "Resist Vigour",
  resist_vigor: "Resist Vigour",
  resist_shrewd: "Resist Shrewd",
  resist_brains: "Resist Brains",
  resist_presence: "Resist Presence",
};

const ATTR_LABEL: Record<
  string,
  string
> = {
  muscles: "Muscles",
  reflexes: "Reflexes",
  vigor: "Vigour",
  vigour: "Vigour",
  brains: "Brains",
  shrewd: "Shrewd",
  presence: "Presence",
  presence_score: "Presence",
};

const signed = (n: number) =>
  n > 0 ? `+${n}` : String(n);

const capitalise = (value: unknown) => {
  const text = String(value ?? "").trim();

  return text
    ? text.charAt(0).toUpperCase() +
        text.slice(1)
    : "";
};

function profileBits(
  s: S,
  p: "self" | "other",
) {
  const bits: string[] = [];

  const d = [
    s[`${p}_damage_dice`],
    s[`${p}_damage_attribute`]
      ? `+ ${
          ATTR_LABEL[
            s[`${p}_damage_attribute`]
          ] ??
          s[`${p}_damage_attribute`]
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (d) {
    bits.push(
      `Damage ${d}${
        s.damage_type
          ? ` ${s.damage_type}`
          : ""
      }`,
    );
  }

  const h = [
    s[`${p}_heal_dice`],
    s[`${p}_heal_attribute`]
      ? `+ ${
          ATTR_LABEL[
            s[`${p}_heal_attribute`]
          ] ??
          s[`${p}_heal_attribute`]
        }`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (h) {
    bits.push(`Healing ${h}`);
  }

  const c = Array.isArray(
    s[`${p}_conditions`],
  )
    ? s[`${p}_conditions`]
    : [];

  if (c.length) {
    bits.push(
      `Conditions: ${c.join(", ")}`,
    );
  }

  for (const [k, l] of [
    ["muscles", "Muscles"],
    ["reflexes", "Reflexes"],
    ["vigour", "Vigour"],
    ["brains", "Brains"],
    ["shrewd", "Shrewd"],
    ["presence", "Presence"],
  ]) {
    const v = Number(
      s[`${p}_${k}_modifier`] ?? 0,
    );

    if (v) {
      bits.push(`${l} ${signed(v)}`);
    }
  }

  if (s[`${p}_max_hp_change`]) {
    bits.push(
      `Max HP ${s[`${p}_max_hp_change`]}`,
    );
  }

  return bits;
}

function ShapeInformation({
  shape,
}: {
  shape: S;
}) {
  const priceDefinitions =
    useWarpingPrices();

  const target =
    shape.target_mode === "self"
      ? "Self"
      : shape.target_mode === "other"
        ? "Other"
        : shape.target_mode === "either"
          ? "Self or Other"
          : "Written / Fate";

  const count =
    shape.target_scope === "multiple"
      ? `Multiple, max ${shape.max_targets}`
      : "Single";

  const saves = (
    shape.save_options ?? []
  )
    .map(
      (x: string) =>
        SAVE_LABEL[x] ?? x,
    )
    .join(", ");

  const prereq = [
    ["muscles", "Muscles"],
    ["reflexes", "Reflexes"],
    ["vigour", "Vigour"],
    ["brains", "Brains"],
    ["shrewd", "Shrewd"],
    ["presence", "Presence"],
  ]
    .map(([k, l]) =>
      shape[`min_${k}`]
        ? `${l} ${shape[`min_${k}`]}+`
        : "",
    )
    .filter(Boolean);

  const duration =
    shape.is_instantaneous
      ? "Instantaneous"
      : shape.duration_unit ===
          "until_dispelled"
        ? "Until Dispelled"
        : `${shape.duration_amount ?? 1} ${
            shape.duration_unit ??
            "minutes"
          }`;

  const price =
    shape.price_key
      ? (
          priceDefinitions.find(
            (entry) =>
              entry.key ===
              String(shape.price_key),
          )?.name ??
          String(shape.price_key)
        )
      : "None";

  const selfBits = profileBits(
    shape,
    "self",
  );

  const otherBits = profileBits(
    shape,
    "other",
  );

  return (
    <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-120d09))] p-4 game_components_warpingpanel_div_container">
      <p className="text-[8px] uppercase tracking-[.13em] text-[rgb(var(--sep-colour-9a7c54))] game_components_warpingpanel_p_text">
        Level {shape.level} ·{" "}
        {shape.school} ·{" "}
        {shape.word_of_power} ·{" "}
        {shape.movement}
      </p>

      <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-c0ae92))] game_components_warpingpanel_p_text_2">
        {shape.description}
      </p>

      <div className="mt-3 grid gap-2 text-[9px] text-[rgb(var(--sep-colour-9e8b70))] sm:grid-cols-2 lg:grid-cols-4 game_components_warpingpanel_div_container_2">
        <span className="game_components_warpingpanel_span_text">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Components:
          </b>{" "}
          {[
            shape.requires_verbal
              ? "Verbal"
              : "",
            shape.requires_movement
              ? "Movement"
              : "",
          ]
            .filter(Boolean)
            .join(" + ") || "None"}
        </span>

        <span className="game_components_warpingpanel_span_text_2">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Target:
          </b>{" "}
          {target} · {count}
        </span>

        <span className="game_components_warpingpanel_span_text_3">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Resolution:
          </b>{" "}
          {shape.resolution_mode ===
          "automatic"
            ? "Automatic Success"
            : "Save"}
        </span>

        <span className="game_components_warpingpanel_span_text_4">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Nature:
          </b>{" "}
          {shape.effect_nature}
        </span>

        {shape.resolution_mode !==
        "automatic" ? (
          <>
            <span className="game_components_warpingpanel_span_text_5">
              <b className="text-[rgb(var(--sep-colour-cdb48d))]">
                DC:
              </b>{" "}
              11 +{" "}
              {ATTR_LABEL[
                shape.dc_attribute
              ] ??
                shape.dc_attribute ??
                "—"}
            </span>

            <span className="game_components_warpingpanel_span_text_6">
              <b className="text-[rgb(var(--sep-colour-cdb48d))]">
                Saves:
              </b>{" "}
              {saves || "None"}
            </span>

            <span className="game_components_warpingpanel_span_text_7">
              <b className="text-[rgb(var(--sep-colour-cdb48d))]">
                On Save:
              </b>{" "}
              {shape.save_success_damage ===
              "half"
                ? "Half damage, no conditions/effects"
                : "No effect"}
            </span>
          </>
        ) : null}

        <span className="game_components_warpingpanel_span_text_8">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Duration:
          </b>{" "}
          {duration}
        </span>

        <span className="game_components_warpingpanel_span_text_9">
          <b className="text-[rgb(var(--sep-colour-cdb48d))]">
            Price:
          </b>{" "}
          {shape.price_key ? (
            <PriceTooltip
              priceKey={
                shape.price_key
              }
            >
              <span className="underline decoration-dotted underline-offset-2 game_components_warpingpanel_span_text_10">
                {price}
              </span>
            </PriceTooltip>
          ) : (
            price
          )}
        </span>

        {shape.is_dispel ? (
          <span className="game_components_warpingpanel_span_text_11">
            <b className="text-[rgb(var(--sep-colour-cdb48d))]">
              Dispel:
            </b>{" "}
            Level {shape.level},
            equal or lower effects
          </span>
        ) : null}

        {prereq.length ? (
          <span className="sm:col-span-2 game_components_warpingpanel_span_text_12">
            <b className="text-[rgb(var(--sep-colour-cdb48d))]">
              Requirements:
            </b>{" "}
            {prereq.join(", ")}
          </span>
        ) : null}
      </div>

      {selfBits.length ? (
        <p className="mt-3 text-[9px] leading-5 text-[rgb(var(--sep-colour-a99577))] game_components_warpingpanel_p_text_3">
          <b className="text-[rgb(var(--sep-colour-d7bd91))]">
            Self profile:
          </b>{" "}
          {selfBits.join(" · ")}
        </p>
      ) : null}

      {otherBits.length ? (
        <p className="mt-1 text-[9px] leading-5 text-[rgb(var(--sep-colour-a99577))] game_components_warpingpanel_p_text_4">
          <b className="text-[rgb(var(--sep-colour-d7bd91))]">
            Other profile:
          </b>{" "}
          {otherBits.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function WarpingPanel({
  presentCharacters,
  beyondEssenceCharacterIds,
  onBack,
}: {
  presentCharacters: C[];
  beyondEssenceCharacterIds: string[];
  onBack: () => void;
}) {
  const priceDefinitions =
    useWarpingPrices();

  const priceByKey =
    useMemo(
      () =>
        new Map(
          priceDefinitions.map(
            (price) => [
              price.key,
              price,
            ],
          ),
        ),
      [priceDefinitions],
    );

  const db = useMemo(
    () => createClient(),
    [],
  );

  const [r, setR] =
    useState<any>(null);

  const [sid, setSid] =
    useState("");

  const [targets, setTargets] =
    useState<string[]>([]);

  const [written, setWritten] =
    useState("");

  const [
    targetChoice,
    setTargetChoice,
  ] = useState<
    "character" | "written"
  >("character");

  const [
    targetEffectChoices,
    setTargetEffectChoices,
  ] = useState<
    Record<
      string,
      "beneficial" | "harmful"
    >
  >({});

  const [msg, setMsg] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [
    blockedTargets,
    setBlockedTargets,
  ] = useState<string[]>([]);

  const [
    dispelTarget,
    setDispelTarget,
  ] = useState("");

  const [
    dispelEffects,
    setDispelEffects,
  ] = useState<any[]>([]);

  const [
    selectedDispelEffect,
    setSelectedDispelEffect,
  ] = useState("");

  const [access, setAccess] =
    useState<any>(null);

  async function load() {
    const x = await db.rpc(
      "get_my_warping_runtime",
    );

    if (x.error) {
      setMsg(x.error.message);
      return;
    }

    setR(x.data);

    if (
      !sid &&
      x.data?.shapes?.[0]
    ) {
      setSid(
        x.data.shapes[0].id,
      );
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const s: S | null =
    r?.shapes?.find(
      (x: S) => x.id === sid,
    ) ??
    r?.shapes?.[0] ??
    null;

  const beyondEssenceIds =
    useMemo(
      () =>
        new Set(
          beyondEssenceCharacterIds,
        ),
      [beyondEssenceCharacterIds],
    );

  const isResurrectionShape =
    Boolean(
      s &&
      Number(s.level) === 9 &&
      (
        String(
          s.other_heal_dice ?? "",
        ).trim() ||
        String(
          s.other_heal_attribute ?? "",
        ).trim()
      ),
    );

  const ordinaryShapeTargets =
    useMemo(
      () =>
        presentCharacters.filter(
          (character) =>
            !beyondEssenceIds.has(
              character.id,
            ),
        ),
      [
        presentCharacters,
        beyondEssenceIds,
      ],
    );

  const shapeTargetCharacters =
    isResurrectionShape
      ? presentCharacters
      : ordinaryShapeTargets;

  useEffect(() => {
    if (isResurrectionShape) {
      return;
    }

    setTargets((current) =>
      current.filter(
        (id) =>
          !beyondEssenceIds.has(id),
      ),
    );

    if (
      dispelTarget &&
      beyondEssenceIds.has(
        dispelTarget,
      )
    ) {
      setDispelTarget("");
      setSelectedDispelEffect("");
    }
  }, [
    beyondEssenceIds,
    dispelTarget,
    isResurrectionShape,
  ]);

  useEffect(() => {
    let active = true;

    async function check() {
      if (!s?.id) {
        setAccess(null);
        return;
      }

      const result =
        await getShapeAccessForCurrentCharacter(
          s.id,
        );

      if (active) {
        setAccess(result);
      }
    }

    void check();

    return () => {
      active = false;
    };
  }, [
    s?.id,
    r?.warps_used,
    r?.warps_per_day,
  ]);

  useEffect(() => {
    let active = true;

    async function loadBlocked() {
      if (
        !s?.id ||
        !r?.character_id
      ) {
        setBlockedTargets([]);
        return;
      }

      const ids = [
        r.character_id,
        ...presentCharacters.map(
          c => c.id,
        ),
      ];

      const q = await (db as any)
        .from(
          "character_effects",
        )
        .select(
          "target_character_id",
        )
        .eq("source_type", "shape")
        .eq("source_definition_id", s.id)
        .in(
          "target_character_id",
          ids,
        )
        .is(
          "dispelled_at",
          null,
        )
        .is(
          "ended_at",
          null,
        )
        .or(
          `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`,
        );

      if (active) {
        setBlockedTargets(
          (q.data ?? []).map(
            (x: any) =>
              String(
                x.target_character_id,
              ),
          ),
        );
      }
    }

    void loadBlocked();

    const ch = db
      .channel(
        `warp-blocked-${
          s?.id ?? "none"
        }-${crypto.randomUUID()}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table:
            "character_effects",
        },
        () =>
          void loadBlocked(),
      )
      .subscribe();

    return () => {
      active = false;
      void db.removeChannel(ch);
    };
  }, [
    db,
    s?.id,
    r?.character_id,
    presentCharacters,
  ]);

  useEffect(() => {
    let active = true;

    async function loadDispelEffects() {
      if (
        !s?.is_dispel ||
        !dispelTarget
      ) {
        if (active) {
          setDispelEffects([]);
          setSelectedDispelEffect(
            "",
          );
        }

        return;
      }

      const q = await (db as any)
        .from("character_effects")
        .select("id,source_type,source_name,source_level,effect_nature,conditions,dispellable,expires_at")
        .eq("target_character_id",dispelTarget)
        .eq("dispellable",true)
        .is("ended_at",null)
        .is("dispelled_at",null)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      const eligible = (
        q.data ?? []
      )
        .filter(
          (e: any) =>
            e.source_type !== "shape" ||
            Number(e.source_level) <= Number(s.level),
        )
        .map((e: any) => ({
          ...e,
          shape_name: e.source_name,
          shape_level: e.source_level,
        }));

      if (active) {
        setDispelEffects(
          eligible,
        );

        setSelectedDispelEffect(
          v =>
            eligible.some(
              (e: any) =>
                e.id === v,
            )
              ? v
              : "",
        );
      }
    }

    void loadDispelEffects();

    return () => {
      active = false;
    };
  }, [
    db,
    s?.id,
    s?.is_dispel,
    s?.level,
    dispelTarget,
  ]);

  function toggle(
    id: string,
  ) {
    if (
      blockedTargets.includes(
        id,
      )
    ) {
      return;
    }

    const m =
      s?.target_scope ===
      "multiple"
        ? Number(
            s.max_targets ?? 1,
          )
        : 1;

    setTargets(a =>
      a.includes(id)
        ? a.filter(
            x => x !== id,
          )
        : [...a, id].slice(
            -m,
          ),
    );
  }

  async function warp() {
    if (!s || busy) {
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const au =
        await db.auth.getUser();

      if (!au.data.user) {
        throw Error(
          "Not signed in.",
        );
      }

      const me = await db
        .from("characters")
        .select(
          "id,current_room_id",
        )
        .eq(
          "user_id",
          au.data.user.id,
        )
        .single();

      if (
        me.error ||
        !me.data
      ) {
        throw Error(
          me.error?.message ??
            "Character not found.",
        );
      }

      const freshAccess =
        await getShapeAccessForCurrentCharacter(
          s.id,
        );

      if (
        !freshAccess.allowed
      ) {
        throw Error(
          freshAccess.reasons.join(
            " · ",
          ) ||
            "This Shape cannot currently be Warped.",
        );
      }

      const wt =
        s.target_mode ===
          "written" ||
        ((
          s.target_mode ===
            "other" ||
          s.target_mode ===
            "either"
        ) &&
          targetChoice ===
            "written");

      const self =
        s.target_mode ===
        "self";

      if (
        wt &&
        !written.trim()
      ) {
        throw Error(
          "Write the Fate target.",
        );
      }

      if (
        !wt &&
        !self &&
        !targets.length
      ) {
        throw Error(
          "Choose a target.",
        );
      }

      if (
        s.is_dispel &&
        (!dispelTarget ||
          !selectedDispelEffect)
      ) {
        throw Error(
          "Choose a Dispel target and an active effect to dispel before Warping.",
        );
      }

      const cr = await db
        .from("shape_casts")
        .insert({
          caster_character_id:
            me.data.id,
          shape_id: s.id,
          room_id:
            me.data
              .current_room_id,
          written_target: wt
            ? written.trim()
            : null,
        })
        .select("id")
        .single();

      if (
        cr.error ||
        !cr.data
      ) {
        throw Error(
          cr.error?.message ??
            "Cast failed.",
        );
      }

      if (s.price_key) {
        const pe =
          await db.rpc(
            "create_price_for_shape_cast",
            {
              p_cast_id:
                cr.data.id,
              p_shape_id:
                s.id,
            },
          );

        if (pe.error) {
          throw Error(
            pe.error.message,
          );
        }
      }

      const rows = wt
        ? [
            {
              cast_id:
                cr.data.id,
              target_kind:
                "written",
              outcome:
                "manual",
            },
          ]
        : self
          ? [
              {
                cast_id:
                  cr.data.id,
                target_character_id:
                  me.data.id,
                target_kind:
                  "self",
                outcome:
                  "pending",
                resolved_at:
                  null,
              },
            ]
          : targets.map(
              id => ({
                cast_id:
                  cr.data.id,
                target_character_id:
                  id,
                target_kind:
                  id ===
                  me.data.id
                    ? "self"
                    : "character",
                outcome:
                  "pending",
                resolved_at:
                  null,
                other_effect_choice:
                  s.other_alternative_enabled &&
                  id !==
                    me.data.id
                    ? targetEffectChoices[
                        id
                      ] ??
                      "beneficial"
                    : null,
              }),
            );

      const tr = await db
        .from(
          "shape_cast_targets",
        )
        .insert(rows);

      if (tr.error) {
        throw Error(
          tr.error.message,
        );
      }

      let immediateResolutionMessage =
        "";

      if (!wt) {
        const immediate =
          await resolveImmediateShapeCast(
            cr.data.id,
          );

        if (!immediate.ok) {
          throw Error(
            immediate.message ||
              "Automatic Shape effects could not be applied.",
          );
        }

        immediateResolutionMessage =
          immediate.message;
      }

      let preparedDispelMessage =
        "";

      if (s.is_dispel) {
        const fd =
          new FormData();

        fd.set(
          "cast_id",
          cr.data.id,
        );

        fd.set(
          "target_character_id",
          dispelTarget,
        );

        fd.set(
          "effect_id",
          selectedDispelEffect,
        );

        const prepared =
          await prepareDispelEffect(
            {
              ok: false,
              message: "",
            },
            fd,
          );

        if (!prepared.ok) {
          throw Error(
            prepared.message ||
              "Unable to prepare Dispel.",
          );
        }

        preparedDispelMessage =
          prepared.message;
      }

      const targetNames = wt
        ? written.trim()
        : self
          ? "Self"
          : targets
              .map(id => {
                if (id === me.data.id) return "Self";

                const entry =
                  presentCharacters.find(
                    c => c.id === id,
                  );

                return (
                  entry?.display_name ??
                  entry?.displayName ??
                  "Unknown"
                );
              })
              .join(" / ");

      const profileForTarget = (
        id: string,
      ): "self" | "other" | "other_alt" => {
        if (id === me.data.id) return "self";

        if (
          s.other_alternative_enabled &&
          (targetEffectChoices[id] ?? "beneficial") === "harmful"
        ) {
          return "other_alt";
        }

        return "other";
      };

      const activeProfiles: Array<
        "self" | "other" | "other_alt"
      > = wt
        ? []
        : self
          ? ["self"]
          : [
              ...new Set(
                targets.map(profileForTarget),
              ),
            ];

      const resolutionForProfile = (
        profile:
          | "self"
          | "other"
          | "other_alt",
      ) =>
        String(
          s[
            `${profile}_resolution_mode`
          ] ??
            s.resolution_mode ??
            "save",
        );

      const attributeLabel = (
        value: unknown,
      ) => {
        const key =
          String(value ?? "").trim();

        return key
          ? ATTR_LABEL[key] ?? key
          : "";
      };

      const parts: string[] = [];

      parts.push(
        `◆ Warp [${s.name}]`,
      );

      const wordAndMovement = [
  s.word_of_power
    ? `Word of Power: [${capitalise(s.word_of_power)}]`
    : "",
  s.movement
    ? `Movement: [${capitalise(s.movement)}]`
    : "",
]
  .filter(Boolean)
  .join(" - ");

if (wordAndMovement) {
  parts.push(wordAndMovement);
}

      if (
        s.level !== null &&
        s.level !== undefined
      ) {
        parts.push(
  `Level: [${s.level}]`,
);
      }

      if (s.school) {
  parts.push(
    `School [${capitalise(s.school)}]`,
  );
}

      parts.push(
        `${
          !wt &&
          !self &&
          targets.length > 1
            ? "Targets"
            : "Target"
        } [${targetNames}]`,
      );

      if (s.effect_nature) {
        const rawNature =
          String(s.effect_nature).trim();

        const nature =
          rawNature
            ? rawNature.charAt(0).toUpperCase() +
              rawNature.slice(1)
            : "";

        if (nature) {
          parts.push(
            `Nature [${nature}]`,
          );
        }
      }

      if (wt) {
        parts.push(
          "Save Required [Fate]",
        );
      } else {
        const saveProfiles =
          activeProfiles.filter(
            profile =>
              resolutionForProfile(
                profile,
              ) === "save",
          );

        if (saveProfiles.length) {
          const dcAttributes = [
            ...new Set(
              saveProfiles
                .map(
                  profile =>
                    s[
                      `${profile}_dc_attribute`
                    ] ??
                    s.dc_attribute,
                )
                .filter(Boolean)
                .map(String),
            ),
          ];

          const dcParts =
            dcAttributes.map(
              attribute => {
                const runtimeKey =
                  attribute === "vigour"
                    ? "vigor"
                    : attribute === "presence"
                      ? "presence_score"
                      : attribute;

                const casterValue =
                  Number(
                    r?.[runtimeKey],
                  );

                return Number.isFinite(
                  casterValue,
                )
                  ? String(
                      11 + casterValue,
                    )
                  : `11 + ${attributeLabel(
                      attribute,
                    )}`;
              },
            );

          const saveOptions = [
            ...new Set(
              saveProfiles.flatMap(
                profile => {
                  const profileOptions =
                    s[
                      `${profile}_save_options`
                    ];

                  return Array.isArray(
                    profileOptions,
                  )
                    ? profileOptions
                    : Array.isArray(
                          s.save_options,
                        )
                      ? s.save_options
                      : [];
                },
              ),
            ),
          ];

          const saveAttributes = [
            ...new Set(
              saveOptions
                .map(option => {
                  switch (
                    String(option)
                  ) {
                    case "dodge":
                      return "Reflexes";
                    case "defend":
                      return "Vigour";
                    case "resist_vigour":
                    case "resist_vigor":
                      return "Vigour";
                    case "resist_shrewd":
                      return "Shrewd";
                    case "resist_brains":
                      return "Brains";
                    case "resist_presence":
                      return "Presence";
                    default:
                      return "";
                  }
                })
                .filter(Boolean),
            ),
          ];

          const dcText =
            dcParts.length
              ? dcParts.join(" / ")
              : "—";

          const saveAttributeText =
            saveAttributes.length
              ? saveAttributes.join(
                  " / ",
                )
              : "—";

          parts.push(
            `Save Required [DC ${dcText} - ${saveAttributeText}]`,
          );
        } else {
          parts.push(
            "Save Required [None]",
          );
        }
      }

      const components = [
        s.requires_verbal
          ? "Verbal"
          : "",
        s.requires_movement
          ? "Movement"
          : "",
      ]
        .filter(Boolean)
        .join(" + ");

      parts.push(
        `Components [${components || "None"}]`,
      );

      if (s.description) {
        const effect =
          String(s.description)
            .replace(/\s+/g, " ")
            .trim();

        if (effect) {
          parts.push(
            `Effect: [${effect}]`,
          );
        }
      }

      const uniqueValues = (
        values: string[],
      ) => [
        ...new Set(
          values.filter(Boolean),
        ),
      ];

      const damageValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const dice =
                String(
                  s[
                    `${profile}_damage_dice`
                  ] ?? "",
                ).trim();

              const attribute =
                String(
                  s[
                    `${profile}_damage_attribute`
                  ] ?? "",
                ).trim();

              if (!dice && !attribute) {
                return "";
              }

              const damageBase = [
  dice,
  attribute
    ? `+ ${attributeLabel(
        attribute,
      )}`
    : "",
]
  .filter(Boolean)
  .join(" ");

const damageType =
  s.damage_type
    ? String(s.damage_type)
    : "";

return [
  damageBase,
  damageType,
]
  .filter(Boolean)
  .join(" - ");
            },
          ),
        );

      if (damageValues.length) {
        parts.push(
          `Damage [${damageValues.join(
            " / ",
          )}]`,
        );
      }

      const healingValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const dice =
                String(
                  s[
                    `${profile}_heal_dice`
                  ] ?? "",
                ).trim();

              const attribute =
                String(
                  s[
                    `${profile}_heal_attribute`
                  ] ?? "",
                ).trim();

              if (!dice && !attribute) {
                return "";
              }

              return [
                dice,
                attribute
                  ? `+ ${attributeLabel(
                      attribute,
                    )}`
                  : "",
              ]
                .filter(Boolean)
                .join(" ");
            },
          ),
        );

      if (healingValues.length) {
        parts.push(
          `Healing [${healingValues.join(
            " / ",
          )}]`,
        );
      }

      const maxHealthValues =
        uniqueValues(
          activeProfiles.map(
            profile => {
              const raw =
                String(
                  s[
                    `${profile}_max_hp_change`
                  ] ?? "",
                ).trim();

              if (!raw || raw === "0") {
                return "";
              }

              const numeric =
                Number(raw);

              return (
                Number.isFinite(numeric) &&
                numeric > 0 &&
                !raw.startsWith("+")
                  ? `+${raw}`
                  : raw
              );
            },
          ),
        );

      if (maxHealthValues.length) {
        parts.push(
          `Max Health [${maxHealthValues.join(
            " / ",
          )}]`,
        );
      }

      const conditions =
        uniqueValues(
          activeProfiles.flatMap(
            profile => {
              const value =
                s[
                  `${profile}_conditions`
                ];

              return Array.isArray(value)
                ? value.map(String)
                : [];
            },
          ),
        );

      if (conditions.length) {
        parts.push(
          `Applies [${conditions.join(
            " / ",
          )}]`,
        );
      }

      let duration = "";

      if (s.is_instantaneous) {
        duration =
          "Instantaneous";
      } else if (
        s.duration_unit ===
        "until_dispelled"
      ) {
        duration =
          "Until Dispelled";
      } else if (
        s.duration_amount &&
        s.duration_unit
      ) {
        duration =
          `${s.duration_amount} ${s.duration_unit}`;
      }

      if (duration) {
        parts.push(
          `Duration [${duration}]`,
        );
      }

      const prerequisites = [
        ["muscles", "Muscles"],
        ["reflexes", "Reflexes"],
        ["vigour", "Vigour"],
        ["brains", "Brains"],
        ["shrewd", "Shrewd"],
        ["presence", "Presence"],
      ]
        .map(([key, label]) => {
          const minimum =
            s[`min_${key}`];

          if (
            minimum === null ||
            minimum === undefined ||
            minimum === "" ||
            Number(minimum) === 0
          ) {
            return "";
          }

          return `${label} ${minimum}+`;
        })
        .filter(Boolean);

      if (prerequisites.length) {
        parts.push(
          `Prerequisites [${prerequisites.join(
            " / ",
          )}]`,
        );
      }

      if (s.price_key) {
        const priceDefinition =
          priceByKey.get(
            String(s.price_key),
          );

        parts.push(
          `Price [${
            priceDefinition?.name ??
            String(s.price_key)
          }]`,
        );
      }

      if (s.is_dispel) {
        const de =
          dispelEffects.find(
            (e: any) =>
              e.id ===
              selectedDispelEffect,
          );

        if (de) {
          const dispelTargetName =
            dispelTarget === me.data.id
              ? "Self"
              : presentCharacters.find(c => c.id === dispelTarget)?.display_name ??
                presentCharacters.find(c => c.id === dispelTarget)?.displayName ??
                "Unknown";

          parts.push(
            `Dispels [${de.shape_name} - Level ${de.shape_level} from ${dispelTargetName}]`,
          );
        }
      }

      const castText =
        parts
          .filter(Boolean)
          .join(" · ");

      const roomMessageData =
        new FormData();

      roomMessageData.set(
        "message",
        castText,
      );

      roomMessageData.set(
        "client_nonce",
        crypto.randomUUID(),
      );

      roomMessageData.set(
        "whisper_recipient_id",
        "",
      );

      const posted =
        await sendRoomMessage(
          {
            ok: false,
            message: "",
          },
          roomMessageData,
        );

      if (!posted.ok) {
        throw Error(
          posted.message ||
            "Shape was recorded but its room message could not be posted.",
        );
      }

      setTargets([]);
      setWritten("");
      setTargetChoice(
        "character",
      );
      setTargetEffectChoices(
        {},
      );
      setSelectedDispelEffect(
        "",
      );
      setDispelEffects([]);
      setDispelTarget("");

      setMsg(
        preparedDispelMessage ||
          (wt
            ? "Warp recorded. Fate resolves it manually."
            : "Shape warped."),
      );

      await load();
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message
          : "Warp failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!r) {
    return (
      <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 game_components_warpingpanel_div_container_3">
        <button
          type="button"
          onClick={onBack}
          className="text-[9px] uppercase text-[rgb(var(--sep-colour-d6b37d))] game_components_warpingpanel_button_back_chat"
        >
          Back to Chat
        </button>

        <p className="mt-3 text-xs text-[rgb(var(--sep-colour-8f8271))] game_components_warpingpanel_p_text_5">
          {msg ||
            "Loading Warping..."}
        </p>
      </div>
    );
  }

  return (
    <div className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] p-4 game_components_warpingpanel_div_container_4">
      <div className="flex justify-between gap-3 game_components_warpingpanel_div_container_5">
        <div className="game_components_warpingpanel_div_warping">
          <p className="text-[8px] uppercase tracking-[.2em] text-[rgb(var(--sep-colour-806b50))] game_components_warpingpanel_p_warping">
            The Current
          </p>

          <h3 className="font-serif text-xl text-[rgb(var(--sep-colour-dfc99f))] game_components_warpingpanel_h3_warping">
            Warping
          </h3>
        </div>

        <div className="text-[10px] text-[rgb(var(--sep-colour-a99577))] game_components_warpingpanel_div_container_6">
          <span className="game_components_warpingpanel_span_text_13">
            Affinity{" "}
            <b className="text-[rgb(var(--sep-colour-ead1a3))]">
              {access?.affinity ??
                r.affinity}
            </b>
          </span>

          <span className="ml-3 game_components_warpingpanel_span_text_14">
            Shapes{" "}
            <b className="text-[rgb(var(--sep-colour-ead1a3))]">
              {access
                ? Math.max(
                    0,
                    access.warpsPerDay -
                      access.warpsUsed,
                  )
                : r.warps_remaining}{" "}
              /{" "}
              {access?.warpsPerDay ??
                r.warps_per_day}
            </b>
          </span>

          <span className="ml-3 text-[rgb(var(--sep-colour-806b50))] game_components_warpingpanel_span_text_15">
            Reset 08:00 UK
          </span>

          <button
            type="button"
            onClick={onBack}
            className="ml-3 border border-[rgb(var(--sep-colour-60482e))]/55 px-3 py-2 text-[8px] uppercase game_components_warpingpanel_button_back_chat_2"
          >
            Back to Chat
          </button>
        </div>
      </div>

      {!r.shapes?.length ? (
        <p className="mt-4 text-xs text-[rgb(var(--sep-colour-8f8271))] game_components_warpingpanel_p_text_6">
          You have no Shapes
          assigned.
        </p>
      ) : (
        <>
          <select
            value={s?.id ?? ""}
            onChange={e => {
              setSid(
                e.target.value,
              );
              setTargets([]);
              setWritten("");
              setTargetChoice(
                "character",
              );
              setTargetEffectChoices(
                {},
              );
              setDispelEffects(
                [],
              );
              setDispelTarget("");
              setSelectedDispelEffect(
                "",
              );
            }}
            className="mt-4 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_warpingpanel_select_select"
          >
            {r.shapes.map(
              (x: S) => (
                <option
                  className="game_components_warpingpanel_option_option"
                  key={x.id}
                  value={x.id}
                >
                  L{x.level} ·{" "}
                  {x.name} ·{" "}
                  {x.word_of_power}
                  {x.level_available
                    ? ""
                    : " · LOCKED"}
                </option>
              ),
            )}
          </select>

          {s ? (
            <ShapeInformation
              shape={s}
            />
          ) : null}

          {(s?.target_mode ===
            "other" ||
            s?.target_mode ===
              "either") ? (
            <div className="mt-3 flex gap-2 game_components_warpingpanel_div_container_7">
              <button
                type="button"
                onClick={() => {
                  setTargetChoice(
                    "character",
                  );
                  setWritten("");
                }}
                aria-pressed={
                  targetChoice ===
                  "character"
                }
                className={[
                  "border px-3 py-2 text-[8px] uppercase transition",
                  targetChoice ===
                  "character"
                    ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/55",
                  "game_components_warpingpanel_button_character",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Character
              </button>

              <button
                type="button"
                onClick={() => {
                  setTargetChoice(
                    "written",
                  );

                  setTargets(
                    [],
                  );

                  setTargetEffectChoices(
                    {},
                  );
                }}
                aria-pressed={
                  targetChoice ===
                  "written"
                }
                className={[
                  "border px-3 py-2 text-[8px] uppercase transition",
                  targetChoice ===
                  "written"
                    ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"
                    : "border-[rgb(var(--sep-colour-60482e))]/55",
                  "game_components_warpingpanel_button_written_fate",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                Written / Fate
              </button>
            </div>
          ) : null}

          {s?.target_mode ===
            "written" ||
          ((
            s?.target_mode ===
              "other" ||
            s?.target_mode ===
              "either"
          ) &&
            targetChoice ===
              "written") ? (
            <div className="mt-3">
              <label
                htmlFor="warping-written-fate-target"
                className="block text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))]"
              >
                Written / Fate
                Target
              </label>

              <input
                id="warping-written-fate-target"
                type="text"
                value={written}
                onChange={e =>
                  setWritten(
                    e.target.value,
                  )
                }
                placeholder="Written / Fate target..."
                autoFocus
                className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] outline-none transition focus:border-[rgb(var(--sep-skin-c1))] game_components_warpingpanel_input_field"
              />
            </div>
          ) : s?.target_mode !==
            "self" ? (
            <div className="mt-3 flex flex-wrap gap-2 game_components_warpingpanel_div_container_8">
              {s?.target_mode ===
                "either" &&
              !blockedTargets.includes(
                r.character_id,
              ) ? (
                <button
                  type="button"
                  onClick={() =>
                    toggle(
                      r.character_id,
                    )
                  }
                  aria-pressed={targets.includes(
                    r.character_id,
                  )}
                  className={[
                    "border px-3 py-2 text-[9px] transition",
                    targets.includes(
                      r.character_id,
                    )
                      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_1px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
                      : "border-[rgb(var(--sep-colour-60482e))]/55",
                    "game_components_warpingpanel_button_self",
                  ]
                    .filter(
                      Boolean,
                    )
                    .join(" ")}
                >
                  {targets.includes(
                    r.character_id,
                  )
                    ? "✓ Self"
                    : "Self"}
                </button>
              ) : null}

              {shapeTargetCharacters
                .filter(
                  c =>
                    c.id !==
                      r.character_id &&
                    !blockedTargets.includes(
                      c.id,
                    ),
                )
                .map(c => {
                  const selected =
                    targets.includes(
                      c.id,
                    );

                  return (
                    <button
                      key={
                        c.id
                      }
                      type="button"
                      onClick={() =>
                        toggle(
                          c.id,
                        )
                      }
                      aria-pressed={
                        selected
                      }
                      className={[
                        "border px-3 py-2 text-[9px] transition",
                        selected
                          ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))] shadow-[inset_0_0_0_1px_rgb(var(--sep-skin-c1)),0_0_10px_rgb(var(--sep-skin-c1)/0.25)]"
                          : "border-[rgb(var(--sep-colour-60482e))]/55",
                        "game_components_warpingpanel_button_action",
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(
                          " ",
                        )}
                    >
                      {selected
                        ? "✓ "
                        : ""}
                      {c.display_name ??
                        c.displayName}
                    </button>
                  );
                })}
            </div>
          ) : (
            <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-9e8b70))] game_components_warpingpanel_p_text_7">
              Target: Self ·
              automatic success.
            </p>
          )}

          {s?.other_alternative_enabled &&
          targetChoice ===
            "character" &&
          targets.some(
            id =>
              id !==
              r.character_id,
          ) ? (
            <div className="mt-3 space-y-2 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_warpingpanel_div_container_9">
              <p className="text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))] game_components_warpingpanel_p_text_8">
                Effect for each
                Other target
              </p>

              {targets
                .filter(
                  id =>
                    id !==
                    r.character_id,
                )
                .map(id => {
                  const entry =
                    presentCharacters.find(
                      c =>
                        c.id ===
                        id,
                    );

                  const choice =
                    targetEffectChoices[
                      id
                    ] ??
                    "beneficial";

                  return (
                    <div
                      key={
                        id
                      }
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--sep-colour-60482e))]/25 pt-2 game_components_warpingpanel_div_container_10"
                    >
                      <span className="text-[9px] text-[rgb(var(--sep-colour-c5ad86))] game_components_warpingpanel_span_text_16">
                        {entry?.display_name ??
                          entry?.displayName ??
                          "Target"}
                      </span>

                      <div className="flex gap-2 game_components_warpingpanel_div_container_11">
                        <button
                          type="button"
                          onClick={() =>
                            setTargetEffectChoices(
                              v => ({
                                ...v,
                                [id]:
                                  "beneficial",
                              }),
                            )
                          }
                          className={[
                            "border px-3 py-2 text-[8px] uppercase",
                            choice ===
                            "beneficial"
                              ? "border-[rgb(var(--sep-colour-b88b50))] bg-[rgb(var(--sep-colour-2a1d12))]"
                              : "border-[rgb(var(--sep-colour-60482e))]/55",
                            "game_components_warpingpanel_button_beneficial",
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " ",
                            )}
                        >
                          Beneficial
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setTargetEffectChoices(
                              v => ({
                                ...v,
                                [id]:
                                  "harmful",
                              }),
                            )
                          }
                          className={[
                            "border px-3 py-2 text-[8px] uppercase",
                            choice ===
                            "harmful"
                              ? "border-[rgb(var(--sep-colour-b88b50))] bg-[rgb(var(--sep-colour-2a1d12))]"
                              : "border-[rgb(var(--sep-colour-60482e))]/55",
                            "game_components_warpingpanel_button_harmful",
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " ",
                            )}
                        >
                          Harmful
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : null}

          {s?.is_dispel ? (
            <div className="mt-3 border border-[rgb(var(--sep-colour-60482e))]/35 bg-[rgb(var(--sep-colour-15100d))] p-3 game_components_warpingpanel_div_container_12">
              <p className="text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))] game_components_warpingpanel_p_text_9">
                Dispel Target
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDispelTarget(r.character_id);
                    setSelectedDispelEffect("");
                  }}
                  aria-pressed={dispelTarget === r.character_id}
                  className={[
                    "border px-3 py-2 text-[9px] transition",
                    dispelTarget === r.character_id
                      ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"
                      : "border-[rgb(var(--sep-colour-60482e))]/55",
                  ].join(" ")}
                >
                  {dispelTarget === r.character_id ? "✓ Self" : "Self"}
                </button>

                {ordinaryShapeTargets
                  .filter(c => c.id !== r.character_id)
                  .map(c => {
                    const selected = dispelTarget === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setDispelTarget(c.id);
                          setSelectedDispelEffect("");
                        }}
                        aria-pressed={selected}
                        className={[
                          "border px-3 py-2 text-[9px] transition",
                          selected
                            ? "border-[rgb(var(--sep-skin-c1))] bg-[rgb(var(--sep-skin-c1))]/25 text-[rgb(var(--sep-skin-c2))]"
                            : "border-[rgb(var(--sep-colour-60482e))]/55",
                        ].join(" ")}
                      >
                        {selected ? "✓ " : ""}
                        {c.display_name ?? c.displayName}
                      </button>
                    );
                  })}
              </div>

              {dispelTarget ? (
                <>
                  <p className="mt-3 text-[8px] uppercase tracking-[.14em] text-[rgb(var(--sep-colour-806b50))]">
                    Effect to Dispel
                  </p>

                  {dispelEffects.length ? (
                    <select
                      value={selectedDispelEffect}
                      onChange={e => setSelectedDispelEffect(e.target.value)}
                      className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0f0c09))] px-3 py-2 text-[10px] text-[rgb(var(--sep-colour-d8c29b))] game_components_warpingpanel_select_select_2"
                    >
                      <option value="">Choose active effect...</option>
                      {dispelEffects.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.shape_name} · Level {e.shape_level} · {e.effect_nature}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))] game_components_warpingpanel_p_text_10">
                      This character has no active effect that this Level {s.level} Dispel can remove.
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-2 text-[9px] text-[rgb(var(--sep-colour-887865))]">
                  Choose the character whose active Shape effect you want to dispel.
                </p>
              )}
            </div>
          ) : null}

          {access &&
          !access.allowed ? (
            <div className="mt-3 border border-[rgb(var(--sep-colour-6f493f))]/60 bg-[rgb(var(--sep-colour-1b100d))] px-3 py-2 text-[9px] text-[rgb(var(--sep-colour-d58d82))] game_components_warpingpanel_div_container_13">
              Unavailable:{" "}
              {access.reasons.join(
                " · ",
              )}
            </div>
          ) : null}

          <button
            type="button"
            disabled={
              busy ||
              !access?.allowed ||
              (Boolean(
                s?.is_dispel,
              ) &&
                (!dispelTarget ||
                  !selectedDispelEffect))
            }
            onClick={() =>
              void warp()
            }
            className="mt-4 ml-auto block border border-[rgb(var(--sep-colour-9b7446))] bg-[rgb(var(--sep-colour-2a1d12))] px-5 py-2 text-[9px] uppercase text-[rgb(var(--sep-colour-ead1a3))] disabled:opacity-40 game_components_warpingpanel_button_action_2"
          >
            {busy
              ? "Warping..."
              : `Warp ${
                  s?.word_of_power ??
                  ""
                }`}
          </button>
        </>
      )}

      {msg ? (
        <p className="mt-3 text-[10px] text-[rgb(var(--sep-colour-c9b18a))] game_components_warpingpanel_p_text_11">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
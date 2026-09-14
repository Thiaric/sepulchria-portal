from pathlib import Path

FRONTEND = Path("components/forum/forum-topic-flag-button.tsx")
BACKEND = Path("app/(portal)/forum/flag-actions.ts")

for path in (FRONTEND, BACKEND):
    if not path.exists():
        raise SystemExit(f"Could not find {path}")

frontend = FRONTEND.read_text(encoding="utf-8")
backend = BACKEND.read_text(encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"{label}: expected exactly 1 match, found {count}. "
            "No files were written."
        )
    return text.replace(old, new, 1)


# ============================================================
# BACKEND — add Orders to recipient loading + secure resolution
# ============================================================

backend = replace_once(
    backend,
    '''  associationId: string | null;
  associationName: string | null;
  isFriend: boolean;''',
    '''  associationId: string | null;
  associationName: string | null;
  orderIds: string[];
  orderNames: string[];
  isFriend: boolean;''',
    "ForumFlagRecipient order fields",
)

backend = replace_once(
    backend,
    '''  characters: CharacterRow[];
  races: Map<string, string>;
  associations: Map<string, string>;
}> {''',
    '''  characters: CharacterRow[];
  races: Map<string, string>;
  associations: Map<string, string>;
  orderIdsByCharacter: Map<string, string[]>;
  orders: Map<string, string>;
}> {''',
    "getAccessibleCharacterRows return type",
)

backend = replace_once(
    backend,
    '''      characters: [],
      races: new Map(),
      associations: new Map(),
    };''',
    '''      characters: [],
      races: new Map(),
      associations: new Map(),
      orderIdsByCharacter: new Map(),
      orders: new Map(),
    };''',
    "empty accessible-character return",
)

backend = backend.replace(
    '''    .eq("status", "approved")
      .eq("is_system", false)
    .eq("is_system", false)''',
    '''    .eq("status", "approved")
    .eq("is_system", false)''',
    1,
)

marker = '''  const [
    raceResult,
    associationResult,
  ] = await Promise.all(['''

if marker not in backend:
    raise SystemExit(
        "Could not find the race/association lookup block. No files were written."
    )

order_lookup = '''  const accessibleCharacterIds =
    characters.map(
      (character) => character.id,
    );

  const orderMembershipResult =
    accessibleCharacterIds.length > 0
      ? await supabase
          .from("order_memberships")
          .select("character_id, order_id")
          .in(
            "character_id",
            accessibleCharacterIds,
          )
      : {
          data: [],
          error: null,
        };

  if (orderMembershipResult.error) {
    throw new Error(
      `Unable to load Order memberships: ${orderMembershipResult.error.message}`,
    );
  }

  const orderIdsByCharacter =
    new Map<string, string[]>();

  for (
    const row
    of orderMembershipResult.data ?? []
  ) {
    const characterId =
      String(row.character_id);

    const orderId =
      String(row.order_id);

    const current =
      orderIdsByCharacter.get(
        characterId,
      ) ?? [];

    if (!current.includes(orderId)) {
      current.push(orderId);
    }

    orderIdsByCharacter.set(
      characterId,
      current,
    );
  }

  const orderIds = Array.from(
    new Set(
      [...orderIdsByCharacter.values()]
        .flat(),
    ),
  );

  const orderResult =
    orderIds.length > 0
      ? await supabase
          .from("orders")
          .select("id, name")
          .in("id", orderIds)
      : {
          data: [],
          error: null,
        };

  if (orderResult.error) {
    throw new Error(
      `Unable to load Orders: ${orderResult.error.message}`,
    );
  }

'''

backend = backend.replace(marker, order_lookup + marker, 1)

backend = replace_once(
    backend,
    '''    associations: new Map(
      (
        (associationResult.data ??
          []) as NamedRow[]
      ).map((association) => [
        association.id,
        association.name,
      ]),
    ),
  };''',
    '''    associations: new Map(
      (
        (associationResult.data ??
          []) as NamedRow[]
      ).map((association) => [
        association.id,
        association.name,
      ]),
    ),
    orderIdsByCharacter,
    orders: new Map(
      (
        (orderResult.data ??
          []) as NamedRow[]
      ).map((order) => [
        order.id,
        order.name,
      ]),
    ),
  };''',
    "accessible-character Order return data",
)

backend = replace_once(
    backend,
    '''    characters: rawCharacters,
    races,
    associations,
  } =''',
    '''    characters: rawCharacters,
    races,
    associations,
    orderIdsByCharacter,
    orders,
  } =''',
    "recipient-loader destructuring",
)

backend = replace_once(
    backend,
    '''      associationName:
        character.association_id
          ? associations.get(
              character.association_id,
            ) ?? null
          : null,
      isFriend:''',
    '''      associationName:
        character.association_id
          ? associations.get(
              character.association_id,
            ) ?? null
          : null,
      orderIds:
        orderIdsByCharacter.get(
          character.id,
        ) ?? [],
      orderNames:
        (
          orderIdsByCharacter.get(
            character.id,
          ) ?? []
        )
          .map(
            (orderId) =>
              orders.get(orderId),
          )
          .filter(
            (
              name,
            ): name is string =>
              Boolean(name),
          )
          .sort((a, b) =>
            a.localeCompare(b),
          ),
      isFriend:''',
    "recipient Order names",
)

backend = replace_once(
    backend,
    '''    const selectedAssociationIds =
      new Set(
        values(
          formData,
          "associationIds",
        ),
      );

    if (''',
    '''    const selectedAssociationIds =
      new Set(
        values(
          formData,
          "associationIds",
        ),
      );

    const selectedOrderIds =
      new Set(
        values(
          formData,
          "orderIds",
        ),
      );

    if (''',
    "selected Order IDs",
)

backend = replace_once(
    backend,
    '''      selectedRaceIds.size === 0 &&
      selectedAssociationIds.size ===
        0''',
    '''      selectedRaceIds.size === 0 &&
      selectedAssociationIds.size ===
        0 &&
      selectedOrderIds.size === 0''',
    "empty-selection validation",
)

backend = replace_once(
    backend,
    '''    const {
      characters:
        accessibleCharacters,
    } =
      await getAccessibleCharacterRows(''',
    '''    const {
      characters:
        accessibleCharacters,
      orderIdsByCharacter:
        accessibleOrderIdsByCharacter,
    } =
      await getAccessibleCharacterRows(''',
    "secure accessible Order memberships",
)

backend = replace_once(
    backend,
    '''          (character.association_id !==
            null &&
            selectedAssociationIds.has(
              character.association_id,
            )),''',
    '''          (character.association_id !==
            null &&
            selectedAssociationIds.has(
              character.association_id,
            )) ||
          (
            accessibleOrderIdsByCharacter
              .get(character.id)
              ?.some((orderId) =>
                selectedOrderIds.has(
                  orderId,
                ),
              ) ?? false
          ),''',
    "recipient Order matching",
)


# ============================================================
# FRONTEND — compact Target Groups tabs
# ============================================================

frontend = replace_once(
    frontend,
    '''  const [
    selectedAssociations,
    setSelectedAssociations,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    state,''',
    '''  const [
    selectedAssociations,
    setSelectedAssociations,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    selectedOrders,
    setSelectedOrders,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    targetGroup,
    setTargetGroup,
  ] = useState<
    | "ancestries"
    | "associations"
    | "orders"
  >("ancestries");

  const [
    state,''',
    "frontend Order state",
)

frontend = replace_once(
    frontend,
    '''      setSelectedAssociations(
        new Set(),
      );
    }
  }, [state]);''',
    '''      setSelectedAssociations(
        new Set(),
      );

      setSelectedOrders(
        new Set(),
      );
    }
  }, [state]);''',
    "reset selected Orders",
)

assoc_end = '''    }, [characters]);

  const friends ='''

if assoc_end not in frontend:
    raise SystemExit(
        "Could not find the end of the Associations memo. No files were written."
    )

orders_memo = '''    }, [characters]);

  const orders =
    useMemo(() => {
      const map =
        new Map<
          string,
          string
        >();

      for (
        const character
        of characters
      ) {
        character.orderIds.forEach(
          (id, index) => {
            const name =
              character.orderNames[
                index
              ];

            if (id && name) {
              map.set(
                id,
                name,
              );
            }
          },
        );
      }

      return [...map]
        .map(
          ([id, name]) => ({
            id,
            name,
          }),
        )
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
          ),
        );
    }, [characters]);

  const friends ='''

frontend = frontend.replace(
    assoc_end,
    orders_memo,
    1,
)

frontend = replace_once(
    frontend,
    '''            character.raceName,
            character.associationName,
          ]''',
    '''            character.raceName,
            character.associationName,
            ...character.orderNames,
          ]''',
    "search includes Orders",
)

frontend = replace_once(
    frontend,
    '''          (character.associationId !==
            null &&
            selectedAssociations.has(
              character.associationId,
            )),
      ).length;''',
    '''          (character.associationId !==
            null &&
            selectedAssociations.has(
              character.associationId,
            )) ||
          character.orderIds.some(
            (orderId) =>
              selectedOrders.has(
                orderId,
              ),
          ),
      ).length;''',
    "resolved recipient count includes Orders",
)

frontend = replace_once(
    frontend,
    '''      selectedRaces,
      selectedAssociations,
    ]);''',
    '''      selectedRaces,
      selectedAssociations,
      selectedOrders,
    ]);''',
    "resolved-count dependencies",
)

frontend = replace_once(
    frontend,
    'placeholder="Search characters, ancestries or associations…"',
    'placeholder="Search characters, ancestries, associations or orders…"',
    "search placeholder",
)

old_groups = '''              <SelectionGroup
                title="Ancestries"
                options={races}
                selected={
                  selectedRaces
                }
                onToggle={(id) =>
                  toggle(
                    setSelectedRaces,
                    id,
                  )
                }
              />

              <SelectionGroup
                title="Associations"
                options={
                  associations
                }
                selected={
                  selectedAssociations
                }
                onToggle={(id) =>
                  toggle(
                    setSelectedAssociations,
                    id,
                  )
                }
              />'''

new_groups = '''              <section className="components_forum_forum_topic_flag_button_section_target_groups">
                <h3 className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))]">
                  Target Groups
                </h3>

                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: "ancestries" as const,
                      label: "Ancestries",
                      count:
                        selectedRaces.size,
                    },
                    {
                      id: "associations" as const,
                      label: "Associations",
                      count:
                        selectedAssociations.size,
                    },
                    {
                      id: "orders" as const,
                      label: "Orders",
                      count:
                        selectedOrders.size,
                    },
                  ].map((tab) => {
                    const active =
                      targetGroup ===
                      tab.id;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setTargetGroup(
                            tab.id,
                          )
                        }
                        className={[
                          "border px-2 py-2 text-[8px] uppercase tracking-[0.13em] transition",
                          active
                            ? "border-[rgb(var(--sep-colour-a47a45))] bg-[rgb(var(--sep-colour-342216))] text-[rgb(var(--sep-colour-e3c79a))]"
                            : "border-[rgb(var(--sep-colour-4f3b28))] bg-[rgb(var(--sep-colour-15100d))] text-[rgb(var(--sep-colour-89775f))] hover:border-[rgb(var(--sep-colour-765735))]",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {tab.label}
                        {tab.count > 0
                          ? ` · ${tab.count}`
                          : ""}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 border border-[rgb(var(--sep-colour-4e3a27))]/45 bg-[rgb(var(--sep-colour-0d0a08))]/45 p-2.5">
                  {targetGroup ===
                  "ancestries" ? (
                    <SelectionGroup
                      title=""
                      options={races}
                      selected={
                        selectedRaces
                      }
                      onToggle={(id) =>
                        toggle(
                          setSelectedRaces,
                          id,
                        )
                      }
                    />
                  ) : targetGroup ===
                    "associations" ? (
                    <SelectionGroup
                      title=""
                      options={
                        associations
                      }
                      selected={
                        selectedAssociations
                      }
                      onToggle={(id) =>
                        toggle(
                          setSelectedAssociations,
                          id,
                        )
                      }
                    />
                  ) : (
                    <SelectionGroup
                      title=""
                      options={orders}
                      selected={
                        selectedOrders
                      }
                      onToggle={(id) =>
                        toggle(
                          setSelectedOrders,
                          id,
                        )
                      }
                    />
                  )}
                </div>
              </section>'''

frontend = replace_once(
    frontend,
    old_groups,
    new_groups,
    "replace stacked groups with tabs",
)

frontend = replace_once(
    frontend,
    '''                              character.raceName,
                              character.associationName,
                            ]''',
    '''                              character.raceName,
                              character.associationName,
                              character.orderNames.length ===
                              0
                                ? null
                                : character.orderNames.length ===
                                    1
                                  ? character.orderNames[0]
                                  : `${character.orderNames[0]} +${character.orderNames.length - 1}`,
                            ]''',
    "character-card Order summary",
)

frontend = replace_once(
    frontend,
    '"No ancestry or association"}',
    '"No ancestry, association or Order"}',
    "character-card empty identity text",
)

frontend = replace_once(
    frontend,
    '''          {[
            ...selectedAssociations,
          ].map((id) => (
            <input className="components_forum_forum_topic_flag_button_input_association_ids"
              key={`a-${id}`}
              type="hidden"
              name="associationIds"
              value={id}
            />
          ))}

          <label''',
    '''          {[
            ...selectedAssociations,
          ].map((id) => (
            <input className="components_forum_forum_topic_flag_button_input_association_ids"
              key={`a-${id}`}
              type="hidden"
              name="associationIds"
              value={id}
            />
          ))}

          {[
            ...selectedOrders,
          ].map((id) => (
            <input
              className="components_forum_forum_topic_flag_button_input_order_ids"
              key={`o-${id}`}
              type="hidden"
              name="orderIds"
              value={id}
            />
          ))}

          <label''',
    "hidden Order IDs",
)

frontend = replace_once(
    frontend,
    '''      <h3 className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))] components_forum_forum_topic_flag_button_h3_heading">
        {title}
      </h3>

      <div''',
    '''      {title ? (
        <h3 className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-9b774b))] components_forum_forum_topic_flag_button_h3_heading">
          {title}
        </h3>
      ) : null}

      <div''',
    "optional SelectionGroup title",
)

BACKEND.write_text(backend, encoding="utf-8")
FRONTEND.write_text(frontend, encoding="utf-8")

print("Updated:")
print(f"  - {BACKEND}")
print(f"  - {FRONTEND}")
print()
print("Added:")
print("  - Orders as Flag for Reading targets")
print("  - Order-aware server-side recipient validation")
print("  - Order search + character identity display")
print("  - Compact Target Groups tabs: Ancestries / Associations / Orders")
print("  - Selection counts retained while switching tabs")
print()
print("No SQL migration is required.")
print("Next run: npm run build")

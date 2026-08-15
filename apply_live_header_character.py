
from pathlib import Path

ROOT = Path.cwd()

def load(rel):
    path = ROOT / rel
    if not path.exists():
        raise SystemExit(
            f"ERROR: Could not find {rel}. Run this script from the sepulchria-portal root."
        )
    return path, path.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(
            f"ERROR: Could not find expected code for {label}. "
            "Your file may have changed since the patch was prepared."
        )
    return text.replace(old, new, 1)

# 1) PortalHeader ----------------------------------------------------
rel = "components/portal/portal-header.tsx"
path, text = load(rel)

old = '''            {character ? (
              <HeaderCharacterIdentity
                character={character}
                initialPresenceStatus={presence?.status ?? "online"}
              />
            ) : (
              <Link
                href="/character/create"
                className="hidden text-[10px] uppercase tracking-[0.16em] text-[#c59a5a] md:block 2xl:text-xs 2xl:tracking-[0.18em]"
              >
                Create character
              </Link>
            )}
'''

new = '''            <HeaderCharacterIdentity
              userId={context.user.id}
              character={character}
              initialPresenceStatus={
                presence?.status ??
                "online"
              }
            />
'''

text = replace_once(
    text,
    old,
    new,
    "always-mounted header character identity",
)
path.write_text(text, encoding="utf-8")

# 2) HeaderCharacterIdentity ----------------------------------------
rel = "components/portal/header-character-identity.tsx"
path, text = load(rel)

text = replace_once(
    text,
    'import Link from "next/link";\n',
    'import Link from "next/link";\n'
    'import { useRouter } from "next/navigation";\n',
    "useRouter import",
)

text = replace_once(
    text,
    '''type HeaderCharacterIdentityProps = {
  character: PortalCharacter;
  initialPresenceStatus: PortalPresenceStatus;
};
''',
    '''type HeaderCharacterIdentityProps = {
  userId: string;
  character: PortalCharacter | null;
  initialPresenceStatus: PortalPresenceStatus;
};
''',
    "nullable character props",
)

text = replace_once(
    text,
    '''export function HeaderCharacterIdentity({
  character,
  initialPresenceStatus,
}: HeaderCharacterIdentityProps) {
''',
    '''export function HeaderCharacterIdentity({
  userId,
  character,
  initialPresenceStatus,
}: HeaderCharacterIdentityProps) {
  const router = useRouter();
''',
    "userId prop and router",
)

anchor = '''  useEffect(() => {
    setPresenceStatus(
      initialPresenceStatus,
    );
  }, [initialPresenceStatus]);

'''

replacement = '''  useEffect(() => {
    setPresenceStatus(
      initialPresenceStatus,
    );
  }, [initialPresenceStatus]);

  useEffect(() => {
    const supabase =
      createClient();

    let cancelled = false;
    let initialised = false;
    let lastId: string | null =
      character?.id ?? null;
    let lastUpdatedAt: string | null =
      null;

    async function checkCharacterRecord() {
      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(
          "id, updated_at",
        )
        .eq(
          "user_id",
          userId,
        )
        .maybeSingle();

      if (
        cancelled ||
        error
      ) {
        if (error) {
          console.error(
            "Unable to refresh header character identity:",
            error.message,
          );
        }

        return;
      }

      const nextId =
        data?.id ?? null;
      const nextUpdatedAt =
        data?.updated_at ?? null;

      if (!initialised) {
        initialised = true;

        const identityChanged =
          nextId !== lastId;

        lastId = nextId;
        lastUpdatedAt =
          nextUpdatedAt;

        if (identityChanged) {
          router.refresh();
        }

        return;
      }

      if (
        nextId !== lastId ||
        nextUpdatedAt !==
          lastUpdatedAt
      ) {
        lastId = nextId;
        lastUpdatedAt =
          nextUpdatedAt;

        router.refresh();
      }
    }

    void checkCharacterRecord();

    const channel =
      supabase
        .channel(
          `header-character-record-${userId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "characters",
            filter:
              `user_id=eq.${userId}`,
          },
          (payload) => {
            const next =
              payload.new as {
                id?: string;
                updated_at?: string;
              };

            if (next?.id) {
              lastId =
                next.id;
            }

            if (
              next?.updated_at
            ) {
              lastUpdatedAt =
                next.updated_at;
            }

            router.refresh();
          },
        )
        .subscribe();

    const interval =
      window.setInterval(
        () => {
          void checkCharacterRecord();
        },
        5000,
      );

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void checkCharacterRecord();
      }
    }

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval,
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [
    character?.id,
    router,
    userId,
  ]);

'''

text = replace_once(
    text,
    anchor,
    replacement,
    "live character record effect",
)

text = replace_once(
    text,
    '''  useEffect(() => {
    const supabase =
      createClient();

    const channel = supabase
''',
    '''  useEffect(() => {
    if (!character) {
      return;
    }

    const supabase =
      createClient();

    const channel = supabase
''',
    "presence null guard",
)

text = replace_once(
    text,
    '''  }, [character.id]);

  async function changePresence(
''',
    '''  }, [character?.id]);

  async function changePresence(
''',
    "presence dependency",
)

text = replace_once(
    text,
    '''  ) {
    if (
      saving ||
      nextStatus === presenceStatus
    ) {
''',
    '''  ) {
    if (
      !character ||
      saving ||
      nextStatus === presenceStatus
    ) {
''',
    "changePresence null guard",
)

text = replace_once(
    text,
    '''  const presence =
    PRESENCE_STYLES[
      presenceStatus
    ];

  return (
''',
    '''  if (!character) {
    return (
      <Link
        href="/character/create"
        className="hidden text-[10px] uppercase tracking-[0.16em] text-[#c59a5a] md:block 2xl:text-xs 2xl:tracking-[0.18em]"
      >
        Create character
      </Link>
    );
  }

  const presence =
    PRESENCE_STYLES[
      presenceStatus
    ];

  return (
''',
    "create character live fallback",
)

path.write_text(text, encoding="utf-8")

# 3) HeaderOrderIcon -------------------------------------------------
rel = "components/portal/header-order-icon.tsx"
path, text = load(rel)

old_effect = '''  useEffect(() => {
    let cancelled = false;

    async function loadOrder() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("order_memberships")
        .select(`
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            icon_url
          )
        `)
        .eq(
          "character_id",
          characterId,
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load header Order icon:",
          error.message,
        );

        setOrder(null);
        return;
      }

      setOrder(
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null,
      );
    }

    void loadOrder();

    return () => {
      cancelled = true;
    };
  }, [characterId]);
'''

new_effect = '''  useEffect(() => {
    let cancelled = false;

    const supabase =
      createClient();

    async function loadOrder() {
      const {
        data,
        error,
      } = await supabase
        .from("order_memberships")
        .select(`
          order:orders!order_memberships_order_id_fkey(
            id,
            name,
            icon_url
          )
        `)
        .eq(
          "character_id",
          characterId,
        )
        .limit(1)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error) {
        console.error(
          "Unable to load header Order icon:",
          error.message,
        );

        setOrder(null);
        return;
      }

      setOrder(
        data
          ? one(
              data.order as Relation<OrderIdentity>,
            )
          : null,
      );
    }

    void loadOrder();

    const channel =
      supabase
        .channel(
          `header-order-membership-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "order_memberships",
            filter:
              `character_id=eq.${characterId}`,
          },
          () => {
            void loadOrder();
          },
        )
        .subscribe();

    const interval =
      window.setInterval(
        () => {
          void loadOrder();
        },
        5000,
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval,
      );

      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId]);
'''

text = replace_once(
    text,
    old_effect,
    new_effect,
    "live Order icon",
)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("Updated:")
print("  - components/portal/portal-header.tsx")
print("  - components/portal/header-character-identity.tsx")
print("  - components/portal/header-order-icon.tsx")
print()
print("Now run: npm run build")

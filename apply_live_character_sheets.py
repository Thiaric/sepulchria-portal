
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
            "Your repository may have changed since this patch was prepared."
        )
    return text.replace(old, new, 1)

# 1) Shared live sheet refresher
component_rel = "components/characters/live-character-sheet-refresh.tsx"
component_path = ROOT / component_rel
component_path.parent.mkdir(parents=True, exist_ok=True)

component = '''"use client";

import {
  useEffect,
  useRef,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type LiveCharacterSheetRefreshProps = {
  characterId: string;
  raceId?: string | null;
};

export function LiveCharacterSheetRefresh({
  characterId,
  raceId = null,
}: LiveCharacterSheetRefreshProps) {
  const router = useRouter();

  const refreshTimerRef =
    useRef<ReturnType<
      typeof window.setTimeout
    > | null>(null);

  useEffect(() => {
    const supabase =
      createClient();

    let disposed = false;

    function refreshSheet() {
      if (disposed) {
        return;
      }

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      refreshTimerRef.current =
        window.setTimeout(
          () => {
            if (!disposed) {
              router.refresh();
            }
          },
          150,
        );
    }

    const channels = [
      supabase
        .channel(
          `live-sheet-character-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "characters",
            filter:
              `id=eq.${characterId}`,
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-membership-${characterId}`,
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
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-order-levels-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_levels",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-order-jobs-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "order_jobs",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-orders-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "orders",
          },
          refreshSheet,
        )
        .subscribe(),

      supabase
        .channel(
          `live-sheet-associations-${characterId}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "associations",
          },
          refreshSheet,
        )
        .subscribe(),
    ];

    if (raceId) {
      channels.push(
        supabase
          .channel(
            `live-sheet-race-${raceId}-${characterId}`,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "races",
              filter:
                `id=eq.${raceId}`,
            },
            refreshSheet,
          )
          .subscribe(),
      );
    }

    const fallbackInterval =
      window.setInterval(
        () => {
          if (!disposed) {
            router.refresh();
          }
        },
        10000,
      );

    function refreshWhenVisible() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshSheet();
      }
    }

    document.addEventListener(
      "visibilitychange",
      refreshWhenVisible,
    );

    return () => {
      disposed = true;

      window.clearInterval(
        fallbackInterval,
      );

      if (
        refreshTimerRef.current
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );

      for (
        const channel of channels
      ) {
        void supabase.removeChannel(
          channel,
        );
      }
    };
  }, [
    characterId,
    raceId,
    router,
  ]);

  return null;
}
'''

component_path.write_text(
    component,
    encoding="utf-8",
)

# 2) Own character sheet
own_rel = "app/(portal)/character/page.tsx"
own_path, own = load(own_rel)

own = replace_once(
    own,
    'import { CharacterHealthDisplay } from "@/components/characters/character-health-display";\n',
    'import { CharacterHealthDisplay } from "@/components/characters/character-health-display";\n'
    'import { LiveCharacterSheetRefresh } from "@/components/characters/live-character-sheet-refresh";\n',
    "own sheet live refresher import",
)

old_return = '''  return (
    <Profile
      character={
        characterWithEffectiveAttributes as unknown as CharacterProfile
      }
      own
      notice={notice}
    />
  );
}
'''

new_return = '''  const liveRace =
    normaliseRelation(
      character.race as
        | CodexRelation
        | CodexRelation[]
        | null,
    );

  return (
    <>
      <LiveCharacterSheetRefresh
        characterId={character.id}
        raceId={liveRace?.id ?? null}
      />

      <Profile
        character={
          characterWithEffectiveAttributes as unknown as CharacterProfile
        }
        own
        notice={notice}
      />
    </>
  );
}
'''

own = replace_once(
    own,
    old_return,
    new_return,
    "own character live sheet wrapper",
)

own_path.write_text(
    own,
    encoding="utf-8",
)

# 3) Public character sheet
public_rel = "app/(portal)/characters/[slug]/page.tsx"
public_path, public = load(public_rel)

public = replace_once(
    public,
    'import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";\n',
    'import { PublicCharacterProfileView } from "@/components/characters/public-character-profile";\n'
    'import { LiveCharacterSheetRefresh } from "@/components/characters/live-character-sheet-refresh";\n',
    "public sheet live refresher import",
)

public = replace_once(
    public,
    '''  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <PublicCharacterProfileView
''',
    '''  return (
    <div className="mx-auto w-full max-w-7xl p-6">
      <LiveCharacterSheetRefresh
        characterId={character.id}
        raceId={
          character.race?.id ??
          null
        }
      />

      <PublicCharacterProfileView
''',
    "public character live sheet wrapper",
)

public_path.write_text(
    public,
    encoding="utf-8",
)

print("SUCCESS")
print("Created/updated:")
print(f"  - {component_rel}")
print(f"  - {own_rel}")
print(f"  - {public_rel}")
print()
print("Now run: npm run build")

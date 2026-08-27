"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  usePathname,
  useSearchParams,
} from "next/navigation";

import { GameContextPanel } from "@/components/portal/game-context-panel";
import {
  enterRoomFromMap,
} from "@/app/(portal)/game/actions";
import { LiveDashboardChronicle } from "@/components/portal/live-dashboard-chronicle";
import { MessagesContextNavigator } from "@/components/messages/messages-context-navigator";
import {
  createForumReplyAction,
  type CreateForumReplyState,
} from "@/app/(portal)/forum/actions";
import { createClient } from "@/lib/supabase/client";
import type { PortalContext } from "@/types/portal";
import {
  ForumSectionsNavigatorContext,
  ForumTopicsNavigatorContext,
  ForumTopicNavigatorContext,
} from "@/components/portal/forum-navigation-context";
import { AdminOrdersContext } from "@/components/portal/admin-orders-context";
import { OrderSubmissionsContext } from "@/components/admin/order-submissions-context";
import { AdminRulesContext } from "@/components/portal/admin-rules-context";
import { CharacterOrderContext } from "@/components/portal/character-order-context";
import { OrderLeadershipContext } from "@/components/portal/order-leadership-context";
import { TicketContextPanel } from "@/components/support/ticket-context-panel";
import { SanctionContextPanel } from "@/components/sanctions/sanction-context-panel";
import {
  shapeSchoolBorderClass,
} from "@/lib/warping/shape-school-style";


type PortalContextPanelProps = {
  context: PortalContext;
};

export function PortalContextPanel({
  context,
}: PortalContextPanelProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === "/") {
    return <DashboardContext context={context} />;
  }

  if (pathname === "/support" || pathname.startsWith("/support/")) {
    const match = pathname.match(/^\/support\/([^/]+)$/);
    const reference = match && match[1] !== "new" ? decodeURIComponent(match[1]) : undefined;
    return <TicketContextPanel reference={reference} />;
  }

  if (pathname === "/sanctions") {
    return <SanctionContextPanel />;
  }

  if (
    pathname === "/game" ||
    pathname.startsWith("/game/")
  ) {
    return <GameContext context={context} />;
  }

  if (
    pathname === "/character" ||
    pathname.startsWith("/character/")
  ) {
    return <CharacterContext context={context} />;
  }

 if (pathname === "/characters") {
  return <CharacterArchiveContext />;
}

if (pathname === "/friends") {
  return <FriendListContext />;
}

const publicCharacterMatch =
  pathname.match(
    /^\/characters\/([^/]+)$/,
  );

if (publicCharacterMatch) {
  return (
    <PublicCharacterContext
      publicSlug={decodeURIComponent(
        publicCharacterMatch[1],
      )}
    />
  );
}

  if (pathname === "/ancestries") {
  return (
    <PublicCodexJumpContext
      table="races"
      title="Ancestries"
      eyebrow="Codex"
      anchorPrefix="race"
    />
  );
}

if (
  pathname.startsWith(
    "/ancestries/",
  )
) {
  return (
    <PublicCodexEntryNavigator
      table="races"
      title="Ancestries"
      eyebrow="Codex"
      description="The peoples and lineages of Aureth, their origins and their relationship with the Current."
      baseHref="/ancestries"
      currentSlug={decodeURIComponent(
        pathname.split("/")[2] ?? "",
      )}
      itemLabel="ancestry"
    />
  );
}

if (
  pathname ===
  "/associations"
) {
  return (
    <PublicCodexJumpContext
      table="associations"
      title="Associations"
      eyebrow="Codex"
      anchorPrefix="association"
    />
  );
}

if (
  pathname.startsWith(
    "/associations/",
  )
) {
  return (
    <PublicCodexEntryNavigator
      table="associations"
      title="Associations"
      eyebrow="Codex"
      description="The civic bodies that shape Sepulchria's professions, laws, beliefs and daily life."
      baseHref="/associations"
      currentSlug={decodeURIComponent(
        pathname.split("/")[2] ?? "",
      )}
      itemLabel="association"
    />
  );
}

if (
  pathname ===
  "/orders"
) {
  return (
    <PublicCodexJumpContext
      table="orders"
      title="Orders"
      eyebrow="Codex"
      anchorPrefix="order"
    />
  );
}

if (
  pathname ===
  "/orders/manage"
) {
  return (
    <OrderLeadershipContext />
  );
}


const publicOrderMatch =
  pathname.match(
    /^\/orders\/([^/]+)$/,
  );

if (
  publicOrderMatch &&
  decodeURIComponent(
    publicOrderMatch[1],
  ) !== "manage"
) {
  return (
    <PublicCodexEntryNavigator
      table="orders"
      title="Orders"
      eyebrow="Codex"
      description="The specialised Orders of Sepulchria, their disciplines, ranks, roles and place within the Associations."
      baseHref="/orders"
      currentSlug={decodeURIComponent(
        publicOrderMatch[1],
      )}
      itemLabel="order"
    />
  );
}


  if (pathname === "/admin/races") {
    return (
      <AdminCodexJumpContext
        table="races"
        itemLabel="ancestry"
        pluralLabel="ancestries"
        anchorPrefix="race"
        createAnchor="race-new"
        createLabel="Create new ancestry"
        eyebrow="Ancestry management"
      />
    );
  }

  if (pathname === "/admin/associations") {
    return (
      <AdminCodexJumpContext
        table="associations"
        itemLabel="association"
        pluralLabel="associations"
        anchorPrefix="association"
        createAnchor="association-new"
        createLabel="Create new association"
        eyebrow="Association management"
      />
    );
  }

  if (pathname === "/admin/orders") {
    return <AdminOrdersContext />;
  }

  if (pathname === "/admin/order-submissions") {
    return <OrderSubmissionsContext />;
  }

  if (pathname === "/feats") {
    return <PublicGiftsContext />;
  }

  if (pathname === "/warping") {
    return <PublicShapesContext />;
  }

  if (pathname === "/admin/gifts") {
    return <AdminGiftsContext />;
  }

  if (pathname === "/admin/rules") {
    return <AdminRulesContext />;
  }


  const adminCharacterMatch =
    pathname.match(
      /^\/admin\/characters\/([0-9a-f-]+)$/i,
    );

  if (adminCharacterMatch) {
    return (
      <AdminCharacterHistoryContext
        characterId={
          adminCharacterMatch[1]
        }
      />
    );
  }

  if (pathname === "/forum") {
    return <ForumSectionsNavigatorContext />;
  }

  const forumTopicMatch =
    pathname.match(
      /^\/forum\/([^/]+)\/([^/]+)$/,
    );

  if (forumTopicMatch) {
    return (
      <ForumTopicNavigatorContext
        sectionSlug={decodeURIComponent(
          forumTopicMatch[1],
        )}
        topicSlug={decodeURIComponent(
          forumTopicMatch[2],
        )}
      />
    );
  }

  const forumSectionMatch =
    pathname.match(
      /^\/forum\/([^/]+)$/,
    );

  if (forumSectionMatch) {
    return (
      <ForumTopicsNavigatorContext
        sectionSlug={decodeURIComponent(
          forumSectionMatch[1],
        )}
      />
    );
  }

  if (
    pathname ===
    "/private-locations"
  ) {
    return (
      <PrivateLocationsContext
        context={context}
      />
    );
  }

  const areaMatch =
    pathname.match(
      /^\/areas\/([^/]+)$/,
    );

  if (areaMatch) {
    return (
      <AreaContext
        areaSlug={decodeURIComponent(
          areaMatch[1],
        )}
      />
    );
  }

  if (
    pathname === "/messages" ||
    pathname.startsWith("/messages/")
  ) {
    return <MessagesContext context={context} />;
  }

  return <DefaultContext />;
}

type FriendListContextEntry = {
  id: string;
  name: string;
};

function FriendListContext() {
  const [entries, setEntries] =
    useState<FriendListContextEntry[]>([]);
  const [search, setSearch] =
    useState("");
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFriends() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const {
        data: character,
        error: characterError,
      } = await supabase
        .from("characters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (characterError) {
        setError(characterError.message);
        setLoading(false);
        return;
      }

      if (!character) {
        setEntries([]);
        setLoading(false);
        return;
      }

      const {
        data: friendRows,
        error: friendError,
      } = await supabase
        .from("character_friend_entries")
        .select("target_character_id")
        .eq("owner_character_id", character.id);

      if (cancelled) {
        return;
      }

      if (friendError) {
        setError(friendError.message);
        setLoading(false);
        return;
      }

      const targetIds = Array.from(
        new Set(
          (friendRows ?? []).map(
            (row) =>
              String(row.target_character_id),
          ),
        ),
      );

      if (targetIds.length === 0) {
        setEntries([]);
        setError(null);
        setLoading(false);
        return;
      }

      const {
        data: characters,
        error: targetsError,
      } = await supabase
        .from("characters")
        .select(
          "id, display_name, first_name, surname",
        )
        .in("id", targetIds)
        .eq("is_system", false);

      if (cancelled) {
        return;
      }

      if (targetsError) {
        setError(targetsError.message);
        setLoading(false);
        return;
      }

      const mapped = (characters ?? [])
        .map((entry) => {
          const name =
            entry.display_name?.trim() ||
            `${entry.first_name ?? ""} ${entry.surname ?? ""}`.trim() ||
            "Unknown";

          return {
            id: String(entry.id),
            name,
          };
        })
        .sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "en",
            { sensitivity: "base" },
          ),
        );

      setEntries(mapped);
      setError(null);
      setLoading(false);
    }

    void loadFriends();

    return () => {
      cancelled = true;
    };
  }, []);

  const query =
    search.trim().toLocaleLowerCase();

  const filteredEntries =
    entries.filter(
      (entry) =>
        !query ||
        entry.name
          .toLocaleLowerCase()
          .includes(query),
    );

  function jumpToFriend(
    characterId: string,
  ) {
    const element =
      document.getElementById(
        `friend-${characterId}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#friend-${characterId}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Contacts"
        title="Friend List"
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Search your contacts and move directly to their entry.
      </p>

      <input
        type="search"
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search friends..."
        className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none"
      />

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">
        Friends · {filteredEntries.length}
      </p>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {loading ? (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            Loading friends...
          </p>
        ) : error ? (
          <p className="text-xs text-[rgb(var(--sep-colour-c58d82))]">
            Unable to load Friend List.
          </p>
        ) : filteredEntries.length > 0 ? (
          filteredEntries.map(
            (entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpToFriend(entry.id)
                }
                className="flex w-full items-center justify-between border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8a673f))]"
              >
                <span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">
                  {entry.name}
                </span>
                <span className="text-[rgb(var(--sep-colour-725a3d))]">
                  →
                </span>
              </button>
            ),
          )
        ) : (
          <p className="text-xs text-[rgb(var(--sep-colour-8f826f))]">
            No friends found.
          </p>
        )}
      </div>
    </div>
  );
}

type PublicShapeContextEntry={
  id:string;
  name:string;
  school:string;
};
function PublicShapesContext(){const [entries,setEntries]=useState<PublicShapeContextEntry[]>([]);const [search,setSearch]=useState("");const [visible,setVisible]=useState<Set<string>|null>(null);useEffect(()=>{const apply=(ids:unknown)=>{if(Array.isArray(ids))setVisible(new Set(ids.map(String)))};const stored=sessionStorage.getItem("sepulchria:shapes-visible-ids");if(stored)try{apply(JSON.parse(stored))}catch{};const h=(e:Event)=>apply((e as CustomEvent<{ids?:string[]}>).detail?.ids);window.addEventListener("sepulchria:shapes-filter-change",h);return()=>window.removeEventListener("sepulchria:shapes-filter-change",h)},[]);useEffect(()=>{let c=false;(async()=>{const db=createClient();const {data}=await db.from("shapes").select("id,name,school").eq("is_active",true).order("level").order("name");if(!c)setEntries((data??[]).map(x=>({
  id:String(x.id),
  name:String(x.name),
  school:String(x.school??""),
})))})();return()=>{c=true}},[]);const q=search.trim().toLowerCase();const page=visible===null?entries:entries.filter(x=>visible.has(x.id));const filtered=page.filter(x=>!q||x.name.toLowerCase().includes(q));const jump=(id:string)=>{const el=document.getElementById(`shape-${id}`);if(el){el.scrollIntoView({behavior:"smooth",block:"start"});window.history.replaceState(null,"",`#shape-${id}`)}};return <div className="flex h-full min-h-0 flex-col"><ContextHeading eyebrow="Codex" title="Warping"/><p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">Search Shapes and jump directly to a definition.</p><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search Shapes..." className="mt-4 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none"/><div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35"/><p className="mb-2 text-[8px] uppercase tracking-[.18em] text-[rgb(var(--sep-colour-806b50))]">Jump to Shape · {filtered.length}</p><div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">{filtered.map(x=><button key={x.id} type="button" onClick={()=>jump(x.id)} className={`flex w-full items-center justify-between border bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition-[border-color,box-shadow] duration-200 ${shapeSchoolBorderClass(x.school)}`}><span className="truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))]">{x.name}</span><span className="text-[rgb(var(--sep-colour-725a3d))]">→</span></button>)}</div></div>}

type PublicGiftContextEntry = {
  id: string;
  name: string;
};

function PublicGiftsContext() {
  const [entries, setEntries] =
    useState<PublicGiftContextEntry[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    visibleGiftIds,
    setVisibleGiftIds,
  ] = useState<Set<string> | null>(
    null,
  );

  useEffect(() => {
    function applyVisibleIds(
      ids: unknown,
    ) {
      if (!Array.isArray(ids)) {
        return;
      }

      setVisibleGiftIds(
        new Set(
          ids.map((id) =>
            String(id),
          ),
        ),
      );
    }

    const stored =
      sessionStorage.getItem(
        "sepulchria:gifts-visible-ids",
      );

    if (stored) {
      try {
        applyVisibleIds(
          JSON.parse(stored),
        );
      } catch {
        sessionStorage.removeItem(
          "sepulchria:gifts-visible-ids",
        );
      }
    }

    function handleFilterChange(
      event: Event,
    ) {
      const customEvent =
        event as CustomEvent<{
          ids?: string[];
        }>;

      applyVisibleIds(
        customEvent.detail?.ids,
      );
    }

    window.addEventListener(
      "sepulchria:gifts-filter-change",
      handleFilterChange,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:gifts-filter-change",
        handleFilterChange,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGifts() {
      const supabase = createClient();

      const { data, error } =
        await supabase
          .from("gifts")
          .select(
            "id, name, sort_order",
          )
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          });

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((gift) => ({
          id: String(gift.id),
          name: String(gift.name),
        })),
      );

      setError(null);
      setLoading(false);
    }

    void loadGifts();

    return () => {
      cancelled = true;
    };
  }, []);

  const query =
    search.trim().toLowerCase();

  const pageFilteredEntries =
    visibleGiftIds === null
      ? entries
      : entries.filter((entry) =>
          visibleGiftIds.has(
            entry.id,
          ),
        );

  const filteredEntries =
    pageFilteredEntries.filter(
      (entry) =>
        !query ||
        entry.name
          .toLowerCase()
          .includes(query),
    );

  function jumpToGift(
    giftId: string,
  ) {
    const element =
      document.getElementById(
        `gift-${giftId}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Codex"
        title="Feats"
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Search the active Feats and
        jump directly to a definition.
      </p>

      <label className="mt-4 block">
        <span className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
          Search Feats
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Name..."
          className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
        />
      </label>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Jump to Feat
        </p>

        <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))]">
          {filteredEntries.length}
          {(query ||
            pageFilteredEntries.length !==
              entries.length)
            ? ` / ${entries.length}`
            : ""}
        </span>
      </div>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The Feat list could not
          be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredEntries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jumpToGift(
                      entry.id,
                    )
                  }
                  className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.name}
                  </span>

                  <span
                    aria-hidden="true"
                    className="text-[9px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
                  >
                    →
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        filteredEntries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No Feats match this
            search.
          </p>
        ) : null}
      </div>
    </div>
  );
}

type AdminGiftContextEntry = {
  id: string;
  name: string;
  is_active: boolean;
};

function AdminGiftsContext() {
  const [entries, setEntries] =
    useState<AdminGiftContextEntry[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadGifts() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("gifts")
        .select("id, name, is_active, sort_order")
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((gift) => ({
          id: String(gift.id),
          name: String(gift.name),
          is_active: Boolean(gift.is_active),
        })),
      );

      setError(null);
      setLoading(false);
    }

    void loadGifts();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalisedSearch =
    search.trim().toLowerCase();

  const filteredEntries =
    entries.filter(
      (entry) =>
        !normalisedSearch ||
        entry.name
          .toLowerCase()
          .includes(normalisedSearch),
    );

  function jumpToGift(giftId: string) {
    const element =
      document.getElementById(
        `gift-${giftId}`,
      );

    if (!element) {
      return;
    }

    if (
      element instanceof
      HTMLDetailsElement
    ) {
      element.open = true;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#gift-${giftId}`,
    );
  }

  function jumpToCreate() {
    const element =
      document.getElementById(
        "gift-new",
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      "#gift-new",
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Administration"
        title="Gifts"
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Jump directly to a Feat
        definition.
      </p>

      <button
        type="button"
        onClick={jumpToCreate}
        className="mt-4 flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21180f))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:bg-[rgb(var(--sep-colour-2b1f14))]"
      >
        <span className="text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-d2b383))]">
          Create new Feat
        </span>

        <span
          aria-hidden="true"
          className="text-[rgb(var(--sep-colour-8d6b43))]"
        >
          +
        </span>
      </button>

      <div className="mt-4">
        <label className="block">
          <span className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
            Search
          </span>

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search Feats..."
            className="mt-2 w-full border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d4bea0))] outline-none placeholder:text-[rgb(var(--sep-colour-665b4d))] focus:border-[rgb(var(--sep-colour-987344))]"
          />
        </label>
      </div>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">
          Created Feats
        </p>

        <span className="text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-6f6353))]">
          {filteredEntries.length}
          {normalisedSearch
            ? ` / ${entries.length}`
            : ""}
        </span>
      </div>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The Feat list could not
          be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 8,
            }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredEntries.map(
              (entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() =>
                    jumpToGift(
                      entry.id,
                    )
                  }
                  className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/35 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0 truncate font-serif text-[13px] text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {entry.name}
                  </span>

                  <span className="flex shrink-0 items-center gap-2">
                    {!entry.is_active ? (
                      <span className="text-[6px] uppercase tracking-[0.1em] text-[rgb(var(--sep-colour-6f6353))]">
                        Inactive
                      </span>
                    ) : null}

                    <span
                      aria-hidden="true"
                      className="text-[9px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
                    >
                      →
                    </span>
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        filteredEntries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No Feats match this
            search.
          </p>
        ) : null}
      </div>
    </div>
  );
}

type PublicCodexJumpEntry = {
  id: string;
  name: string;
  slug: string;
};

function PublicCodexEntryNavigator({
  table,
  title,
  eyebrow,
  description,
  baseHref,
  currentSlug,
  itemLabel,
}: {
  table:
    | "races"
    | "associations"
    | "orders";
  title: string;
  eyebrow: string;
  description: string;
  baseHref: string;
  currentSlug: string;
  itemLabel: string;
}) {
  const [entries, setEntries] =
    useState<PublicCodexJumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from(table)
        .select("id, name, slug, sort_order")
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? [])
          .map((entry) => ({
            id: String(entry.id),
            name: String(entry.name),
            slug: String(entry.slug),
          }))
          .filter(
            (entry) =>
              entry.slug !== currentSlug,
          ),
      );

      setError(null);
      setLoading(false);
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [table, currentSlug]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow={eyebrow}
        title={title}
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        {description}
      </p>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <p className="mb-3 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
        Other {title.toLowerCase()}
      </p>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The list could not be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Link
                key={entry.id}
                href={`${baseHref}/${entry.slug}`}
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
              >
                <span className="min-w-0 truncate font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.name}
                </span>

                <span
                  aria-hidden="true"
                  className="shrink-0 text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No other active {itemLabel} entries
            are currently available.
          </p>
        ) : null}
      </div>

      <Link
        href={baseHref}
        className="mt-4 flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-765937))]/45 bg-[rgb(var(--sep-colour-17100c))] px-3 py-3 text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9d8869))] transition hover:border-[rgb(var(--sep-colour-987344))] hover:text-[rgb(var(--sep-colour-d6b786))]"
      >
        <span>
          View all {title.toLowerCase()}
        </span>
        <span aria-hidden="true">
          ↗
        </span>
      </Link>
    </div>
  );
}

function PublicCodexJumpContext({
  table,
  title,
  eyebrow,
  anchorPrefix,
}: {
  table:
    | "races"
    | "associations"
    | "orders";
  title: string;
  eyebrow: string;
  anchorPrefix: string;
}) {
  const [entries, setEntries] =
    useState<
      PublicCodexJumpEntry[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from(table)
        .select(
          "id, name, slug, sort_order",
        )
        .eq(
          "is_active",
          true,
        )
        .order(
          "sort_order",
          {
            ascending: true,
          },
        )
        .order(
          "name",
          {
            ascending: true,
          },
        );

      if (cancelled) {
        return;
      }

      if (error) {
        setError(
          error.message,
        );

        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map(
          (entry) => ({
            id: String(
              entry.id,
            ),
            name: String(
              entry.name,
            ),
            slug: String(
              entry.slug,
            ),
          }),
        ),
      );

      setError(null);
      setLoading(false);
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [table]);

  function jumpTo(
    slug: string,
  ) {
    const anchor =
      `${anchorPrefix}-${slug}`;

    const element =
      document.getElementById(
        anchor,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#${anchor}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow={eyebrow}
        title={title}
      />

      <p className="mb-4 text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Jump directly to an
        entry.
      </p>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The list could not be
          loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map(
              (entry) => (
                <button
                  key={
                    entry.id
                  }
                  type="button"
                  onClick={() =>
                    jumpTo(
                      entry.slug,
                    )
                  }
                  className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="min-w-0 truncate font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {
                      entry.name
                    }
                  </span>

                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
                  >
                    ↓
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No active entries
            are currently
            available.
          </p>
        ) : null}
      </div>
    </div>
  );
}

type AdminCodexJumpEntry = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

function AdminCodexJumpContext({
  table,
  itemLabel,
  pluralLabel,
  anchorPrefix,
  createAnchor,
  createLabel,
  eyebrow,
}: {
  table: "races" | "associations";
  itemLabel: string;
  pluralLabel: string;
  anchorPrefix: string;
  createAnchor: string;
  createLabel: string;
  eyebrow: string;
}) {
  const [entries, setEntries] =
    useState<AdminCodexJumpEntry[]>([]);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from(table)
        .select(
          "id, name, slug, is_active, sort_order",
        )
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setEntries(
        (data ?? []).map((entry) => ({
          id: String(entry.id),
          name: String(entry.name),
          slug: String(entry.slug),
          is_active:
            entry.is_active === true,
        })),
      );
      setError(null);
      setLoading(false);
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, [table]);

  function jumpTo(anchor: string) {
    const element =
      document.getElementById(anchor);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#${anchor}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow={eyebrow}
        title="Jump to entry"
      />

      <p className="mb-4 text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Jump directly to the {itemLabel} you
        want to edit.
      </p>

      <button
        type="button"
        onClick={() =>
          jumpTo(createAnchor)
        }
        className="mb-4 flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-271c12))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-9a7445))] hover:bg-[rgb(var(--sep-colour-342318))]"
      >
        <span className="text-[9px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-d6b37d))]">
          {createLabel}
        </span>

        <span className="text-sm text-[rgb(var(--sep-colour-a88451))]">
          +
        </span>
      </button>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The list could not be loaded:
          {" "}
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() =>
                  jumpTo(
                    `${anchorPrefix}-${entry.slug}`,
                  )
                }
                className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
              >
                <span className="min-w-0 truncate font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                  {entry.name}
                </span>

                <span
                  aria-label={
                    entry.is_active
                      ? "Active"
                      : "Inactive"
                  }
                  title={
                    entry.is_active
                      ? "Active"
                      : "Inactive"
                  }
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    entry.is_active
                      ? "bg-emerald-600"
                      : "bg-[rgb(var(--sep-colour-66594b))]"
                  }`}
                />
              </button>
            ))}
          </div>
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No {pluralLabel} have been
            created yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

type CharacterStatusHistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
};

type AdminCharacterSummary = {
  display_name: string | null;
  first_name: string;
  surname: string;
};

function AdminCharacterHistoryContext({
  characterId,
}: {
  characterId: string;
}) {
  const [entries, setEntries] =
    useState<CharacterStatusHistoryEntry[]>(
      [],
    );

  const [characterName, setCharacterName] =
    useState("Character");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadHistory = useCallback(
    async () => {
      const supabase = createClient();

      const [
        characterResult,
        historyResult,
      ] = await Promise.all([
        supabase
          .from("characters")
          .select(
            "display_name, first_name, surname",
          )
          .eq("id", characterId)
          .maybeSingle(),

        supabase
          .from(
            "character_status_history",
          )
          .select(
            `
              id,
              old_status,
              new_status,
              changed_by,
              reason,
              created_at
            `,
          )
          .eq(
            "character_id",
            characterId,
          )
          .order("created_at", {
            ascending: false,
          })
          .limit(30),
      ]);

      const firstError =
        characterResult.error ??
        historyResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const character =
        characterResult.data as
          | AdminCharacterSummary
          | null;

      if (character) {
        setCharacterName(
          character.display_name?.trim() ||
            `${character.first_name} ${character.surname}`.trim() ||
            "Character",
        );
      }

      setEntries(
        (historyResult.data ??
          []) as CharacterStatusHistoryEntry[],
      );

      setError(null);
      setLoading(false);
    },
    [characterId],
  );

  useEffect(() => {
    setLoading(true);
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(
        `admin-character-history:${characterId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table:
            "character_status_history",
          filter: `character_id=eq.${characterId}`,
        },
        () => {
          void loadHistory();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [characterId, loadHistory]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Administration"
        title={characterName}
      />

      <div className="mb-4 flex items-center justify-between gap-3 border-y border-[rgb(var(--sep-colour-59432c))]/35 py-3">
        <div>
          <p className="text-[8px] uppercase tracking-[0.22em] text-[rgb(var(--sep-colour-876a46))]">
            Status history
          </p>

          <p className="mt-1 text-[11px] text-[rgb(var(--sep-colour-8f8271))]">
            Latest recorded changes
          </p>
        </div>

        <span className="flex h-7 min-w-7 items-center justify-center border border-[rgb(var(--sep-colour-59432c))]/50 bg-[rgb(var(--sep-colour-100c09))] px-2 text-[10px] text-[rgb(var(--sep-colour-b2956f))]">
          {entries.length}
        </span>
      </div>

      {error ? (
        <p className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The character history could not
          be loaded: {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <HistoryLoading />
        ) : (
          entries.map((entry) => (
            <StatusHistoryCard
              key={entry.id}
              entry={entry}
            />
          ))
        )}

        {!loading &&
        !error &&
        entries.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No status changes have been
            recorded for this character yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatusHistoryCard({
  entry,
}: {
  entry: CharacterStatusHistoryEntry;
}) {
  const statusStyles: Record<
    string,
    string
  > = {
    draft:
      "border-stone-600/60 text-stone-400",
    submitted:
      "border-amber-700/60 text-amber-500",
    approved:
      "border-emerald-800/60 text-emerald-500",
    rejected:
      "border-red-800/60 text-red-500",
  };

  return (
    <article className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3">
      <div className="flex flex-wrap items-center gap-2">
        {entry.old_status ? (
          <>
            <span
              className={`border bg-black/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
                statusStyles[
                  entry.old_status
                ] ??
                "border-[rgb(var(--sep-colour-59432c))]/60 text-[rgb(var(--sep-colour-9f917e))]"
              }`}
            >
              {entry.old_status}
            </span>

            <span
              aria-hidden="true"
              className="text-[10px] text-[rgb(var(--sep-colour-725a3d))]"
            >
              →
            </span>
          </>
        ) : null}

        <span
          className={`border bg-black/20 px-2 py-1 text-[7px] uppercase tracking-[0.14em] ${
            statusStyles[
              entry.new_status
            ] ??
            "border-[rgb(var(--sep-colour-59432c))]/60 text-[rgb(var(--sep-colour-9f917e))]"
          }`}
        >
          {entry.new_status}
        </span>
      </div>

      <p className="mt-2 text-[10px] text-[rgb(var(--sep-colour-887964))]">
        {formatHistoryDate(
          entry.created_at,
        )}
      </p>

      {entry.reason ? (
        <div className="mt-3 border-l border-[rgb(var(--sep-colour-7c493e))] pl-3">
          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-a8665d))]">
            Reason
          </p>

          <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-[rgb(var(--sep-colour-c5a39d))]">
            {entry.reason}
          </p>
        </div>
      ) : null}

      {entry.changed_by ? (
        <p
          className="mt-3 truncate text-[8px] text-[rgb(var(--sep-colour-665b4d))]"
          title={entry.changed_by}
        >
          Changed by: {entry.changed_by}
        </p>
      ) : null}
    </article>
  );
}

function HistoryLoading() {
  return (
    <>
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
    </>
  );
}

function formatHistoryDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function DashboardContext({
  context,
}: PortalContextPanelProps) {
  return (
    <LiveDashboardChronicle
      context={context}
    />
  );
}

function GameContext({
  context,
}: PortalContextPanelProps) {
  const room =
    context.character?.currentRoom;

  return (
        <GameContextPanel
      roomId={
        room?.id ?? null
      }
      currentCharacterId={
        context.character?.id ?? null
      }
      viewerIsStaff={
        context.isStaff
      }
    />
  );
}

function CharacterContext({
  context,
}: PortalContextPanelProps) {
  const character = context.character;

  return (
    <>
      <ContextHeading
        eyebrow="Character"
        title={
          character?.display_name ??
          "Character creation"
        }
      />

      {character ? (
        <>
          <ContextRow
            label="Record"
            value={character.status}
          />

          <ContextRow
            label="Title"
            value={
              character.title ?? "None"
            }
          />

          <ContextRow
            label="Ancestry"
            value={
              character.race?.name ??
              "Not assigned"
            }
          />

          <CharacterOrderContext
            characterId={character.id}
          />


          
        </>
      ) : (
        <>
          <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
            Create the character who will enter Sepulchria.
          </p>

          <Link
            href="/character/create"
            className="mt-5 inline-flex border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:bg-[rgb(var(--sep-colour-3b2919))]"
          >
            Begin creation
          </Link>
        </>
      )}
    </>
  );
}

type CharacterArchiveEntry = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
};

function CharacterArchiveContext() {
  const [characters, setCharacters] =
    useState<CharacterArchiveEntry[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCharacters() {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(
          `
            id,
            public_slug,
            first_name,
            surname,
            display_name
          `,
        )
        .eq("status", "approved")
      .eq("is_system", false)
        .order("first_name", {
          ascending: true,
        })
        .order("surname", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setCharacters(
        (data ??
          []) as CharacterArchiveEntry[],
      );

      setError(null);
      setLoading(false);
    }

    void loadCharacters();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalisedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredCharacters =
    characters.filter(
      (character) => {
        const name =
          character.display_name?.trim() ||
          `${character.first_name} ${character.surname}`.trim();

        return (
          !normalisedSearch ||
          name
            .toLowerCase()
            .includes(
              normalisedSearch,
            )
        );
      },
    );

  function jumpToCharacter(
    publicSlug: string,
  ) {
    const element =
      document.getElementById(
        `character-${publicSlug}`,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Character archive"
        title=""       
      />

      <p className="mb-1 text-xs leading-1 text-[rgb(var(--sep-colour-938673))]">
        Search the archive and jump
        directly to a character.
      </p>

      <label className="mb-1 block">
        <span className="text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
          Search
        </span>

        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value,
            )
          }
          placeholder="Character name..."
          className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d3bea0))] outline-none transition placeholder:text-[rgb(var(--sep-colour-665a4c))] focus:border-[rgb(var(--sep-colour-9b7545))]"
        />
      </label>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The character list could not
          be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredCharacters.map(
              (character) => {
                const name =
                  character.display_name?.trim() ||
                  `${character.first_name} ${character.surname}`.trim();

                return (
                  <button
                    key={character.id}
                    type="button"
                    onClick={() =>
                      jumpToCharacter(
                        character.public_slug,
                      )
                    }
                    className="group flex w-full items-center justify-between gap-3 border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                  >
                    <span className="min-w-0 truncate font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                      {name}
                    </span>

                    <span className="shrink-0 text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:text-[rgb(var(--sep-colour-b88a52))]">
                      ↓
                    </span>
                  </button>
                );
              },
            )}
          </div>
        )}

        {!loading &&
        !error &&
        filteredCharacters.length ===
          0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No characters match this
            search.
          </p>
        ) : null}
      </div>
    </div>
  );
}


type PublicCharacterContextRelation = {
  name: string;
};

type PublicCharacterContextRoom = {
  name: string;
  area:
    | PublicCharacterContextRelation
    | PublicCharacterContextRelation[]
    | null;
};

type PublicCharacterContextRecord = {
  id: string;
  public_slug: string;
  first_name: string;
  surname: string;
  display_name: string | null;
  pronouns: string | null;
  age: number | null;
  birthplace: string | null;
  origin: string | null;
  title: string | null;
  expertise: number | null;
  muscles: number | null;
  reflexes: number | null;
  vigor: number | null;
  brains: number | null;
  shrewd: number | null;
  presence_score: number | null;
  current_health: number | null;
  status: string;

  race:
    | PublicCharacterContextRelation
    | PublicCharacterContextRelation[]
    | null;

  association:
    | PublicCharacterContextRelation
    | PublicCharacterContextRelation[]
    | null;

  currentRoom:
    | PublicCharacterContextRoom
    | PublicCharacterContextRoom[]
    | null;
};

function contextRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}


function PublicCharacterContext({
  publicSlug,
}: {
  publicSlug: string;
}) {
  const [
    character,
    setCharacter,
  ] =
    useState<PublicCharacterContextRecord | null>(
      null,
    );

  const [
    presenceStatus,
    setPresenceStatus,
  ] =
    useState<string | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null,
    );

  const loadCharacter =
    useCallback(async () => {
      const supabase =
        createClient();

      const {
        data,
        error,
      } = await supabase
        .from("characters")
        .select(
          `
            id,
            public_slug,
            first_name,
            surname,
            display_name,
            pronouns,
            age,
            birthplace,
            origin,
            title,
            expertise,
            muscles,
            reflexes,
            vigor,
            brains,
            shrewd,
            presence_score,
            current_health,
            status,

            race:races!characters_race_id_fkey(
              name
            ),

            

            currentRoom:rooms!characters_current_room_id_fkey(
              name,
              area:areas!rooms_area_id_fkey(
                name
              )
            )
          `,
        )
        .eq(
          "public_slug",
          publicSlug,
        )
        .eq(
          "status",
          "approved",
        )
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setCharacter(null);
        setLoading(false);
        return;
      }

      const loadedCharacter =
        data as unknown as
          PublicCharacterContextRecord;

      setCharacter(
        loadedCharacter,
      );

      const {
        data: presence,
      } = await supabase
        .from(
          "character_presence",
        )
        .select("status")
        .eq(
          "character_id",
          loadedCharacter.id,
        )
        .maybeSingle();

      setPresenceStatus(
        presence?.status ??
          "offline",
      );

      setError(null);
      setLoading(false);
    }, [publicSlug]);

  useEffect(() => {
    setLoading(true);
    void loadCharacter();
  }, [loadCharacter]);

  useEffect(() => {
    if (!character?.id) {
      return;
    }

    const supabase =
      createClient();

    const characterChannel =
      supabase
        .channel(
          `public-character-context:${character.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "characters",
            filter:
              `id=eq.${character.id}`,
          },
          () => {
            void loadCharacter();
          },
        )
        .subscribe();

    const presenceChannel =
      supabase
        .channel(
          `public-character-context-presence:${character.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table:
              "character_presence",
            filter:
              `character_id=eq.${character.id}`,
          },
          () => {
            void loadCharacter();
          },
        )
        .subscribe();

    return () => {
      void supabase.removeChannel(
        characterChannel,
      );

      void supabase.removeChannel(
        presenceChannel,
      );
    };
  }, [
    character?.id,
    loadCharacter,
  ]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />

        {Array.from({
          length: 8,
        }).map(
          (_, index) => (
            <div
              key={index}
              className="h-9 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
            />
          ),
        )}
      </div>
    );
  }

  if (error) {
    return (
      <>
        <ContextHeading
          eyebrow="Character"
          title="Character record"
        />

        <p className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The character record could not
          be loaded.
        </p>
      </>
    );
  }

  if (!character) {
    return (
      <>
        <ContextHeading
          eyebrow="Character"
          title="Character record"
        />

        <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
          This character is not
          available.
        </p>
      </>
    );
  }

  const race =
    contextRelation(
      character.race,
    );

  

  const room =
    contextRelation(
      character.currentRoom,
    );

  const area =
    contextRelation(
      room?.area ?? null,
    );

  const name =
    character.display_name?.trim() ||
    `${character.first_name} ${character.surname}`.trim();

  const location =
    room
      ? area
        ? `${room.name} · ${area.name}`
        : room.name
      : "Not currently in a location";

  const rows: Array<{
    label: string;
    value: string;
  }> = [
    {
      label: "First name",
      value:
        character.first_name ||
        "—",
    },
    {
      label: "Surname",
      value:
        character.surname ||
        "—",
    },
    {
      label: "Pronouns",
      value:
        character.pronouns ||
        "—",
    },
    {
  label: "Age",
  value:
    character.age !== null
      ? `${character.age} years`
      : "Not provided",
},
    {
      label: "Birthplace",
      value:
        character.birthplace ||
        "—",
    },
    {
      label: "Origin",
      value:
        character.origin ||
        "—",
    },
    {
      label: "Title",
      value:
        character.title ||
        "None",
    },
    
    {
      label: "Ancestry",
      value:
        race?.name ??
        "Not assigned",
    },
    
    {
      label: "Location",
      value: location,
    },
    {
      label: "Presence",
      value:
        presenceStatus ??
        "offline",
    },
    {
      label: "Health",
      value: String(
        character.current_health ??
          0,
      ),
    },
    {
      label: "Expertise",
      value: Number(
        character.expertise ?? 0,
      ).toFixed(1),
    },
  ];

  const attributes = [
    {
      label: "Muscles",
      value: character.muscles,
    },
    {
      label: "Reflexes",
      value: character.reflexes,
    },
    {
      label: "Vigor",
      value: character.vigor,
    },
    {
      label: "Brains",
      value: character.brains,
    },
    {
      label: "Shrewd",
      value: character.shrewd,
    },
    {
      label: "Presence",
      value:
        character.presence_score,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Character record"
        title={name}
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))]">
          {rows.map(
            (row, index) => (
              <div
                key={row.label}
                className={`grid grid-cols-[92px_minmax(0,1fr)] gap-3 px-3 py-2.5 ${
                  index !==
                  rows.length - 1
                    ? "border-b border-[rgb(var(--sep-colour-59432c))]/25"
                    : ""
                }`}
              >
                <span className="text-[7px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-75644f))]">
                  {row.label}
                </span>

                <span className="min-w-0 break-words text-right text-[11px] text-[rgb(var(--sep-colour-c5b294))]">
                  {row.value}
                </span>
              </div>
            ),
          )}
        </div>

        <div className="mt-4 border-y border-[rgb(var(--sep-colour-59432c))]/35">
          <CharacterOrderContext
            characterId={character.id}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[8px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-806b50))]">
            Attributes
          </p>
          
          <div className="grid grid-cols-2 gap-1.5">
            {attributes.map(
              (attribute) => (
                <div
                  key={
                    attribute.label
                  }
                  className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-2.5"
                >
                  <p className="text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-75644f))]">
                    {
                      attribute.label
                    }
                  </p>

                  <p className="mt-1 font-serif text-lg text-[rgb(var(--sep-colour-d7bd91))]">
                    {attribute.value ??
                      "—"}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodexContext({
  eyebrow,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <>
      <ContextHeading
        eyebrow={eyebrow}
        title={title}
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        {description}
      </p>

      <div className="mt-5 border-y border-[rgb(var(--sep-colour-59432c))]/35 py-4">
        <ContextRow
          label="Archive"
          value="Public"
        />

        <ContextRow
          label="Status"
          value="Available"
          last
        />
      </div>

      <ContextLink
        href={primaryHref}
        label={primaryLabel}
      />

      <ContextLink
        href={secondaryHref}
        label={secondaryLabel}
        secondary
      />
    </>
  );
}


function PrivateLocationsContext({
  context,
}: PortalContextPanelProps) {
  const locations =
    context.privateLocations;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Invitation-only"
        title="Private Locations"
      />

      <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-938673))]">
        {context.isStaff
          ? "Enabled Private Locations. Staff may enter any listed room."
          : "Private Locations currently available to your character."}
      </p>

      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1">
        {locations.map(
          (location) => (
            <article
              key={
                location.roomId
              }
              className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d6bd91))]">
                    {location.name}
                  </p>

                  <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-75644f))]">
                    Owner · {location.ownerName}
                  </p>
                </div>

                <form
                  action={
                    enterRoomFromMap
                  }
                >
                  <input
                    type="hidden"
                    name="roomId"
                    value={
                      location.roomId
                    }
                  />

                  <button
                    type="submit"
                    title={`Enter ${location.name}`}
                    aria-label={`Enter ${location.name}`}
                    className="flex h-7 w-7 items-center justify-center border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] text-[10px] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-997042))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
                  >
                    →
                  </button>
                </form>
              </div>
            </article>
          ),
        )}

        {locations.length ===
        0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No enabled Private Locations
            are currently available.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MessagesContext({
  context,
}: PortalContextPanelProps) {
  return (
    <MessagesContextNavigator
      context={context}
    />
  );
}



type ForumOverviewSection = {
  id: string;
  name: string;
  slug: string;
  section_type:
    | "ongame"
    | "offgame"
    | "organisation";
  parent_id: string | null;
  is_active: boolean;
};

type ForumOverviewTopic = {
  id: string;
  section_id: string;
  replies_count: number | null;
  deleted_at: string | null;
};

type ForumOverviewGroup = {
  key:
    | "ongame"
    | "offgame"
    | "organisation";
  label: string;
  description: string;
  sectionCount: number;
  postCount: number;
};

function ForumOverviewContext() {
  const [groups, setGroups] =
    useState<ForumOverviewGroup[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const loadOverview =
    useCallback(async () => {
      const supabase =
        createClient();

      const [
        sectionsResult,
        topicsResult,
      ] = await Promise.all([
        supabase
          .from("forum_sections")
          .select(
            "id, name, slug, section_type, parent_id, is_active",
          )
          .eq("is_active", true),

        supabase
          .from("forum_topics")
          .select(
            "id, section_id, replies_count, deleted_at",
          )
          .is("deleted_at", null),
      ]);

      const firstError =
        sectionsResult.error ??
        topicsResult.error;

      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const sections =
        (sectionsResult.data ??
          []) as ForumOverviewSection[];

      const topics =
        (topicsResult.data ??
          []) as ForumOverviewTopic[];

      const definitions = [
        {
          key: "ongame" as const,
          label: "Ongame",
          description:
            "In-character chronicles, events, letters and conversations belonging to Aureth.",
        },
        {
          key: "offgame" as const,
          label: "Offgame",
          description:
            "Announcements, questions and conversations between members of the community.",
        },
        {
          key: "organisation" as const,
          label: "Organisations",
          description:
            "Private and public halls belonging to Sepulchria's associations.",
        },
      ];

      setGroups(
        definitions.map(
          (definition) => {
            const groupSections =
              sections.filter(
                (section) =>
                  section.section_type ===
                  definition.key,
              );

            const sectionIds =
              new Set(
                groupSections.map(
                  (section) =>
                    section.id,
                ),
              );

            const groupTopics =
              topics.filter((topic) =>
                sectionIds.has(
                  topic.section_id,
                ),
              );

            const postCount =
              groupTopics.reduce(
                (total, topic) =>
                  total +
                  1 +
                  (topic.replies_count ??
                    0),
                0,
              );

            return {
              ...definition,
              sectionCount:
                groupSections.length,
              postCount,
            };
          },
        ),
      );

      setError(null);
      setLoading(false);
    }, []);

  useEffect(() => {
    setLoading(true);
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    const supabase =
      createClient();

    const safeId = Math.random()
      .toString(36)
      .slice(2);

    const channel = supabase
      .channel(
        `forum-overview-context:${safeId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_posts",
        },
        () => {
          void loadOverview();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_topics",
        },
        () => {
          void loadOverview();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "forum_sections",
        },
        () => {
          void loadOverview();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(
        channel,
      );
    };
  }, [loadOverview]);

  return (
    <>
      <ContextHeading
        eyebrow="Community"
        title="Forum"
      />

      <p className="text-[11px] leading-5 text-[rgb(var(--sep-colour-938673))]">
        Chronicles, discussions and the
        halls of Sepulchria&apos;s
        organisations.
      </p>

      {error ? (
        <p className="mt-4 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[10px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          Forum statistics could not be
          loaded.
        </p>
      ) : null}

      <div className="mt-4 space-y-2">
        {loading ? (
  <>
    <div className="h-20 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
    <div className="h-20 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
    <div className="h-20 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
  </>
) : (
  groups.map((group) => (
    <article
      key={group.key}
      className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-serif text-base text-[rgb(var(--sep-colour-d6bd91))]">
            {group.label}
          </h3>

          <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-817565))]">
            {group.description}
          </p>
        </div>

        <dl className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <dt className="text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-665946))]">
              Sections
            </dt>

            <dd className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-c3a67d))]">
              {group.sectionCount}
            </dd>
          </div>

          <div className="text-right">
            <dt className="text-[6px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-665946))]">
              Posts
            </dt>

            <dd className="mt-0.5 font-serif text-sm text-[rgb(var(--sep-colour-c3a67d))]">
              {group.postCount}
            </dd>
          </div>
        </dl>
      </div>
    </article>
  ))
)}
      </div>
    </>
  );

}



type QuickReplyPost = {
  id: string;
  topic_id: string;
  body: string;
  deleted_at: string | null;
  author:
    | {
        display_name: string | null;
        first_name: string;
        surname: string | null;
      }
    | {
        display_name: string | null;
        first_name: string;
        surname: string | null;
      }[]
    | null;
};

type QuickReplyCharacter = {
  id: string;
  display_name: string | null;
  first_name: string;
  surname: string | null;
};

const quickReplyInitialState:
  CreateForumReplyState = {
    success: false,
    message: "",
  };

function ForumTopicContext({
  sectionSlug,
  topicSlug,
  quickReplyPostId,
}: {
  sectionSlug: string;
  topicSlug: string;
  quickReplyPostId: string | null;
}) {
  const [state, action, pending] =
    useActionState(
      createForumReplyAction,
      quickReplyInitialState,
    );

  const [topicId, setTopicId] =
    useState("");

  const [topicTitle, setTopicTitle] =
    useState("Discussion");

  const [post, setPost] =
    useState<QuickReplyPost | null>(
      null,
    );

  const [characters, setCharacters] =
    useState<QuickReplyCharacter[]>([]);

  const [
    selectedCharacterId,
    setSelectedCharacterId,
  ] = useState("");

  const [body, setBody] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadContext() {
      const supabase =
        createClient();

      const {
        data: topic,
        error: topicError,
      } = await supabase
        .from("forum_topics")
        .select("id, title")
        .eq("slug", topicSlug)
        .maybeSingle();

      if (
        topicError ||
        !topic
      ) {
        setError(
          topicError?.message ??
            "Discussion not found.",
        );
        setLoading(false);
        return;
      }

      setTopicId(topic.id);
      setTopicTitle(topic.title);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const {
          data: characterRows,
        } = await supabase
          .from("characters")
          .select(
            "id, display_name, first_name, surname",
          )
          .eq("user_id", user.id)
          .eq("status", "approved")
      .eq("is_system", false)
          .order("first_name");

        const options =
          (characterRows ??
            []) as QuickReplyCharacter[];

        setCharacters(options);

        if (
          options.length === 1
        ) {
          setSelectedCharacterId(
            options[0].id,
          );
        }
      }

      if (quickReplyPostId) {
        const {
          data: selectedPost,
          error: postError,
        } = await supabase
          .from("forum_posts")
          .select(`
            id,
            topic_id,
            body,
            deleted_at,
            author:characters!forum_posts_author_character_id_fkey(
              display_name,
              first_name,
              surname
            )
          `)
          .eq(
            "id",
            quickReplyPostId,
          )
          .eq(
            "topic_id",
            topic.id,
          )
          .maybeSingle();

        if (
          postError ||
          !selectedPost ||
          selectedPost.deleted_at
        ) {
          setError(
            "The selected post is no longer available.",
          );
        } else {
          setPost(
            selectedPost as unknown as QuickReplyPost,
          );
          setError(null);

          requestAnimationFrame(
            () => {
              textareaRef.current?.focus();
            },
          );
        }
      } else {
        setPost(null);
        setError(null);
      }

      setLoading(false);
    }

    setLoading(true);
    void loadContext();
  }, [
    quickReplyPostId,
    topicSlug,
  ]);

  const author =
    post
      ? normaliseContextRelation(
          post.author,
        )
      : null;

  const authorName =
    author?.display_name?.trim() ||
    [
      author?.first_name,
      author?.surname,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Account";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="Forum discussion"
        title={topicTitle}
      />

      {loading ? (
        <ForumContextLoading />
      ) : !quickReplyPostId ? (
        <>
          <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
            Select Rapid reply beneath a
            post to answer it directly
            from this panel.
          </p>

          <ContextLink
            href={`/forum/${sectionSlug}/${topicSlug}#reply`}
            label="Open full reply editor"
          />
        </>
      ) : error || !post ? (
        <p className="border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          {error ??
            "The selected post could not be loaded."}
        </p>
      ) : (
        <form
          action={action}
          className="flex min-h-0 flex-1 flex-col"
        >
          <input
            type="hidden"
            name="topicId"
            value={topicId}
          />

          <input
            type="hidden"
            name="sectionSlug"
            value={sectionSlug}
          />

          <input
            type="hidden"
            name="topicSlug"
            value={topicSlug}
          />

          <input
            type="hidden"
            name="quotedPostId"
            value={post.id}
          />

          <input
            type="hidden"
            name="imageUrls"
            value="[]"
          />

          <div className="shrink-0 border-l-2 border-[rgb(var(--sep-colour-8b6840))] bg-[rgb(var(--sep-colour-100c09))] px-3 py-3">
            <p className="text-[8px] uppercase tracking-[0.17em] text-[rgb(var(--sep-colour-9b7b53))]">
              Replying to {authorName}
            </p>

            <p className="mt-2 line-clamp-5 text-[11px] italic leading-5 text-[rgb(var(--sep-colour-9f927f))]">
              {shortenForumText(
                post.body,
                280,
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-3">
              <a
                href={`#post-${post.id}`}
                className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-9c7650))] transition hover:text-[rgb(var(--sep-colour-dfb982))]"
              >
                View original
              </a>

              <Link
                href={`/forum/${sectionSlug}/${topicSlug}`}
                scroll={false}
                className="text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-776957))] transition hover:text-[rgb(var(--sep-colour-c8a678))]"
              >
                Cancel
              </Link>
            </div>
          </div>

          <label className="mt-4 block shrink-0">
            <span className="text-[8px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-9f8765))]">
              Reply as
            </span>

            <select
              name="characterId"
              value={selectedCharacterId}
              onChange={(event) =>
                setSelectedCharacterId(
                  event.target.value,
                )
              }
              disabled={pending}
              className="mt-2 w-full border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] px-3 py-2.5 text-xs text-[rgb(var(--sep-colour-d8c4a4))] outline-none focus:border-[rgb(var(--sep-colour-aa7f47))]"
            >
              <option value="">
                Account only
              </option>

              {characters.map(
                (character) => (
                  <option
                    key={character.id}
                    value={character.id}
                  >
                    {character.display_name?.trim() ||
                      [
                        character.first_name,
                        character.surname,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                  </option>
                ),
              )}
            </select>
          </label>

          <textarea
            ref={textareaRef}
            name="body"
            value={body}
            onChange={(event) =>
              setBody(
                event.target.value.slice(
                  0,
                  50_000,
                ),
              )
            }
            required
            disabled={pending}
            rows={8}
            placeholder="Write a rapid reply..."
            className="mt-4 min-h-32 w-full flex-1 resize-none border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-0d0907))] p-3 text-xs leading-6 text-[rgb(var(--sep-colour-d2c1a7))] outline-none placeholder:text-[rgb(var(--sep-colour-5f5549))] focus:border-[rgb(var(--sep-colour-aa7f47))]"
          />

          <div className="mt-3 shrink-0">
            {state.message ? (
              <p
                className={`mb-3 text-[11px] leading-5 ${
                  state.success
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {state.message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                pending ||
                !body.trim()
              }
              className="w-full border border-[rgb(var(--sep-colour-a27b48))] bg-[rgb(var(--sep-colour-49311d))] px-4 py-3 text-[9px] uppercase tracking-[0.2em] text-[rgb(var(--sep-colour-f0d6aa))] transition hover:border-[rgb(var(--sep-colour-c49555))] hover:bg-[rgb(var(--sep-colour-5b3d22))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending
                ? "Publishing..."
                : "Publish rapid reply"}
            </button>

            <Link
              href={`/forum/${sectionSlug}/${topicSlug}?quote=${post.id}#reply`}
              className="mt-3 flex w-full items-center justify-between border border-[rgb(var(--sep-colour-59432c))]/60 px-4 py-3 text-[9px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-9d8c75))] transition hover:border-[rgb(var(--sep-colour-765937))] hover:text-[rgb(var(--sep-colour-d7c09a))]"
            >
              <span>
                Open full editor
              </span>
              <span aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

function normaliseContextRelation<T>(
  value: T | T[] | null,
): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function shortenForumText(
  value: string,
  maximumLength: number,
): string {
  const normalized = value
    .replace(/[*_>#\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (
    normalized.length <=
    maximumLength
  ) {
    return normalized;
  }

  return `${normalized.slice(
    0,
    maximumLength - 1,
  )}…`;
}

function formatCompactDate(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
    },
  ).format(date);
}

function ForumContextLoading() {
  return (
    <div className="space-y-2">
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
      <div className="h-24 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]" />
    </div>
  );
}

type AreaContextRoom = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  sort_order: number | null;
};

function AreaContext({
  areaSlug,
}: {
  areaSlug: string;
}) {
  const [areaName, setAreaName] =
    useState("Area");

  const [rooms, setRooms] =
    useState<AreaContextRoom[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadArea() {
      const supabase =
        createClient();

      const {
        data: area,
        error: areaError,
      } = await supabase
        .from("areas")
        .select("id, name")
        .eq("slug", areaSlug)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (areaError || !area) {
        setError(
          areaError?.message ??
            "Area not found.",
        );
        setLoading(false);
        return;
      }

      const {
        data: roomRows,
        error: roomsError,
      } = await supabase
        .from("rooms")
        .select(
          "id, name, slug, image_url, sort_order",
        )
        .eq("area_id", area.id)
        .eq("is_active", true)
        .order("sort_order", {
          ascending: true,
        })
        .order("name", {
          ascending: true,
        });

      if (cancelled) {
        return;
      }

      if (roomsError) {
        setError(
          roomsError.message,
        );
        setLoading(false);
        return;
      }

      setAreaName(
        String(area.name),
      );

      setRooms(
        (roomRows ?? []).map(
          (room) => ({
            id: String(room.id),
            name: String(room.name),
            slug: String(room.slug),
            image_url:
              typeof room.image_url === "string" &&
              room.image_url.trim()
                ? room.image_url
                : null,
            sort_order:
              room.sort_order === null
                ? null
                : Number(
                    room.sort_order,
                  ),
          }),
        ),
      );

      setError(null);
      setLoading(false);
    }

    setLoading(true);
    void loadArea();

    return () => {
      cancelled = true;
    };
  }, [areaSlug]);

  function jumpToLocation(
    slug: string,
  ) {
    const anchor =
      `location-${slug}`;

    const element =
      document.getElementById(
        anchor,
      );

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    window.history.replaceState(
      null,
      "",
      `#${anchor}`,
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ContextHeading
        eyebrow="District of Sepulchria"
        title={areaName}
      />

      <p className="mb-4 text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Journey to a
        location in this area.
      </p>

      {error ? (
        <p className="mb-3 border border-[rgb(var(--sep-colour-743d35))] bg-[rgb(var(--sep-colour-2a1512))] p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-d8a49a))]">
          The locations could not
          be loaded.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({
              length: 6,
            }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-11 animate-pulse border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-19120d))]"
                />
              ),
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map(
              (room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() =>
                    jumpToLocation(
                      room.slug,
                    )
                  }
                  className="group flex w-full items-center gap-3 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-100c09))] p-2 text-left transition hover:border-[rgb(var(--sep-colour-8d693e))] hover:bg-[rgb(var(--sep-colour-1d150f))]"
                >
                  <span className="relative h-11 w-16 shrink-0 overflow-hidden border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-0b0806))]">
                    {room.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={room.image_url}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[6px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-5f5446))]">
                        No image
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1 font-serif text-sm leading-4 text-[rgb(var(--sep-colour-cbb28a))] transition group-hover:text-[rgb(var(--sep-colour-ead0a0))]">
                    {room.name}
                  </span>

                  <span
                    aria-hidden="true"
                    className="shrink-0 pr-1 text-[10px] text-[rgb(var(--sep-colour-725a3d))] transition group-hover:translate-x-0.5 group-hover:text-[rgb(var(--sep-colour-b88a52))]"
                  >
                    ↓
                  </span>
                </button>
              ),
            )}
          </div>
        )}

        {!loading &&
        !error &&
        rooms.length === 0 ? (
          <p className="border border-[rgb(var(--sep-colour-59432c))]/30 bg-[rgb(var(--sep-colour-100c09))]/60 p-3 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">
            No active locations
            are currently
            available.
          </p>
        ) : null}
      </div>

      <Link
        href="/?map=sepulchria"
        className="mt-4 flex w-full shrink-0 items-center justify-between border border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-dfc79c))] transition hover:border-[rgb(var(--sep-colour-997042))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
      >
        <span>
          Return to Sepulchria
        </span>
        <span aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}

function DefaultContext() {
  return (
    <>
      <ContextHeading
        eyebrow="Sepulchria"
        title="Context"
      />

      <p className="text-xs leading-6 text-[rgb(var(--sep-colour-938673))]">
        Tools and information for this section will appear here.
      </p>
    </>
  );
}

function ContextHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="mb-5">
      <p className="text-[9px] uppercase tracking-[0.3em] text-[rgb(var(--sep-colour-876a46))]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-2xl text-[rgb(var(--sep-colour-d6bd91))]">
        {title}
      </h2>
    </header>
  );
}

function ContextRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-3 text-xs ${
        last
          ? ""
          : "border-b border-[rgb(var(--sep-colour-59432c))]/35"
      }`}
    >
      <span className="text-[rgb(var(--sep-colour-786b5b))]">
        {label}
      </span>

      <span className="max-w-[150px] break-words text-right capitalize text-[rgb(var(--sep-colour-bba98d))]">
        {value}
      </span>
    </div>
  );
}

function ContextLink({
  href,
  label,
  secondary = false,
}: {
  href: string;
  label: string;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`mt-3 flex w-full items-center justify-between border px-4 py-3 text-[10px] uppercase tracking-[0.18em] transition ${
        secondary
          ? "border-[rgb(var(--sep-colour-59432c))]/60 bg-transparent text-[rgb(var(--sep-colour-9d8c75))] hover:border-[rgb(var(--sep-colour-765937))] hover:bg-[rgb(var(--sep-colour-1f1711))] hover:text-[rgb(var(--sep-colour-d7c09a))]"
          : "border-[rgb(var(--sep-colour-765937))] bg-[rgb(var(--sep-colour-271c12))] text-[rgb(var(--sep-colour-dfc79c))] hover:border-[rgb(var(--sep-colour-997042))] hover:bg-[rgb(var(--sep-colour-3b2919))]"
      }`}
    >
      <span>{label}</span>
      <span aria-hidden="true">→</span>
    </Link>
  );
}
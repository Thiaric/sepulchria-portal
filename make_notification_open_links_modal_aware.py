from pathlib import Path
import sys

ROOT = Path.cwd()
PATH = ROOT / "components/notifications/notification-bell.tsx"

if not PATH.exists():
    print("ERROR: components/notifications/notification-bell.tsx not found.")
    sys.exit(1)

text = PATH.read_text(encoding="utf-8")

anchor = 'import { usePortalAudio } from "@/components/audio/portal-audio-provider";\n'
replacement = '''import { usePortalAudio } from "@/components/audio/portal-audio-provider";
import {
  openPortalModal,
  type PortalModalPayload,
} from "@/components/portal/portal-modal-button";
'''

if anchor not in text:
    print("ERROR: Could not find notification bell import anchor.")
    sys.exit(1)

text = text.replace(anchor, replacement, 1)

anchor = '''type NotificationBundle = {
  muted: boolean;
  notifications: NotificationRow[];
};

export function NotificationBell() {
'''

replacement = '''type NotificationBundle = {
  muted: boolean;
  notifications: NotificationRow[];
};

type ModalRouteDefinition = {
  prefix: string;
  label: string;
  title: string;
  icon: string;
  exact?: boolean;
};

const MODAL_ROUTES: ModalRouteDefinition[] = [
  {
    prefix: "/characters",
    label: "Sepulchria's People",
    title: "Browse the characters who inhabit Sepulchria.",
    icon: "/icons/characters.png",
  },
  {
    prefix: "/polls",
    label: "Polls",
    title: "Open community Polls and cast your vote.",
    icon: "/icons/forum.png",
  },
  {
    prefix: "/codex",
    label: "Codex",
    title: "Explore Aureth's history, locations and lore.",
    icon: "/icons/codex.png",
  },
  {
    prefix: "/rules",
    label: "Rules",
    title: "Read the official game rules and documentation.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/ancestries",
    label: "Ancestries",
    title: "Read about the playable ancestries of Sepulchria.",
    icon: "/icons/ancestries.png",
  },
  {
    prefix: "/associations",
    label: "Associations",
    title: "Explore the Associations of Sepulchria.",
    icon: "/icons/associations.png",
  },
  {
    prefix: "/orders",
    label: "Orders",
    title: "Read about the Orders of Sepulchria.",
    icon: "/icons/orders.png",
  },
  {
    prefix: "/warping",
    label: "Warping",
    title: "Read about magic and Warping in Sepulchria.",
    icon: "/icons/warping.png",
  },
  {
    prefix: "/feats",
    label: "Feats",
    title: "Browse available Feats.",
    icon: "/icons/gifts.png",
  },
  {
    prefix: "/market",
    label: "Market",
    title: "Browse the Sepulchria market.",
    icon: "/icons/market.png",
  },
  {
    prefix: "/crafting",
    label: "Crafting",
    title: "Open your crafting workbench.",
    icon: "/icons/crafting.png",
  },
  {
    prefix: "/missions",
    label: "Daily Missions",
    title: "Review today's missions, progress and rewards.",
    icon: "/icons/missions.png",
  },
  {
    prefix: "/friends",
    label: "Friend List",
    title: "Open your character relationships.",
    icon: "/icons/friends.png",
  },
  {
    prefix: "/messages",
    label: "Messages",
    title: "Open your private conversations.",
    icon: "/icons/messages.png",
  },
  {
    prefix: "/ranking",
    label: "Hall of Renown",
    title: "View Sepulchria's records of achievement.",
    icon: "/icons/ranking.png",
  },
  {
    prefix: "/forum",
    label: "Forum",
    title: "Open the Sepulchria community forum.",
    icon: "/icons/forum.png",
  },
  {
    prefix: "/community-rules",
    label: "Community Rules",
    title: "Read Sepulchria's Community Rules.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/safety",
    label: "Safety",
    title: "Read Sepulchria's safety information.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/age-policy",
    label: "18+ Policy",
    title: "Read Sepulchria's age policy.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/privacy",
    label: "Privacy",
    title: "Read Sepulchria's Privacy Notice.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/cookies",
    label: "Cookies",
    title: "Read Sepulchria's Cookie Notice.",
    icon: "/icons/rules.png",
  },
  {
    prefix: "/terms",
    label: "Terms",
    title: "Read Sepulchria's Terms of Service.",
    icon: "/icons/rules.png",
  },
];

function modalPayloadForNotificationHref(
  href: string,
): PortalModalPayload | null {
  const path =
    href.split("#")[0].split("?")[0];

  if (
    path === "/orders/manage" ||
    path.startsWith("/orders/manage/")
  ) {
    return null;
  }

  const definition =
    MODAL_ROUTES.find(
      (route) =>
        route.exact
          ? path === route.prefix
          : path === route.prefix ||
            path.startsWith(
              `${route.prefix}/`,
            ),
    );

  if (!definition) {
    return null;
  }

  return {
    label: definition.label,
    title: definition.title,
    icon: definition.icon,
    href,
  };
}

export function NotificationBell() {
'''

if anchor not in text:
    print("ERROR: Could not find notification bundle anchor.")
    sys.exit(1)

text = text.replace(anchor, replacement, 1)

anchor = '''                            onClick={() =>
                              setOpen(
                                false,
                              )
                            }
'''

replacement = '''                            onClick={(event) => {
                              const modalPayload =
                                modalPayloadForNotificationHref(
                                  row.href!,
                                );

                              if (modalPayload) {
                                event.preventDefault();
                                openPortalModal(
                                  modalPayload,
                                );
                              }

                              setOpen(false);
                            }}
'''

if anchor not in text:
    print("ERROR: Could not find notification Open link click handler.")
    sys.exit(1)

text = text.replace(anchor, replacement, 1)

PATH.write_text(text, encoding="utf-8")

print("Updated components/notifications/notification-bell.tsx")
print("Run: npm run build")

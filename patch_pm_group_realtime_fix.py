#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "51ce3a89cf28daecd525d23b45c3bf0e3cb1f3d4"

def once(s, a, b, label):
    n = s.count(a)
    if n != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {n}. Nothing written."
        )
    return s.replace(a, b, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        raise SystemExit(
            f"ERROR: HEAD is {head}; expected {BASELINE}. "
            "This correction is meant to be applied on top of the uncommitted PM patch."
        )

    changes = {}

    p = root / "app/(portal)/messages/[id]/components/ConversationMessageList.tsx"
    s = p.read_text(encoding="utf-8")

    s = once(
        s,
        '''  viewerSender: SenderIdentity;
  otherSender: SenderIdentity;
  messages: DirectMessage[];''',
        '''  viewerSender: SenderIdentity;
  participantSenders: SenderIdentity[];
  messages: DirectMessage[];''',
        "message list props",
    )

    s = once(
        s,
        '''  viewerSender,
  otherSender,
  messages,''',
        '''  viewerSender,
  participantSenders,
  messages,''',
        "message list destructuring",
    )

    s = once(
        s,
        '''      const sender =
        row.sender_character_id === viewerCharacterId
          ? viewerSender
          : otherSender;''',
        '''      const sender =
        row.sender_character_id === viewerCharacterId
          ? viewerSender
          : participantSenders.find(
              (participant) =>
                participant.id === row.sender_character_id,
            ) ?? {
              id: row.sender_character_id,
              display_name: "Unknown",
              portrait_url: null,
            };''',
        "realtime sender resolution",
    )

    s = once(
        s,
        '''    conversationId,
    otherSender,
    viewerCharacterId,
    viewerSender,''',
        '''    conversationId,
    participantSenders,
    viewerCharacterId,
    viewerSender,''',
        "message list dependencies",
    )

    changes[p] = s

    p = root / "app/(portal)/messages/[id]/page.tsx"
    s = p.read_text(encoding="utf-8")

    s = once(
        s,
        '''            otherSender={{
              id: other.id,
              display_name:
                other.display_name ?? "Unknown",
              portrait_url:
                other.portrait_url ?? null,
            }}
            messages={''',
        '''            participantSenders={[
              {
                id: other.id,
                display_name:
                  other.display_name ?? "Unknown",
                portrait_url:
                  other.portrait_url ?? null,
              },
            ]}
            messages={''',
        "one-to-one participant sender list",
    )

    changes[p] = s

    p = root / "app/(portal)/messages/components/group-conversation-view.tsx"
    s = p.read_text(encoding="utf-8")

    s = once(
        s,
        '''  surname: string | null;
};''',
        '''  surname: string | null;
  portrait_url: string | null;
};''',
        "group participant portrait type",
    )

    s = once(
        s,
        '''          display_name,
          first_name,
          surname
        )''',
        '''          display_name,
          first_name,
          surname,
          portrait_url
        )''',
        "group participant portrait query",
    )

    s = once(
        s,
        '''  const displayTitle =
    title?.trim() ||
    participants
      .filter(
        (participant) =>
          participant.id !==
          viewerCharacterId,
      )
      .map(nameOf)
      .join(", ");

  return (''',
        '''  const displayTitle =
    title?.trim() ||
    participants
      .filter(
        (participant) =>
          participant.id !==
          viewerCharacterId,
      )
      .map(nameOf)
      .join(", ");

  const viewerParticipant =
    participants.find(
      (participant) =>
        participant.id ===
        viewerCharacterId,
    );

  if (!viewerParticipant) {
    notFound();
  }

  const viewerSender = {
    id: viewerParticipant.id,
    display_name:
      nameOf(viewerParticipant) ||
      "Unknown",
    portrait_url:
      viewerParticipant.portrait_url ??
      null,
  };

  const participantSenders =
    participants
      .filter(
        (participant) =>
          participant.id !==
          viewerCharacterId,
      )
      .map((participant) => ({
        id: participant.id,
        display_name:
          nameOf(participant) ||
          "Unknown",
        portrait_url:
          participant.portrait_url ??
          null,
      }));

  return (''',
        "group sender identities",
    )

    s = once(
        s,
        '''            viewerCharacterId={
              viewerCharacterId
            }
            messages={messages}''',
        '''            viewerCharacterId={
              viewerCharacterId
            }
            viewerSender={
              viewerSender
            }
            participantSenders={
              participantSenders
            }
            messages={messages}''',
        "group live message props",
    )

    changes[p] = s

    print("Baseline:", head[:7])
    print(f"Prepared {len(changes)} local correction(s):")
    for path in changes:
        print(" ", str(path.relative_to(root)).replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    for path, content in changes.items():
        path.write_text(
            content,
            encoding="utf-8",
            newline="\n",
        )

    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()

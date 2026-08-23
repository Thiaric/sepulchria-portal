#!/usr/bin/env python3
from pathlib import Path
import argparse, subprocess

BASELINE="bb5a31e2a8fac79fcf723ee22ff11f919c61268c"

def once(s,a,b,label):
    n=s.count(a)
    if n!=1:
        raise SystemExit(f"ERROR: {label}: expected anchor once, found {n}. Nothing written.")
    return s.replace(a,b,1)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--dry-run",action="store_true")
    args=ap.parse_args()
    root=Path.cwd()
    if not (root/"package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")
    head=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip()
    if head!=BASELINE:
        raise SystemExit(f"ERROR: HEAD is {head}; expected {BASELINE}.")
    changes={}

    # 1) Existing PM composer: client-side live sanction gate.
    p=root/"app/(portal)/messages/components/MessageComposer.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(
        s,
        'import { RichMessageEditor } from "@/components/messages/rich-message-editor";',
        'import { RichMessageEditor } from "@/components/messages/rich-message-editor";\nimport { SanctionRestrictionNotice, useSanctionCapability } from "@/components/sanctions/sanction-capability-ui";',
        "composer sanction import",
    )
    s=once(
        s,
        '''  const [state, action, pending] =
    useActionState(
      sendTypedPrivateMessage,
      initialState,
    );''',
        '''  const [state, action, pending] =
    useActionState(
      sendTypedPrivateMessage,
      initialState,
    );

  const communication =
    useSanctionCapability(
      "communication",
    );''',
        "composer sanction hook",
    )
    s=once(
        s,
        '''  const isOnGame =
    messageMode === "ongame";

  return (
    <form''',
        '''  const isOnGame =
    messageMode === "ongame";

  if (communication.blocked) {
    return (
      <div className="border-t border-[rgb(var(--sep-colour-59432c))]/40 p-5 sm:p-6">
        <SanctionRestrictionNotice
          message={communication.message}
        />
      </div>
    );
  }

  return (
    <form''',
        "composer sanction gate",
    )
    changes[p]=s

    # 2) Server action: don't make the action wait for two expensive RSC revalidations.
    # Realtime already observes the INSERT immediately and refreshes the open conversation.
    p=root/"app/(portal)/messages/send-typed-message-action.ts"
    s=p.read_text(encoding="utf-8")
    s=once(s,'import { revalidatePath } from "next/cache";\n',"","remove revalidate import")
    s=once(
        s,
        '''    revalidatePath(
      `/messages/${conversationId}`,
    );
    revalidatePath("/messages");

    return {''',
        '''    return {''',
        "remove synchronous PM revalidation",
    )
    changes[p]=s

    # 3) Realtime: debounce refreshes and do not call mark-read before asking React
    # to refresh. This avoids stacking server actions with the RSC refresh.
    p=root/"app/(portal)/messages/[id]/components/ConversationRealtime.tsx"
    s=p.read_text(encoding="utf-8")
    s=once(
        s,
        '''  const viewerCharacterIdRef =
    useRef<string | null>(
      null,
    );''',
        '''  const viewerCharacterIdRef =
    useRef<string | null>(
      null,
    );

  const refreshTimerRef =
    useRef<number | null>(
      null,
    );''',
        "realtime refresh timer",
    )
    s=once(
        s,
        '''            keepConversationRead();

            router.refresh();

            window.setTimeout(
              keepConversationRead,
              120,
            );''',
        '''            if (
              refreshTimerRef.current !==
              null
            ) {
              window.clearTimeout(
                refreshTimerRef.current,
              );
            }

            refreshTimerRef.current =
              window.setTimeout(
                () => {
                  refreshTimerRef.current =
                    null;
                  router.refresh();
                },
                25,
              );

            window.setTimeout(
              keepConversationRead,
              120,
            );''',
        "realtime insert refresh",
    )
    s=once(
        s,
        '''      void supabase.removeChannel(
        channel,
      );''',
        '''      if (
        refreshTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          refreshTimerRef.current,
        );
      }

      void supabase.removeChannel(
        channel,
      );''',
        "realtime cleanup",
    )
    changes[p]=s

    print("Baseline:",head[:7])
    print(f"Prepared {len(changes)} local file change(s):")
    for p in changes:
        print(" ",str(p.relative_to(root)).replace("/","\\"))
    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return
    for p,s in changes.items():
        p.write_text(s,encoding="utf-8",newline="\n")
    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__=="__main__":
    main()

from pathlib import Path
import sys

ROOT = Path.cwd()

def fail(message: str) -> None:
    print(f"\nERROR: {message}\n")
    sys.exit(1)

def read(path: str) -> str:
    p = ROOT / path
    if not p.exists():
        fail(f"Missing file: {path}")
    return p.read_text(encoding="utf-8")

def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")
    print(f"Updated {path}")

page_path = "app/(portal)/missions/page.tsx"
page = read(page_path)

old_milestone_article = '''              <article
                key={milestone.id}
                data-milestone-card={milestone.milestone_key}
                className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
              >'''

new_milestone_article = '''              <article
                key={milestone.id}
                data-milestone-card={milestone.milestone_key}
                data-claim-ready={
                  complete &&
                  milestone.claimed_at === null
                    ? "true"
                    : "false"
                }
                className={[
                  "border p-4 transition-all duration-200",
                  complete &&
                  milestone.claimed_at === null
                    ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                    : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                ].join(" ")}
              >'''

if old_milestone_article not in page:
    fail("Could not find the milestone card block in missions/page.tsx.")

page = page.replace(old_milestone_article, new_milestone_article, 1)

old_mission_article = '''                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      data-mission-card={mission.code_snapshot}
                      className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4"
                    >'''

new_mission_article = '''                    <article
                      key={mission.id}
                      id={`mission-${mission.code_snapshot}`}
                      data-mission-card={mission.code_snapshot}
                      data-claim-ready={
                        complete &&
                        mission.claimed_at === null
                          ? "true"
                          : "false"
                      }
                      className={[
                        "scroll-mt-6 border p-4 transition-all duration-200",
                        complete &&
                        mission.claimed_at === null
                          ? "border-[rgb(var(--sep-colour-b98c50))] bg-[rgb(var(--sep-colour-21170f))] shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]"
                          : "border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))]",
                      ].join(" ")}
                    >'''

if old_mission_article not in page:
    fail("Could not find the mission card block in missions/page.tsx.")

page = page.replace(old_mission_article, new_mission_article, 1)
write(page_path, page)

claim_path = "components/missions/daily-reward-claim.tsx"
claim = read(claim_path)

old_button_classes = '''        className={[
          compact
            ? "border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[9px] uppercase tracking-[0.14em]"
            : "w-full border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
          "text-[rgb(var(--sep-colour-d9c092))] transition-colors enabled:hover:border-[rgb(var(--sep-colour-a07945))] enabled:hover:bg-[rgb(var(--sep-colour-302116))] disabled:cursor-not-allowed disabled:opacity-45",
        ].join(" ")}'''

new_button_classes = '''        className={[
          compact
            ? "px-3 py-2 text-[9px] uppercase tracking-[0.14em]"
            : "w-full px-3 py-2 text-[10px] uppercase tracking-[0.16em]",
          complete && !claimed
            ? "border border-[rgb(var(--sep-colour-d19a4c))] bg-[rgb(var(--sep-colour-50371f))] font-semibold text-[rgb(var(--sep-colour-ffe4b5))] shadow-[0_0_14px_rgba(var(--sep-rgb-209-154-76),0.22)] transition hover:border-[rgb(var(--sep-colour-e0b062))] hover:bg-[rgb(var(--sep-colour-654321))]"
            : "border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-21170f))] text-[rgb(var(--sep-colour-d9c092))] transition-colors disabled:cursor-not-allowed disabled:opacity-45",
        ].join(" ")}'''

if old_button_classes not in claim:
    fail("Could not find the claim button class block in daily-reward-claim.tsx.")

claim = claim.replace(old_button_classes, new_button_classes, 1)
write(claim_path, claim)

live_path = "components/missions/missions-live-sync.tsx"
live = read(live_path)

mission_anchor = '''      if (button) {
        button.disabled =
          !mission.completed_at ||
          Boolean(mission.claimed_at);

        button.textContent =
          mission.claimed_at
            ? "Claimed"
            : mission.completed_at
              ? "Claim"
              : "In Progress";
      }
    }
'''

mission_replacement = '''      const claimReady =
        Boolean(mission.completed_at) &&
        !mission.claimed_at;

      root.dataset.claimReady =
        claimReady ? "true" : "false";

      root.classList.toggle(
        "border-[rgb(var(--sep-colour-b98c50))]",
        claimReady,
      );
      root.classList.toggle(
        "bg-[rgb(var(--sep-colour-21170f))]",
        claimReady,
      );
      root.classList.toggle(
        "shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]",
        claimReady,
      );
      root.classList.toggle(
        "border-[rgb(var(--sep-colour-60482e))]/45",
        !claimReady,
      );
      root.classList.toggle(
        "bg-[rgb(var(--sep-colour-15100d))]",
        !claimReady,
      );

      if (button) {
        button.disabled =
          !mission.completed_at ||
          Boolean(mission.claimed_at);

        button.textContent =
          mission.claimed_at
            ? "Claimed"
            : mission.completed_at
              ? "Claim"
              : "In Progress";
      }
    }
'''

if mission_anchor not in live:
    fail("Could not find mission live-sync button block.")

live = live.replace(mission_anchor, mission_replacement, 1)

milestone_anchor = '''      if (button) {
        button.disabled =
          !complete ||
          Boolean(milestone.claimed_at);

        button.textContent =
          milestone.claimed_at
            ? "Claimed"
            : complete
              ? "Claim Reward"
              : "In Progress";
      }
    }
'''

milestone_replacement = '''      const claimReady =
        complete &&
        !milestone.claimed_at;

      root.dataset.claimReady =
        claimReady ? "true" : "false";

      root.classList.toggle(
        "border-[rgb(var(--sep-colour-b98c50))]",
        claimReady,
      );
      root.classList.toggle(
        "bg-[rgb(var(--sep-colour-21170f))]",
        claimReady,
      );
      root.classList.toggle(
        "shadow-[0_0_18px_rgba(var(--sep-rgb-185-140-80),0.16)]",
        claimReady,
      );
      root.classList.toggle(
        "border-[rgb(var(--sep-colour-60482e))]/45",
        !claimReady,
      );
      root.classList.toggle(
        "bg-[rgb(var(--sep-colour-15100d))]",
        !claimReady,
      );

      if (button) {
        button.disabled =
          !complete ||
          Boolean(milestone.claimed_at);

        button.textContent =
          milestone.claimed_at
            ? "Claimed"
            : complete
              ? "Claim Reward"
              : "In Progress";
      }
    }
'''

if milestone_anchor not in live:
    fail("Could not find milestone live-sync button block.")

live = live.replace(milestone_anchor, milestone_replacement, 1)
write(live_path, live)

print("\nDone.")
print("Run: npm run build")

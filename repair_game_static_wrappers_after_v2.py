from pathlib import Path

path = Path("app/(portal)/game/page.tsx")

if not path.exists():
    raise SystemExit("Missing app/(portal)/game/page.tsx")

text = path.read_text(encoding="utf-8")

bad_open = """  <article
    data-sep-interaction-fixed="true"
    className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden"
  >
    <div data-sep-interaction-ignore="true" className="contents">

    {room.slug === "house-of-chances" && houseOfChancesState ? ("""

good_open = """  <article
    data-sep-interaction-fixed="true"
    className="flex min-h-0 flex-1 flex-col overflow-visible border border-[rgb(var(--sep-colour-6a5032))]/50 bg-[rgb(var(--sep-colour-17110d))] lg:overflow-hidden"
  >

    {room.slug === "house-of-chances" && houseOfChancesState ? ("""

if bad_open not in text:
    raise SystemExit("Could not find malformed game wrapper opening. No files were changed.")

text = text.replace(bad_open, good_open, 1)

bad_close = """        />

        </div>

        <RoomChatForm"""

good_close = """        />

        <RoomChatForm"""

if bad_close not in text:
    raise SystemExit("Could not find malformed game wrapper closing. No files were changed.")

text = text.replace(bad_close, good_close, 1)

pairs = [
    (
        """    {room.slug === "house-of-chances" && houseOfChancesState ? (
      <HouseOfChancesPanel state={houseOfChancesState} />
    ) : null}""",
        """    {room.slug === "house-of-chances" && houseOfChancesState ? (
      <div data-sep-interaction-ignore="true">
        <HouseOfChancesPanel state={houseOfChancesState} />
      </div>
    ) : null}""",
        "House of Chances panel",
    ),
    (
        """    {room.slug === "odd-jobs-bureau" ? (
      <OddJobsPanel jobs={oddJobs} />
    ) : null}""",
        """    {room.slug === "odd-jobs-bureau" ? (
      <div data-sep-interaction-ignore="true">
        <OddJobsPanel jobs={oddJobs} />
      </div>
    ) : null}""",
        "Odd Jobs panel",
    ),
    (
        """    {room.slug === "the-breeze-lodgings" ? (
      <BreezeLodgingsPanel rooms={breezeLodgings} />
    ) : null}""",
        """    {room.slug === "the-breeze-lodgings" ? (
      <div data-sep-interaction-ignore="true">
        <BreezeLodgingsPanel rooms={breezeLodgings} />
      </div>
    ) : null}""",
        "Breeze Lodgings panel",
    ),
    (
        """    {breezeManageData ? (
      <BreezeLodgingGuestsPanel
        data={breezeManageData}
      />
    ) : null}""",
        """    {breezeManageData ? (
      <div data-sep-interaction-ignore="true">
        <BreezeLodgingGuestsPanel
          data={breezeManageData}
        />
      </div>
    ) : null}""",
        "Breeze guests panel",
    ),
]

for old, new, label in pairs:
    if old not in text:
        raise SystemExit(f"Could not find {label}. No files were changed.")
    text = text.replace(old, new, 1)

old_messages = """        <RoomMessageList
          roomId={room.id}
          roomName={room.name}
          messages={visibleMessages}
          viewerCharacterId={
            character.id
          }
          canViewAllWhispers={
            canViewAllWhispers
          }
          privateLocationTheme={
            privateLocation
              ? {
                  backgroundColour:
                    privateLocation.background_colour,
                  speechColour:
                    privateLocation.speech_colour,
                  actionColour:
                    privateLocation.action_colour,
                  systemColour:
                    privateLocation.system_colour,
                  whisperBackgroundColour:
                    privateLocation.whisper_background_colour,
                  whisperTextColour:
                    privateLocation.whisper_text_colour,
                  offgameBackgroundColour:
                    privateLocation.offgame_background_colour,
                  offgameTextColour:
                    privateLocation.offgame_text_colour,
                }
              : null
          }
        />"""

new_messages = """        <div
          data-sep-interaction-ignore="true"
          className="contents"
        >
          <RoomMessageList
            roomId={room.id}
            roomName={room.name}
            messages={visibleMessages}
            viewerCharacterId={
              character.id
            }
            canViewAllWhispers={
              canViewAllWhispers
            }
            privateLocationTheme={
              privateLocation
                ? {
                    backgroundColour:
                      privateLocation.background_colour,
                    speechColour:
                      privateLocation.speech_colour,
                    actionColour:
                      privateLocation.action_colour,
                    systemColour:
                      privateLocation.system_colour,
                    whisperBackgroundColour:
                      privateLocation.whisper_background_colour,
                    whisperTextColour:
                      privateLocation.whisper_text_colour,
                    offgameBackgroundColour:
                      privateLocation.offgame_background_colour,
                    offgameTextColour:
                      privateLocation.offgame_text_colour,
                  }
                : null
            }
          />
        </div>"""

if old_messages not in text:
    raise SystemExit("Could not find RoomMessageList block. No files were changed.")

text = text.replace(old_messages, new_messages, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Repaired app/(portal)/game/page.tsx JSX.")
print("Static: House of Chances, Odd Jobs, Breeze panels, RoomMessageList.")
print("RoomChatForm remains interactive.")
print("")
print("Run: npm run build")

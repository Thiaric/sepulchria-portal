from pathlib import Path

ROOT = Path.cwd()
PATH = ROOT / "components/admin/music-feature-manager.tsx"

if not PATH.exists():
    raise SystemExit(
        "ERROR: components/admin/music-feature-manager.tsx was not found."
    )

text = PATH.read_text(encoding="utf-8")

def replace_once(old: str, new: str, label: str) -> None:
    global text
    if old not in text:
        raise SystemExit(f"ERROR: Could not find {label}.")
    text = text.replace(old, new, 1)

replace_once(
    '        <form action={(fd) => void upload(fd)} className="bg-[rgb(var(--sep-colour-17110d))] p-5">',
    '''        <form
          onSubmit={(event) => {
            event.preventDefault();
            void upload(
              new FormData(event.currentTarget),
            );
          }}
          className="bg-[rgb(var(--sep-colour-17110d))] p-5"
        >''',
    "the Upload Track form",
)

replace_once(
    '            <input name="sort_order" type="number" defaultValue={0} className={input} />',
    '''            <label className="block">
              <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                Sort order
              </span>
              <input
                name="sort_order"
                type="number"
                defaultValue={0}
                className={input}
              />
            </label>''',
    "the create Sort order field",
)

replace_once(
    '            <button disabled={busy} className={button}>{busy ? "Working..." : "Upload Track"}</button>',
    '''            <button
              type="submit"
              disabled={busy}
              className={button}
            >
              {busy ? "Working..." : "Upload Track"}
            </button>''',
    "the Upload Track button",
)

replace_once(
    '              <form key={track.id} action={(fd) => void update(track, fd)} className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4">',
    '''              <form
                key={track.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  void update(
                    track,
                    new FormData(event.currentTarget),
                  );
                }}
                className="border border-[rgb(var(--sep-colour-59432c))]/40 bg-[rgb(var(--sep-colour-17110d))] p-4"
              >''',
    "the Save Track form",
)

replace_once(
    '                  <input name="sort_order" type="number" defaultValue={track.sort_order} className={input} />',
    '''                  <label>
                    <span className="mb-1.5 block text-[8px] uppercase tracking-[0.16em] text-[rgb(var(--sep-colour-806b50))]">
                      Sort order
                    </span>
                    <input
                      name="sort_order"
                      type="number"
                      defaultValue={track.sort_order}
                      className={input}
                    />
                  </label>''',
    "the edit Sort order field",
)

replace_once(
    '                  <button disabled={busy} className={button}>Save Track</button>',
    '''                  <button
                    type="submit"
                    disabled={busy}
                    className={button}
                  >
                    Save Track
                  </button>''',
    "the Save Track button",
)

PATH.write_text(text, encoding="utf-8")

print("Fixed music admin forms.")

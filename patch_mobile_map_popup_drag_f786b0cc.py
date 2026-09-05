from pathlib import Path
import subprocess
import shutil

ROOT = Path.cwd()

def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()

head = git("rev-parse", "HEAD")
if not head.startswith("f786b0cc"):
    raise SystemExit(
        f"STOP: expected HEAD f786b0cc, but found {head[:12]}.\nNo files were changed."
    )

path = ROOT / "components" / "portal" / "interactive-world-map.tsx"
if not path.exists():
    raise SystemExit("Could not find components/portal/interactive-world-map.tsx")

text = path.read_text(encoding="utf-8")

old_state = '''  const [isMobile, setIsMobile] =
    useState(false);

  const [isNight, setIsNight] =
'''

new_state = '''  const [isMobile, setIsMobile] =
    useState(false);

  const [
    mobilePopupOffsetY,
    setMobilePopupOffsetY,
  ] = useState(0);

  const [
    mobileTidingsHeight,
    setMobileTidingsHeight,
  ] = useState(0);

  const mobilePopupDragRef =
    useRef<{
      pointerId: number;
      startY: number;
      startOffsetY: number;
    } | null>(null);

  const [isNight, setIsNight] =
'''

if old_state not in text:
    raise SystemExit("Could not find the mobile state block. No files were changed.")
text = text.replace(old_state, new_state, 1)

old_effect_anchor = '''  useEffect(() => {
    function updateTimeOfDay() {
'''

new_effects = '''  useEffect(() => {
    function measureTidings() {
      const ticker =
        document.querySelector<HTMLElement>(
          'footer[aria-label="Tidings"]',
        );

      setMobileTidingsHeight(
        ticker
          ? Math.ceil(
              ticker.getBoundingClientRect()
                .height,
            )
          : 0,
      );
    }

    measureTidings();

    const observer =
      new MutationObserver(
        measureTidings,
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    );

    window.addEventListener(
      "resize",
      measureTidings,
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        measureTidings,
      );
    };
  }, []);

  useEffect(() => {
    setMobilePopupOffsetY(0);
  }, [hoveredArea]);

  useEffect(() => {
    function updateTimeOfDay() {
'''

if old_effect_anchor not in text:
    raise SystemExit("Could not find the time-of-day effect anchor. No files were changed.")
text = text.replace(old_effect_anchor, new_effects, 1)

old_popup = '''  <div className="fixed inset-x-3 bottom-[72px] z-[80] max-h-[42dvh] overflow-hidden border border-[rgb(var(--sep-colour-8f6a3d))]/80 bg-[rgb(var(--sep-colour-120b09))]/[0.98] shadow-[0_-12px_36px_rgba(var(--sep-rgb-0-0-0),0.72)] backdrop-blur md:hidden">
    <div className="flex items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-654c2f))]/40 px-4 py-3">
'''

new_popup = '''  <div
    className="fixed inset-x-3 z-[80] max-h-[42dvh] overflow-hidden border border-[rgb(var(--sep-colour-8f6a3d))]/80 bg-[rgb(var(--sep-colour-120b09))]/[0.98] shadow-[0_-12px_36px_rgba(var(--sep-rgb-0-0-0),0.72)] backdrop-blur md:hidden"
    style={{
      bottom:
        `${72 + mobileTidingsHeight}px`,
      transform:
        `translateY(${mobilePopupOffsetY}px)`,
    }}
  >
    <div
      onPointerDown={(event) => {
        const target =
          event.target as HTMLElement;

        if (
          target.closest(
            "button, a, input, textarea, select",
          )
        ) {
          return;
        }

        mobilePopupDragRef.current = {
          pointerId: event.pointerId,
          startY: event.clientY,
          startOffsetY:
            mobilePopupOffsetY,
        };

        event.currentTarget
          .setPointerCapture(
            event.pointerId,
          );
      }}
      onPointerMove={(event) => {
        const drag =
          mobilePopupDragRef.current;

        if (
          !drag ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        const deltaY =
          event.clientY -
          drag.startY;

        const maxLift =
          Math.max(
            140,
            Math.floor(
              window.innerHeight *
                0.5,
            ),
          );

        setMobilePopupOffsetY(
          Math.max(
            -maxLift,
            Math.min(
              0,
              drag.startOffsetY +
                deltaY,
            ),
          ),
        );
      }}
      onPointerUp={(event) => {
        const drag =
          mobilePopupDragRef.current;

        if (
          !drag ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        mobilePopupDragRef.current =
          null;

        try {
          event.currentTarget
            .releasePointerCapture(
              event.pointerId,
            );
        } catch {}
      }}
      onPointerCancel={() => {
        mobilePopupDragRef.current =
          null;
      }}
      className="relative flex touch-none select-none items-start justify-between gap-3 border-b border-[rgb(var(--sep-colour-654c2f))]/40 px-4 pb-3 pt-5 cursor-grab active:cursor-grabbing"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1.5 h-1 w-12 -translate-x-1/2 rounded-full bg-[rgb(var(--sep-colour-8f7757))]/70"
      />
'''

if old_popup not in text:
    raise SystemExit("Could not find the current mobile district popup block. No files were changed.")
text = text.replace(old_popup, new_popup, 1)

backup = path.with_suffix(".tsx.before_mobile_popup_drag.bak")
if not backup.exists():
    shutil.copy2(path, backup)

path.write_text(text, encoding="utf-8")

print("DONE")
print("Patched current commit f786b0cc.")
print("Mobile district popup now sits above Tidings dynamically and can be dragged vertically by its header.")
print("Run: npm run build")

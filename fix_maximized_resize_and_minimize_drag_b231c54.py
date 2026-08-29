from pathlib import Path

path = Path("components/portal/portal-sidebar.tsx")

if not path.exists():
    raise SystemExit("Missing components/portal/portal-sidebar.tsx")

text = path.read_text(encoding="utf-8")

# ------------------------------------------------------------
# 1. Minimise/collapse must leave maximized mode first.
#    Otherwise restoring the collapsed title bar produces a
#    visually open window that still refuses title-bar dragging.
# ------------------------------------------------------------

old_collapse = """            <button
              type="button"
              onClick={() =>
                setCollapsed(
                  (current) =>
                    !current,
                )
              }
              aria-label={
                collapsed
                  ? `Restore ${item.label}`
                  : `Collapse ${item.label}`
              }"""

new_collapse = """            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  return;
                }

                /*
                 * A collapsed window must always restore as a normal
                 * movable window. If it was maximized, leave maximized
                 * mode before collapsing it.
                 */
                if (maximized) {
                  setMaximized(false);
                }

                setCollapsed(true);
              }}
              aria-label={
                collapsed
                  ? `Restore ${item.label}`
                  : `Collapse ${item.label}`
              }"""

if old_collapse not in text:
    raise SystemExit(
        "Could not find the current collapse button implementation. "
        "No files were changed."
    )

text = text.replace(old_collapse, new_collapse, 1)

# ------------------------------------------------------------
# 2. Show the bottom-right resize corner for every open window,
#    including maximized windows.
# ------------------------------------------------------------

old_condition = """          {!maximized ? (
            <div
              role="separator"
              aria-label={`Resize ${item.label}`}"""

new_condition = """          {!collapsed ? (
            <div
              role="separator"
              aria-label={`Resize ${item.label}`}"""

if old_condition not in text:
    raise SystemExit(
        "Could not find the resize-handle visibility condition. "
        "No files were changed."
    )

text = text.replace(old_condition, new_condition, 1)

# ------------------------------------------------------------
# 3. If resizing begins while maximized, convert the current
#    fullscreen geometry into the restored rect FIRST, then let
#    the same pointer gesture resize it immediately.
# ------------------------------------------------------------

old_resize_start = """                event.preventDefault();

                resizeRef.current = {
                  pointerId:
                    event.pointerId,
                  startX:
                    event.clientX,
                  startY:
                    event.clientY,
                  originWidth:
                    rect.width,
                  originHeight:
                    rect.height,
                };

                event.currentTarget.setPointerCapture(
                  event.pointerId,
                );"""

new_resize_start = """                event.preventDefault();

                let resizeOriginWidth =
                  rect.width;

                let resizeOriginHeight =
                  rect.height;

                if (maximized) {
                  /*
                   * Resizing a maximized window should feel like a desktop
                   * window: grabbing the corner immediately drops it out of
                   * maximized mode at the same visible size, then the drag
                   * shrinks/grows it from that exact corner.
                   */
                  const fullscreenRect =
                    clampRect({
                      x: 8,
                      y: 8,
                      width:
                        window.innerWidth -
                        16,
                      height:
                        window.innerHeight -
                        16,
                    });

                  resizeOriginWidth =
                    fullscreenRect.width;

                  resizeOriginHeight =
                    fullscreenRect.height;

                  setRect(fullscreenRect);
                  setMaximized(false);
                }

                resizeRef.current = {
                  pointerId:
                    event.pointerId,
                  startX:
                    event.clientX,
                  startY:
                    event.clientY,
                  originWidth:
                    resizeOriginWidth,
                  originHeight:
                    resizeOriginHeight,
                };

                event.currentTarget.setPointerCapture(
                  event.pointerId,
                );"""

if old_resize_start not in text:
    raise SystemExit(
        "Could not find the resize pointer-start implementation. "
        "No files were changed."
    )

text = text.replace(old_resize_start, new_resize_start, 1)

path.write_text(text, encoding="utf-8")

print("SUCCESS")
print("")
print("Fixed PublicPageModal window-state behaviour:")
print("  - resize corner is visible while maximized too")
print("  - dragging that corner while maximized immediately restores + resizes")
print("  - [-] on a maximized window now leaves maximized mode before collapsing")
print("  - reopening a [-]-collapsed window is therefore draggable immediately")
print("  - ordinary restored-window resizing still works as before")
print("")
print("Excluded utility modals are untouched.")
print("")
print("Changed only:")
print("  components/portal/portal-sidebar.tsx")
print("")
print("Run: npm run build")

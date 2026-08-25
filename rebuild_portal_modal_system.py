from pathlib import Path

ROOT = Path.cwd()

SIDEBAR = ROOT / "components/portal/portal-sidebar.tsx"
MODAL_BUTTON = ROOT / "components/portal/portal-modal-button.tsx"


def fail(message: str) -> None:
    raise SystemExit(
        f"ERROR: {message}\nNo changes were applied."
    )


for path in (SIDEBAR, MODAL_BUTTON):
    if not path.exists():
        fail(f"Missing expected file: {path.relative_to(ROOT)}")


sidebar = SIDEBAR.read_text(encoding="utf-8")
modal_button = MODAL_BUTTON.read_text(encoding="utf-8")

old_open_modal = '''export function openPortalModal(payload: PortalModalPayload) {
  window.dispatchEvent(
    new CustomEvent("sepulchria:open-public-modal", { detail: payload }),
  );
}
'''

new_open_modal = '''export function openPortalModal(payload: PortalModalPayload) {
  if (window.self !== window.top) {
    window.parent.postMessage(
      {
        type: "sepulchria:open-public-modal",
        detail: payload,
      },
      window.location.origin,
    );
    return;
  }

  window.dispatchEvent(
    new CustomEvent("sepulchria:open-public-modal", { detail: payload }),
  );
}
'''

if modal_button.count(old_open_modal) == 1:
    modal_button = modal_button.replace(
        old_open_modal,
        new_open_modal,
        1,
    )
elif modal_button.count(new_open_modal) != 1:
    fail(
        "Could not find the expected openPortalModal implementation."
    )

effect_start_marker = '''  useEffect(() => {
    /*
     * A page rendered inside a portal modal still mounts the portal layout,
'''

effect_end_marker = '''  function renderNavigationItem(
'''

effect_start = sidebar.find(effect_start_marker)
effect_end = sidebar.find(effect_end_marker)

if effect_start == -1 or effect_end == -1 or effect_end <= effect_start:
    fail(
        "Could not locate the current external-modal listener block."
    )

new_modal_listener = '''  useEffect(() => {
    if (window.self !== window.top) {
      return;
    }

    type ExternalModalDetail = {
      label: string;
      title: string;
      icon: string;
      href: string;
    };

    function replaceCurrentModal(
      detail:
        | ExternalModalDetail
        | null
        | undefined,
    ) {
      if (!detail?.href) {
        return;
      }

      setModalItem({
        ...detail,
        activePaths: [
          detail.href.split("?")[0],
        ],
        opensModal: true,
      });
    }

    function handleExternalModalOpen(
      event: Event,
    ) {
      replaceCurrentModal(
        (
          event as CustomEvent<ExternalModalDetail>
        ).detail,
      );
    }

    function handleIframeModalOpen(
      event: MessageEvent,
    ) {
      if (
        event.origin !==
          window.location.origin ||
        event.data?.type !==
          "sepulchria:open-public-modal"
      ) {
        return;
      }

      replaceCurrentModal(
        event.data.detail as
          | ExternalModalDetail
          | undefined,
      );
    }

    window.addEventListener(
      "sepulchria:open-public-modal",
      handleExternalModalOpen,
    );

    window.addEventListener(
      "message",
      handleIframeModalOpen,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:open-public-modal",
        handleExternalModalOpen,
      );

      window.removeEventListener(
        "message",
        handleIframeModalOpen,
      );
    };
  }, []);

'''

sidebar = (
    sidebar[:effect_start]
    + new_modal_listener
    + sidebar[effect_end:]
)

modal_start_marker = '''function PublicPageModal({
'''
modal_end_marker = '''function NavigationGroup({
'''

modal_start = sidebar.find(modal_start_marker)
modal_end = sidebar.find(modal_end_marker)

if modal_start == -1 or modal_end == -1 or modal_end <= modal_start:
    fail(
        "Could not locate the current PublicPageModal function."
    )

new_public_page_modal = '''function PublicPageModal({
  item,
  onClose,
}: {
  item: NavigationItem;
  onClose: () => void;
}) {
  type ModalRect = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  type DragState = {
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  };

  type ResizeState = {
    pointerId: number;
    startX: number;
    startY: number;
    originWidth: number;
    originHeight: number;
  };

  const [collapsed, setCollapsed] =
    useState(false);

  const [rect, setRect] =
    useState<ModalRect>({
      x: 8,
      y: 8,
      width: 900,
      height: 700,
    });

  const initialisedRef =
    useRef(false);

  const dragRef =
    useRef<DragState | null>(null);

  const resizeRef =
    useRef<ResizeState | null>(null);

  const separator =
    item.href.includes("?")
      ? "&"
      : "?";

  const iframeSrc =
    `${item.href}${separator}embedded=1`;

  const isLargeModal =
    item.href === "/messages" ||
    item.href.startsWith(
      "/messages/",
    ) ||
    item.href === "/characters" ||
    item.href.startsWith(
      "/characters/",
    ) ||
    item.href === "/forum" ||
    item.href.startsWith(
      "/forum/",
    );

  const clampRect =
    useCallback(
      (
        candidate: ModalRect,
      ): ModalRect => {
        const margin = 8;

        const viewportWidth =
          window.innerWidth;

        const viewportHeight =
          window.innerHeight;

        const maxWidth =
          Math.max(
            320,
            viewportWidth -
              margin * 2,
          );

        const maxHeight =
          Math.max(
            220,
            viewportHeight -
              margin * 2,
          );

        const minWidth =
          Math.min(
            420,
            maxWidth,
          );

        const minHeight =
          Math.min(
            280,
            maxHeight,
          );

        const width =
          Math.min(
            maxWidth,
            Math.max(
              minWidth,
              candidate.width,
            ),
          );

        const height =
          Math.min(
            maxHeight,
            Math.max(
              minHeight,
              candidate.height,
            ),
          );

        const x =
          Math.min(
            viewportWidth -
              margin -
              width,
            Math.max(
              margin,
              candidate.x,
            ),
          );

        const y =
          Math.min(
            viewportHeight -
              margin -
              height,
            Math.max(
              margin,
              candidate.y,
            ),
          );

        return {
          x,
          y,
          width,
          height,
        };
      },
      [],
    );

  useEffect(() => {
    if (initialisedRef.current) {
      return;
    }

    initialisedRef.current = true;

    const margin = 8;

    const viewportWidth =
      window.innerWidth;

    const viewportHeight =
      window.innerHeight;

    const preferredWidth =
      isLargeModal
        ? viewportWidth -
          margin * 2
        : Math.min(
            viewportWidth -
              margin * 2,
            Math.max(
              720,
              viewportWidth * 0.76,
            ),
          );

    const preferredHeight =
      isLargeModal
        ? viewportHeight -
          margin * 2
        : Math.min(
            viewportHeight -
              margin * 2,
            Math.max(
              520,
              viewportHeight * 0.76,
            ),
          );

    setRect(
      clampRect({
        x:
          (
            viewportWidth -
            preferredWidth
          ) / 2,
        y:
          (
            viewportHeight -
            preferredHeight
          ) / 2,
        width:
          preferredWidth,
        height:
          preferredHeight,
      }),
    );
  }, [
    clampRect,
    isLargeModal,
  ]);

  useEffect(() => {
    function handleViewportResize() {
      setRect(
        (current) =>
          clampRect(current),
      );
    }

    window.addEventListener(
      "resize",
      handleViewportResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleViewportResize,
      );
    };
  }, [clampRect]);

  const collapsedWidth =
    Math.min(
      rect.width,
      420,
    );

  const visibleWidth =
    collapsed
      ? collapsedWidth
      : rect.width;

  const visibleHeight =
    collapsed
      ? 40
      : rect.height;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={item.label}
      className="pointer-events-none fixed inset-0 z-[9999]"
    >
      <div
        style={{
          left: `${rect.x}px`,
          top: `${rect.y}px`,
          width: `${visibleWidth}px`,
          height: `${visibleHeight}px`,
        }}
        className="pointer-events-auto fixed flex min-h-0 min-w-0 flex-col overflow-hidden border border-[rgb(var(--sep-colour-6e5535))]/65 bg-[rgb(var(--sep-colour-090705))] shadow-[0_20px_80px_rgba(var(--sep-rgb-0-0-0),0.65)]"
      >
        <div
          className="flex h-10 shrink-0 cursor-move select-none items-center justify-between border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3"
          onPointerDown={(
            event,
          ) => {
            if (
              event.button !== 0 ||
              (
                event.target as HTMLElement
              ).closest("button")
            ) {
              return;
            }

            dragRef.current = {
              pointerId:
                event.pointerId,
              startX:
                event.clientX,
              startY:
                event.clientY,
              originX:
                rect.x,
              originY:
                rect.y,
            };

            event.currentTarget.setPointerCapture(
              event.pointerId,
            );
          }}
          onPointerMove={(
            event,
          ) => {
            const drag =
              dragRef.current;

            if (
              !drag ||
              drag.pointerId !==
                event.pointerId
            ) {
              return;
            }

            const dx =
              event.clientX -
              drag.startX;

            const dy =
              event.clientY -
              drag.startY;

            setRect(
              (current) =>
                clampRect({
                  ...current,
                  x:
                    drag.originX +
                    dx,
                  y:
                    drag.originY +
                    dy,
                }),
            );
          }}
          onPointerUp={(
            event,
          ) => {
            if (
              dragRef.current
                ?.pointerId !==
              event.pointerId
            ) {
              return;
            }

            dragRef.current = null;

            if (
              event.currentTarget.hasPointerCapture(
                event.pointerId,
              )
            ) {
              event.currentTarget.releasePointerCapture(
                event.pointerId,
              );
            }
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`flex shrink-0 items-center justify-center ${
                item.subItem
                  ? "h-4 w-4"
                  : "h-[18px] w-[18px]"
              }`}
            >
              <img
                src={item.icon}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-contain opacity-35"
              />
            </span>

            <span className="truncate font-serif text-sm text-[rgb(var(--sep-colour-d8c096))]">
              {item.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
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
              }
              title={
                collapsed
                  ? "Restore window"
                  : "Collapse window"
              }
              className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-sm leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
            >
              {collapsed
                ? "□"
                : "−"}
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${item.label}`}
              title={`Close ${item.label}`}
              className="flex h-7 w-7 cursor-pointer items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-17110d))] text-base leading-none text-[rgb(var(--sep-colour-aa9675))] transition hover:border-[rgb(var(--sep-colour-967342))] hover:text-[rgb(var(--sep-colour-f1d7a5))]"
            >
              ×
            </button>
          </div>
        </div>

        {!collapsed ? (
          <>
            <iframe
              src={iframeSrc}
              title={item.label}
              onLoad={(event) => {
                const doc =
                  event.currentTarget
                    .contentDocument;

                if (!doc) {
                  return;
                }

                const styleId =
                  "sepulchria-stable-modal-style";

                let style =
                  doc.getElementById(
                    styleId,
                  ) as
                    | HTMLStyleElement
                    | null;

                if (!style) {
                  style =
                    doc.createElement(
                      "style",
                    );

                  style.id =
                    styleId;

                  doc.head.appendChild(
                    style,
                  );
                }

                style.textContent = `
                  [data-portal-header],
                  .portal-left-shell,
                  footer[aria-label="Tidings"] {
                    display: none !important;
                  }

                  html,
                  body,
                  [data-portal-shell],
                  [data-portal-shell-inner] {
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    max-width: none !important;
                    overflow: hidden !important;
                  }

                  .sepulchria-viewport-body {
                    display: grid !important;
                    grid-template-columns:
                      minmax(0, 1fr)
                      minmax(240px, 300px) !important;
                    width: 100% !important;
                    max-width: none !important;
                    height: 100% !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                  }

                  [data-portal-centre-host] {
                    grid-column: 1 !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    height: 100% !important;
                    min-height: 0 !important;
                  }

                  [data-portal-centre-host]
                    > [data-portal-column] {
                    width: 100% !important;
                    max-width: none !important;
                    height: 100% !important;
                    min-height: 0 !important;
                    overflow-y: auto !important;
                    overflow-x: auto !important;
                  }

                  .portal-right-shell {
                    display: block !important;
                    grid-column: 2 !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    height: 100% !important;
                    min-height: 0 !important;
                    overflow: hidden !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar] {
                    position: relative !important;
                    inset: auto !important;
                    z-index: auto !important;
                    display: flex !important;
                    width: 100% !important;
                    min-width: 0 !important;
                    height: 100% !important;
                    min-height: 0 !important;
                    transform: none !important;
                    overflow: hidden !important;
                    box-shadow: none !important;
                    transition: none !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:first-child,
                  .portal-right-shell
                    > button,
                  .portal-right-collapse-toggle {
                    display: none !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:nth-child(2) {
                    padding:
                      var(
                        --portal-column-pad,
                        0.8rem
                      ) !important;
                  }

                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:nth-child(2)
                    > div:first-child
                    > div:first-child,
                  .portal-right-shell
                    > [data-portal-right-sidebar]
                    > div:nth-child(2)
                    > div:last-child {
                    display: none !important;
                  }

                  @media (max-width: 899px) {
                    .sepulchria-viewport-body {
                      grid-template-columns:
                        minmax(0, 1fr) !important;
                    }

                    .portal-right-shell {
                      display: none !important;
                    }
                  }
                `;
              }}
              className="min-h-0 w-full flex-1 border-0 bg-[rgb(var(--sep-colour-090705))]"
            />

            <div
              role="separator"
              aria-label={`Resize ${item.label}`}
              title="Resize window"
              className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-se-resize"
              onPointerDown={(
                event,
              ) => {
                if (
                  event.button !== 0
                ) {
                  return;
                }

                event.preventDefault();

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
                );
              }}
              onPointerMove={(
                event,
              ) => {
                const resize =
                  resizeRef.current;

                if (
                  !resize ||
                  resize.pointerId !==
                    event.pointerId
                ) {
                  return;
                }

                const dx =
                  event.clientX -
                  resize.startX;

                const dy =
                  event.clientY -
                  resize.startY;

                setRect(
                  (current) =>
                    clampRect({
                      ...current,
                      width:
                        resize.originWidth +
                        dx,
                      height:
                        resize.originHeight +
                        dy,
                    }),
                );
              }}
              onPointerUp={(
                event,
              ) => {
                if (
                  resizeRef.current
                    ?.pointerId !==
                  event.pointerId
                ) {
                  return;
                }

                resizeRef.current =
                  null;

                if (
                  event.currentTarget.hasPointerCapture(
                    event.pointerId,
                  )
                ) {
                  event.currentTarget.releasePointerCapture(
                    event.pointerId,
                  );
                }
              }}
              onPointerCancel={() => {
                resizeRef.current =
                  null;
              }}
            >
              <span
                aria-hidden="true"
                className="absolute bottom-1 right-1 block h-2.5 w-2.5 border-b border-r border-[rgb(var(--sep-colour-a98b61))]/80"
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

'''

sidebar = (
    sidebar[:modal_start]
    + new_public_page_modal
    + sidebar[modal_end:]
)

required_sidebar_markers = [
    "function PublicPageModal({",
    "type ModalRect = {",
    "type ResizeState = {",
    "cursor-se-resize",
    "sepulchria-stable-modal-style",
    'window.addEventListener(\n      "message",',
    'event.data?.type !==\n          "sepulchria:open-public-modal"',
    "function NavigationGroup({",
]

for marker in required_sidebar_markers:
    if marker not in sidebar:
        fail(
            f"Safety check failed: missing {marker!r}"
        )

for forbidden in [
    "__sepulchriaModalBridgeInstalled",
    "ResizeObserver",
    "sm:resize",
    "rememberModalSize",
    "modalSize",
    "sepulchria-centre-only-modal-style",
]:
    if forbidden in sidebar:
        fail(
            f"Old modal machinery still remains: {forbidden!r}"
        )

if "window.parent.postMessage(" not in modal_button:
    fail(
        "Safety check failed: iframe postMessage route is missing."
    )

SIDEBAR.write_text(
    sidebar,
    encoding="utf-8",
    newline="\n",
)

MODAL_BUTTON.write_text(
    modal_button,
    encoding="utf-8",
    newline="\n",
)

print("WROTE  components/portal/portal-sidebar.tsx")
print("WROTE  components/portal/portal-modal-button.tsx")
print()
print("MODAL SYSTEM REPLACED")
print()
print("- One top-level modal owner.")
print("- One modal at a time; iframe modal requests replace the current modal.")
print("- Explicit React x/y/width/height.")
print("- Dedicated pointer-driven resize handle.")
print("- No native CSS resize.")
print("- No ResizeObserver.")
print("- No modal-size/browser-size competition.")
print("- Collapse preserves the full expanded rectangle.")
print("- Restore returns to the exact expanded size.")
print("- Stable embedded layout; no portal mobile-shell switch at 1279px.")
print("- Under 900px modal content becomes single-column and hides Context.")
print("- No anonymous iframe CustomEvent bridge.")
print()
print("Next: npm run build")

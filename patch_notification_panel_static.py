from pathlib import Path

path = Path("components/notifications/notification-bell.tsx")
if not path.exists():
    raise SystemExit("Missing components/notifications/notification-bell.tsx. Run from repo root.")
text = path.read_text(encoding="utf-8")

old = 'import Link from "next/link";\nimport { Bell } from "lucide-react";\nimport { useCallback, useEffect, useMemo, useRef, useState } from "react";'
new = 'import Link from "next/link";\nimport { Bell } from "lucide-react";\nimport { createPortal } from "react-dom";\nimport { useCallback, useEffect, useMemo, useRef, useState } from "react";'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 1 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

old = '  const rootRef = useRef<HTMLDivElement>(null);\n  const [open, setOpen] = useState(false);\n  const [rows, setRows] = useState<NotificationRow[]>([]);\n  const [loading, setLoading] = useState(true);'
new = '  const rootRef = useRef<HTMLDivElement>(null);\n  const buttonRef = useRef<HTMLButtonElement>(null);\n  const panelRef = useRef<HTMLDivElement>(null);\n  const [open, setOpen] = useState(false);\n  const [rows, setRows] = useState<NotificationRow[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [panelPosition, setPanelPosition] = useState({\n    top: 0,\n    right: 12,\n  });'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 2 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

old = '  useEffect(() => {\n    function onMouseDown(event: MouseEvent) {\n      if (\n        open &&\n        rootRef.current &&\n        !rootRef.current.contains(event.target as Node)\n      ) {\n        setOpen(false);\n      }\n    }\n\n    document.addEventListener("mousedown", onMouseDown);\n    return () => document.removeEventListener("mousedown", onMouseDown);\n  }, [open]);'
new = '  useEffect(() => {\n    function updatePanelPosition() {\n      const button = buttonRef.current;\n      if (!button) return;\n\n      const rect = button.getBoundingClientRect();\n\n      setPanelPosition({\n        top: rect.bottom + 8,\n        right: Math.max(\n          12,\n          window.innerWidth - rect.right,\n        ),\n      });\n    }\n\n    function onMouseDown(event: MouseEvent) {\n      if (!open) return;\n\n      const target = event.target as Node;\n\n      if (\n        rootRef.current?.contains(target) ||\n        panelRef.current?.contains(target)\n      ) {\n        return;\n      }\n\n      setOpen(false);\n    }\n\n    if (open) {\n      updatePanelPosition();\n      window.addEventListener("resize", updatePanelPosition);\n      window.addEventListener("scroll", updatePanelPosition, true);\n    }\n\n    document.addEventListener("mousedown", onMouseDown);\n\n    return () => {\n      document.removeEventListener("mousedown", onMouseDown);\n      window.removeEventListener("resize", updatePanelPosition);\n      window.removeEventListener("scroll", updatePanelPosition, true);\n    };\n  }, [open]);'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 3 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

old = '      <button\n        type="button"\n        onClick={() => void toggle()}'
new = '      <button\n        ref={buttonRef}\n        type="button"\n        onClick={() => void toggle()}'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 4 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

old = '      {open ? (\n        <div className="absolute right-0 top-full z-[90] mt-2 w-[min(390px,calc(100vw-24px))] border border-[rgb(var(--sep-colour-6e5535))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl">'
new = '      {open && typeof document !== "undefined"\n        ? createPortal(\n            <div\n              ref={panelRef}\n              data-vocabulary-static\n              className="fixed z-[9999] w-[min(390px,calc(100vw-24px))] !translate-x-0 !translate-y-0 !scale-100 !transform-none !animate-none !opacity-100 !transition-none !filter-none border border-[rgb(var(--sep-colour-6e5535))]/70 bg-[rgb(var(--sep-colour-100c09))] shadow-2xl"\n              style={{\n                top: panelPosition.top,\n                right: panelPosition.right,\n                transform: "none",\n                filter: "none",\n                animation: "none",\n                transition: "none",\n                opacity: 1,\n              }}\n            >'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 5 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

old = '        </div>\n      ) : null}\n    </div>\n  );\n}'
new = '            </div>,\n            document.body,\n          )\n        : null}\n    </div>\n  );\n}'
count = text.count(old)
if count != 1:
    raise SystemExit("Replacement 6 expected 1 match, found " + str(count))
text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("✓ Notification panel detached from animated header.")
print("✓ Panel movement, transform, filter and animation disabled.")
print("Run: npm run build")

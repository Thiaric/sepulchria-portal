from pathlib import Path
import re

BASE = "91d04dd"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected {BASE}.")
    return text.replace(old, new, 1)

files = {}

new_path = Path("components/forms/inline-action-form.tsx")
if new_path.exists():
    raise SystemExit("components/forms/inline-action-form.tsx already exists.")
new_file_text = '"use client";\n\nimport {\n  type ComponentProps,\n  type ReactNode,\n  useActionState,\n  useEffect,\n  useLayoutEffect,\n  useRef,\n  useState,\n} from "react";\nimport { useRouter } from "next/navigation";\n\ntype ServerAction = (\n  formData: FormData,\n) => Promise<unknown>;\n\ntype InlineResult = {\n  kind: "idle" | "success" | "error";\n  message: string;\n  nonce: number;\n};\n\ntype Props = Omit<\n  ComponentProps<"form">,\n  "action" | "children"\n> & {\n  action: ServerAction;\n  children: ReactNode;\n  successMessage?: string;\n};\n\nfunction resultMessage(\n  value: unknown,\n  fallback: string,\n) {\n  if (\n    value &&\n    typeof value === "object" &&\n    "message" in value &&\n    typeof (\n      value as {\n        message?: unknown;\n      }\n    ).message === "string"\n  ) {\n    return (\n      value as {\n        message: string;\n      }\n    ).message;\n  }\n\n  return fallback;\n}\n\nfunction resultFailed(\n  value: unknown,\n) {\n  return Boolean(\n    value &&\n      typeof value === "object" &&\n      "ok" in value &&\n      (\n        value as {\n          ok?: unknown;\n        }\n      ).ok === false,\n  );\n}\n\nfunction errorMessage(\n  error: unknown,\n) {\n  return error instanceof Error &&\n    error.message\n    ? error.message\n    : "Unable to complete this action.";\n}\n\nfunction pendingText(\n  label: string,\n) {\n  const value =\n    label.toLowerCase();\n\n  if (\n    value.includes("remove") ||\n    value.includes("delete")\n  ) {\n    return "Removing...";\n  }\n\n  if (\n    value.includes("assign")\n  ) {\n    return "Assigning...";\n  }\n\n  if (\n    value.includes("add")\n  ) {\n    return "Adding...";\n  }\n\n  return "Saving...";\n}\n\nexport function InlineActionForm({\n  action,\n  children,\n  successMessage = "Saved successfully.",\n  onSubmit,\n  ...props\n}: Props) {\n  const router = useRouter();\n\n  const submitButtonRef =\n    useRef<HTMLButtonElement | null>(\n      null,\n    );\n\n  const originalLabelRef =\n    useRef("");\n\n  const scrollRef =\n    useRef<{\n      x: number;\n      y: number;\n    } | null>(null);\n\n  const [\n    showFeedback,\n    setShowFeedback,\n  ] = useState(false);\n\n  const [\n    state,\n    dispatch,\n    pending,\n  ] = useActionState<\n    InlineResult,\n    FormData\n  >(\n    async (\n      previous,\n      formData,\n    ) => {\n      try {\n        const result =\n          await action(formData);\n\n        if (resultFailed(result)) {\n          return {\n            kind: "error",\n            message:\n              resultMessage(\n                result,\n                "Unable to complete this action.",\n              ),\n            nonce:\n              previous.nonce + 1,\n          };\n        }\n\n        return {\n          kind: "success",\n          message:\n            resultMessage(\n              result,\n              successMessage,\n            ),\n          nonce:\n            previous.nonce + 1,\n        };\n      } catch (error) {\n        return {\n          kind: "error",\n          message:\n            errorMessage(error),\n          nonce:\n            previous.nonce + 1,\n        };\n      }\n    },\n    {\n      kind: "idle",\n      message: "",\n      nonce: 0,\n    },\n  );\n\n  useEffect(() => {\n    const button =\n      submitButtonRef.current;\n\n    if (!button) return;\n\n    if (pending) {\n      button.disabled = true;\n      button.setAttribute(\n        "aria-busy",\n        "true",\n      );\n      button.classList.add(\n        "cursor-wait",\n        "opacity-60",\n      );\n      button.textContent =\n        pendingText(\n          originalLabelRef.current ||\n            "Save",\n        );\n      return;\n    }\n\n    button.disabled = false;\n    button.removeAttribute(\n      "aria-busy",\n    );\n    button.classList.remove(\n      "cursor-wait",\n      "opacity-60",\n    );\n\n    if (\n      originalLabelRef.current\n    ) {\n      button.textContent =\n        originalLabelRef.current;\n    }\n  }, [pending]);\n\n  useEffect(() => {\n    if (\n      state.kind === "idle"\n    ) {\n      return;\n    }\n\n    setShowFeedback(true);\n\n    const timer =\n      window.setTimeout(\n        () =>\n          setShowFeedback(false),\n        5000,\n      );\n\n    if (\n      state.kind === "success"\n    ) {\n      router.refresh();\n    }\n\n    return () =>\n      window.clearTimeout(timer);\n  }, [\n    router,\n    state.kind,\n    state.nonce,\n  ]);\n\n  useLayoutEffect(() => {\n    const saved =\n      scrollRef.current;\n\n    if (!saved) return;\n\n    window.scrollTo({\n      left: saved.x,\n      top: saved.y,\n      behavior: "instant",\n    });\n  }, [\n    pending,\n    state.nonce,\n  ]);\n\n  return (\n    <form\n      {...props}\n      action={dispatch}\n      onSubmit={(event) => {\n        scrollRef.current = {\n          x: window.scrollX,\n          y: window.scrollY,\n        };\n\n        const nativeEvent =\n          event.nativeEvent as SubmitEvent;\n\n        const submitter =\n          nativeEvent.submitter;\n\n        if (\n          submitter instanceof\n          HTMLButtonElement\n        ) {\n          const confirmMessage =\n            submitter.dataset\n              .confirmMessage;\n\n          if (\n            confirmMessage &&\n            !window.confirm(\n              confirmMessage,\n            )\n          ) {\n            event.preventDefault();\n            return;\n          }\n\n          submitButtonRef.current =\n            submitter;\n\n          originalLabelRef.current =\n            (\n              submitter.textContent ??\n              "Save"\n            ).trim();\n        }\n\n        onSubmit?.(event);\n      }}\n    >\n      {children}\n\n      {showFeedback &&\n      state.kind !== "idle" ? (\n        <p\n          role={\n            state.kind === "error"\n              ? "alert"\n              : "status"\n          }\n          className={[\n            "mt-2 text-[10px] leading-5",\n            state.kind ===\n            "success"\n              ? "text-[rgb(var(--sep-colour-9fd0a9))]"\n              : "text-[rgb(var(--sep-colour-d8a49a))]",\n          ].join(" ")}\n        >\n          {state.kind ===\n          "success"\n            ? "✓ "\n            : "✕ "}\n          {state.message}\n        </p>\n      ) : null}\n    </form>\n  );\n}\n'

path = 'components/characters/character-shapes-display.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import {\n  createClient,\n} from "@/lib/supabase/server";', 'import {\n  createAdminClient,\n} from "@/lib/supabase/admin";', 'Shapes admin client import')
files[path] = text

path = 'components/characters/character-shapes-display.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const db =\n    await createClient();', '  const db =\n    createAdminClient();', 'Shapes admin client usage')
files[path] = text

path = 'components/audio/portal-audio-provider.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  | "instant-bubble"\n  | "instant-swish";', '  | "instant-bubble"\n  | "instant-swish"\n  | "notification-chime";', 'Notification sound kind')
files[path] = text

path = 'components/audio/portal-audio-provider.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const playPortalSound =\n  useCallback(', '  const playNotificationChime =\n    useCallback(() => {\n      if (\n        mutedRef.current\n      ) {\n        return;\n      }\n\n      const context =\n        ensureAudioContext();\n\n      const master =\n        masterGainRef.current;\n\n      if (!master) {\n        return;\n      }\n\n      const play = () => {\n        if (\n          mutedRef.current ||\n          context.state !==\n            "running"\n        ) {\n          return;\n        }\n\n        const start =\n          context.currentTime +\n          0.01;\n\n        const notes = [\n          {\n            frequency: 783.99,\n            offset: 0,\n            duration: 0.16,\n            volume: 0.022,\n          },\n          {\n            frequency: 987.77,\n            offset: 0.07,\n            duration: 0.2,\n            volume: 0.018,\n          },\n          {\n            frequency: 1174.66,\n            offset: 0.15,\n            duration: 0.24,\n            volume: 0.014,\n          },\n        ];\n\n        for (\n          const note of notes\n        ) {\n          const oscillator =\n            context.createOscillator();\n\n          const gain =\n            context.createGain();\n\n          oscillator.type =\n            "sine";\n\n          oscillator.frequency\n            .setValueAtTime(\n              note.frequency,\n              start +\n                note.offset,\n            );\n\n          gain.gain.setValueAtTime(\n            0.0001,\n            start + note.offset,\n          );\n\n          gain.gain\n            .exponentialRampToValueAtTime(\n              note.volume,\n              start +\n                note.offset +\n                0.012,\n            );\n\n          gain.gain\n            .exponentialRampToValueAtTime(\n              0.0001,\n              start +\n                note.offset +\n                note.duration,\n            );\n\n          oscillator.connect(\n            gain,\n          );\n\n          gain.connect(master);\n\n          oscillator.start(\n            start + note.offset,\n          );\n\n          oscillator.stop(\n            start +\n              note.offset +\n              note.duration +\n              0.03,\n          );\n        }\n      };\n\n      if (\n        context.state ===\n        "running"\n      ) {\n        play();\n        return;\n      }\n\n      if (\n        context.state ===\n        "suspended"\n      ) {\n        void context\n          .resume()\n          .then(play)\n          .catch(() => {\n            // Browser still requires interaction.\n          });\n      }\n    }, [ensureAudioContext]);\n\n  const playPortalSound =\n  useCallback(', 'Insert notification chime')
files[path] = text

path = 'components/audio/portal-audio-provider.tsx'
text = files.get(path, read(path))
text = replace_once(text, '      if (\n        kind ===\n        "instant-swish"\n      ) {\n        playSwish();\n        return;\n      }\n\n      playBeep();', '      if (\n        kind ===\n        "instant-swish"\n      ) {\n        playSwish();\n        return;\n      }\n\n      if (\n        kind ===\n        "notification-chime"\n      ) {\n        playNotificationChime();\n        return;\n      }\n\n      playBeep();', 'Notification chime routing')
files[path] = text

path = 'components/audio/portal-audio-provider.tsx'
text = files.get(path, read(path))
text = replace_once(text, '      playPop,\n      playBubble,\n      playSwish,\n    ],', '      playPop,\n      playBubble,\n      playSwish,\n      playNotificationChime,\n    ],', 'Notification chime dependency')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import { createClient } from "@/lib/supabase/client";', 'import { createClient } from "@/lib/supabase/client";\nimport { usePortalAudio } from "@/components/audio/portal-audio-provider";', 'Bell audio import')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'export function NotificationBell() {\n  const pathname = usePathname();\n  const supabase = useMemo(', 'export function NotificationBell() {\n  const pathname = usePathname();\n  const {\n    playPortalSound,\n  } = usePortalAudio();\n  const supabase = useMemo(', 'Bell audio hook')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  const panelRef =\n    useRef<HTMLDivElement>(null);\n\n  const [open, setOpen] =', '  const panelRef =\n    useRef<HTMLDivElement>(null);\n  const previousUnreadRef =\n    useRef(0);\n  const loadedOnceRef =\n    useRef(false);\n  const suppressNextSoundRef =\n    useRef(false);\n\n  const [open, setOpen] =', 'Bell unread refs')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '      setMuted(bundle.muted === true);\n      setRows(\n        Array.isArray(\n          bundle.notifications,\n        )\n          ? bundle.notifications\n          : [],\n      );\n      setLoading(false);', '      const nextRows =\n        Array.isArray(\n          bundle.notifications,\n        )\n          ? bundle.notifications\n          : [];\n\n      const nextUnread =\n        bundle.muted === true\n          ? 0\n          : nextRows.filter(\n              (row) =>\n                row.is_unread,\n            ).length;\n\n      if (\n        loadedOnceRef.current &&\n        !bundle.muted &&\n        nextUnread >\n          previousUnreadRef.current &&\n        !suppressNextSoundRef.current\n      ) {\n        playPortalSound(\n          "notification-chime",\n        );\n      }\n\n      suppressNextSoundRef.current =\n        false;\n      loadedOnceRef.current =\n        true;\n      previousUnreadRef.current =\n        nextUnread;\n\n      setMuted(bundle.muted === true);\n      setRows(nextRows);\n      setLoading(false);', 'Bell unread sound logic')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    [supabase],\n  );', '    [\n      playPortalSound,\n      supabase,\n    ],\n  );', 'Bell load dependencies')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    if (next) {\n      setRows([]);\n    } else {\n      await load();\n    }', '    if (next) {\n      previousUnreadRef.current =\n        0;\n      setRows([]);\n    } else {\n      suppressNextSoundRef.current =\n        true;\n      await load();\n    }', 'Bell unmute sound suppression')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                      "flex items-center gap-1.5 border px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em] transition disabled:cursor-wait disabled:opacity-50",', '                      "flex items-center gap-1.5 border px-2.5 py-1.5 text-[8px] uppercase tracking-[0.14em] transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.08)] disabled:cursor-wait disabled:opacity-50",', 'Mute vocabulary movement')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                                <span className="mt-2 block text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-b28a53))]">\n                                  Open →\n                                </span>', '                                <span className="mt-2 inline-flex border border-[rgb(var(--sep-colour-765937))]/55 bg-[rgb(var(--sep-colour-21170f))] px-2 py-1 text-[8px] uppercase tracking-[0.14em] !text-[rgb(var(--sep-colour-d4ad70))] transition group-hover:border-[rgb(var(--sep-colour-a07945))] group-hover:!text-[rgb(var(--sep-colour-efd6a3))]">\n                                  Open →\n                                </span>', 'Open link vocabulary styling')
files[path] = text

path = 'components/notifications/notification-bell.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                            "block border px-3 py-3 transition-all duration-150 hover:-translate-y-[1px]', '                            "group block border px-3 py-3 transition-all duration-150 hover:-translate-y-[1px]', 'Notification group class')
files[path] = text

path = 'app/(portal)/admin/order-submissions/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import { updateOrderSubmissionAction } from "./actions";', 'import { updateOrderSubmissionAction } from "./actions";\nimport { InlineActionForm } from "@/components/forms/inline-action-form";', 'Order submission InlineActionForm import')
files[path] = text

path = 'app/(portal)/admin/order-submissions/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  <form\n                    action={updateOrderSubmissionAction}\n                    className="lg:col-span-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5"\n                  >', '                  <InlineActionForm\n                    action={updateOrderSubmissionAction}\n                    successMessage="Review saved."\n                    className="lg:col-span-2 border-t border-[rgb(var(--sep-colour-60482e))]/30 pt-5"\n                  >', 'Order submission form start')
files[path] = text

path = 'app/(portal)/admin/order-submissions/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  </form>\n                </div>\n              </details>', '                  </InlineActionForm>\n                </div>\n              </details>', 'Order submission form end')
files[path] = text

path = 'app/(portal)/orders/manage/actions.ts'
text = files.get(path, read(path))
text = replace_once(text, 'import { redirect } from "next/navigation";\n', '', 'Remove manage redirect import')
files[path] = text

path = 'app/(portal)/orders/manage/actions.ts'
text = files.get(path, read(path))
text = replace_once(text, 'function back(\n  orderId: string,\n  type: "success" | "error",\n  message: string,\n): never {\n  const params = new URLSearchParams();\n  params.set(type, message);\n\n  redirect(\n    `/orders/manage?${params.toString()}#order-${orderId}`,\n  );\n}', 'function back(\n  _orderId: string,\n  type: "success" | "error",\n  message: string,\n) {\n  return {\n    ok: type === "success",\n    message,\n  };\n}', 'Manage action result helper')
files[path] = text

path = 'components/orders/order-head-add-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import {\n  headAddMember,\n} from "@/app/(portal)/orders/manage/actions";', 'import {\n  headAddMember,\n} from "@/app/(portal)/orders/manage/actions";\nimport { InlineActionForm } from "@/components/forms/inline-action-form";', 'Add member inline action import')
files[path] = text

path = 'components/orders/order-head-add-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    <form\n      action={headAddMember}', '    <InlineActionForm\n      action={headAddMember}\n      successMessage="Member added."', 'Add member form start')
files[path] = text

path = 'components/orders/order-head-add-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    </form>\n  );\n}', '    </InlineActionForm>\n  );\n}', 'Add member form end')
files[path] = text

path = 'components/orders/order-head-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'import {\n  headRemoveMember,\n  headUpdateMember,\n} from "@/app/(portal)/orders/manage/actions";', 'import {\n  headRemoveMember,\n  headUpdateMember,\n} from "@/app/(portal)/orders/manage/actions";\nimport { InlineActionForm } from "@/components/forms/inline-action-form";', 'Member inline action import')
files[path] = text

path = 'components/orders/order-head-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  function confirmRemoval(\n    event: React.MouseEvent<HTMLButtonElement>,\n  ) {\n    const confirmed =\n      window.confirm(\n        `Remove ${characterName} from this Order?\\n\\nThis will remove their current Order membership.`,\n      );\n\n    if (!confirmed) {\n      event.preventDefault();\n    }\n  }\n\n  return (\n    <form\n      action={headUpdateMember}', '  async function memberAction(\n    formData: FormData,\n  ) {\n    return formData.get("intent") ===\n      "remove"\n      ? headRemoveMember(formData)\n      : headUpdateMember(formData);\n  }\n\n  return (\n    <InlineActionForm\n      action={memberAction}\n      successMessage="Membership updated."', 'Member form action setup')
files[path] = text

path = 'components/orders/order-head-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '          <button\n            type="submit"\n            disabled={!jobId}', '          <button\n            type="submit"\n            name="intent"\n            value="update"\n            disabled={!jobId}', 'Member save intent')
files[path] = text

path = 'components/orders/order-head-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '          <button\n            type="submit"\n            formAction={headRemoveMember}\n            onClick={confirmRemoval}\n            className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300"\n          >', '          <button\n            type="submit"\n            name="intent"\n            value="remove"\n            data-confirm-message={`Remove ${characterName} from this Order? This will remove their current Order membership.`}\n            className="border border-red-900/55 bg-red-950/20 px-3 py-2 text-[8px] uppercase tracking-[0.12em] text-red-300"\n          >', 'Member remove intent')
files[path] = text

path = 'components/orders/order-head-member-form.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    </form>\n  );\n}', '    </InlineActionForm>\n  );\n}', 'Member form end')
files[path] = text

path = 'components/orders/order-head-gift-manager.tsx'
text = files.get(path, read(path))
text = replace_once(text, '} from "@/app/(portal)/orders/manage/actions";', '} from "@/app/(portal)/orders/manage/actions";\nimport { InlineActionForm } from "@/components/forms/inline-action-form";', 'Gift inline action import')
files[path] = text

path = 'components/orders/order-head-gift-manager.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  <form\n                    action={\n                      headAssignOrderGift\n                    }\n                    className="mt-3"\n                  >', '                  <InlineActionForm\n                    action={headAssignOrderGift}\n                    successMessage="Order Feat assigned."\n                    className="mt-3"\n                  >', 'Assign gift form start')
files[path] = text

path = 'components/orders/order-head-gift-manager.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  </form>\n                ) : isOrderOwned ? (\n                  <form\n                    action={\n                      headRemoveOrderGift\n                    }\n                    className="mt-3"\n                  >', '                  </InlineActionForm>\n                ) : isOrderOwned ? (\n                  <InlineActionForm\n                    action={headRemoveOrderGift}\n                    successMessage="Order Feat removed."\n                    className="mt-3"\n                  >', 'Gift form transition')
files[path] = text

path = 'components/orders/order-head-gift-manager.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                  </form>\n                ) : (', '                  </InlineActionForm>\n                ) : (', 'Remove gift form end')
files[path] = text

path = 'app/(portal)/admin/tickets/[reference]/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '  if (\n    !canHandleTicketCategory(\n      staff.role,\n      ticket.category,\n    )\n  ) {\n    redirect("/admin/tickets");\n  }\n\n  const [', '  if (\n    !canHandleTicketCategory(\n      staff.role,\n      ticket.category,\n    )\n  ) {\n    redirect("/admin/tickets");\n  }\n\n  const {\n    data: openerCharacter,\n    error: openerCharacterError,\n  } = ticket.opened_by_character_id\n    ? await admin\n        .from("characters")\n        .select(\n          "display_name,first_name,surname",\n        )\n        .eq(\n          "id",\n          ticket.opened_by_character_id,\n        )\n        .maybeSingle()\n    : {\n        data: null,\n        error: null,\n      };\n\n  if (openerCharacterError) {\n    throw new Error(\n      openerCharacterError.message,\n    );\n  }\n\n  const openerName =\n    openerCharacter?.display_name?.trim() ||\n    `${openerCharacter?.first_name ?? ""} ${openerCharacter?.surname ?? ""}`.trim() ||\n    "Player";\n\n  const [', 'Ticket opener lookup')
files[path] = text

path = 'app/(portal)/admin/tickets/[reference]/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '            Opened {fmt(ticket.created_at)}', '            Opened by {openerName} · {fmt(ticket.created_at)}', 'Ticket opener header')
files[path] = text

path = 'app/(portal)/admin/tickets/[reference]/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                    ? "Player"\n                    : "Staff"', '                    ? openerName\n                    : "Staff"', 'Ticket message opener name')
files[path] = text

path = 'app/(portal)/api/support/context/route.ts'
text = files.get(path, read(path))
text = replace_once(text, '    const names = new Map(\n      (characters ?? []).map(\n        (character) => [\n          character.user_id,\n          character.display_name ||\n            `${character.first_name ?? ""} ${character.surname ?? ""}`.trim(),\n        ],\n      ),\n    );\n\n    return NextResponse.json({', '    const names = new Map(\n      (characters ?? []).map(\n        (character) => [\n          character.user_id,\n          character.display_name ||\n            `${character.first_name ?? ""} ${character.surname ?? ""}`.trim(),\n        ],\n      ),\n    );\n\n    const openerName =\n      names.get(\n        ticket.opened_by_user_id,\n      ) ?? "Player";\n\n    return NextResponse.json({', 'Support context opener name')
files[path] = text

path = 'app/(portal)/api/support/context/route.ts'
text = files.get(path, read(path))
text = replace_once(text, '                  event.actor_user_id ===\n                  ticket.opened_by_user_id\n                    ? "Player"\n                    : "Staff"', '                  event.actor_user_id ===\n                  ticket.opened_by_user_id\n                    ? openerName\n                    : "Staff"', 'Support context fallback label')
files[path] = text

path = 'components/sanctions/sanction-evidence.tsx'
text = files.get(path, read(path))
text = replace_once(text, '    <section className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-1d1110))]">', '    <section\n      data-vocabulary-static\n      className="mt-5 border border-[rgb(var(--sep-colour-60482e))]/50 bg-[rgb(var(--sep-colour-1d1110))]"\n    >', 'Sanction evidence static outer')
files[path] = text

path = 'components/sanctions/sanction-evidence.tsx'
text = files.get(path, read(path))
text = replace_once(text, '              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10"', '              className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-black/10 transition-all duration-150 hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))] hover:shadow-[0_0_10px_rgba(var(--sep-rgb-177-132-75),0.06)]"', 'Evidence row vocabulary')
files[path] = text

path = 'components/sanctions/sanction-evidence.tsx'
text = files.get(path, read(path))
text = replace_once(text, '                        className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-black/10 p-3"', '                        className="border border-[rgb(var(--sep-colour-60482e))]/30 bg-black/10 p-3 transition-all duration-150 hover:-translate-y-[1px] hover:border-[rgb(var(--sep-colour-8a673f))] hover:bg-[rgb(var(--sep-colour-17110d))]"', 'Evidence context vocabulary')
files[path] = text

path = 'app/(portal)/sanctions/page.tsx'
text = files.get(path, read(path))
text = replace_once(text, 'return <article id={`sanction-${s.id}`} key={s.id} className={`border p-5 ${', 'return <article data-vocabulary-static id={`sanction-${s.id}`} key={s.id} className={`border p-5 ${', 'Player sanction card static')
files[path] = text

path = "app/(portal)/orders/manage/actions.ts"
text = files.get(path, read(path))
text = re.sub(r'(?m)^(\s+)back\(', r'\1return back(', text)
files[path] = text

# Only write once every matcher has succeeded.
new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(new_file_text, encoding="utf-8")
print("✓", str(new_path))
for path, text in files.items():
    Path(path).write_text(text, encoding="utf-8")
    print("✓", path)

print("\nPatch installed. Run: npm run build")

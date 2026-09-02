from pathlib import Path
import subprocess
ROOT=Path.cwd()
head=subprocess.check_output(['git','rev-parse','--short','HEAD'], text=True).strip()
if not head.startswith('5067338'): raise SystemExit(f'Expected HEAD 5067338, found {head}')
def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
def write(rel,text): (ROOT/rel).write_text(text,encoding='utf-8')
def repl(text,old,new,label):
    count=text.count(old)
    if count!=1: raise SystemExit(f'{label}: expected 1 match, found {count}')
    return text.replace(old,new,1)

# Cosmetics opens in the existing portal modal system.
rel='components/portal/portal-sidebar.tsx'; text=read(rel)
old='''const cosmeticsItem: NavigationItem = {
  label: "Cosmetics",
  title:
    "Manage your owned character and chat cosmetics.",
  icon: "/icons/premium.png",
  href: "/cosmetics",
  activePaths: ["/cosmetics"],
};'''
new='''const cosmeticsItem: NavigationItem = {
  label: "Cosmetics",
  title:
    "Manage your owned character and chat cosmetics.",
  icon: "/icons/premium.png",
  href: "/cosmetics",
  activePaths: ["/cosmetics"],
  opensModal: true,
};'''
text=repl(text,old,new,'cosmetics modal flag'); write(rel,text)

# Dedicated /cosmetics right-side context.
rel='components/portal/portal-context-panel.tsx'; text=read(rel)
old='''if (pathname === "/friends") {
  return <FriendListContext />;
}
'''
new='''if (pathname === "/friends") {
  return <FriendListContext />;
}

if (pathname === "/cosmetics") {
  return <CosmeticsContextPanel />;
}
'''
text=repl(text,old,new,'cosmetics context route')
text += '\nfunction CosmeticsContextPanel() {\n  return (\n    <div className="flex h-full min-h-0 flex-col">\n      <ContextHeading\n        eyebrow="Premium"\n        title="Cosmetics"\n      />\n\n      <p className="mt-4 text-[11px] leading-5 text-[rgb(var(--sep-colour-8f8271))]">\n        Manage the visual treatments your character owns and choose which cosmetic is currently equipped in each slot.\n      </p>\n\n      <div className="my-4 h-px bg-[rgb(var(--sep-colour-59432c))]/35" />\n\n      <div className="space-y-2">\n        <div className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3">\n          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Character Sheet</p>\n          <p className="mt-1 font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))]">Sheet Frames</p>\n          <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-756b5d))]">Frames shown around your own and public character sheet.</p>\n        </div>\n\n        <div className="border border-[rgb(var(--sep-colour-59432c))]/45 bg-[rgb(var(--sep-colour-100c09))] px-3 py-3">\n          <p className="text-[7px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-806b50))]">Location Chronicle</p>\n          <p className="mt-1 font-serif text-sm text-[rgb(var(--sep-colour-cbb28a))]">Chat Frames</p>\n          <p className="mt-1 text-[9px] leading-4 text-[rgb(var(--sep-colour-756b5d))]">Frames shown around your normal in-character location actions.</p>\n        </div>\n      </div>\n\n      <div className="mt-auto border-t border-[rgb(var(--sep-colour-59432c))]/35 pt-4">\n        <p className="text-[9px] leading-4 text-[rgb(var(--sep-colour-706452))]">You can own several cosmetics, but only one cosmetic can be equipped in each slot at a time.</p>\n      </div>\n    </div>\n  );\n}\n'
write(rel,text)

# Remove redundant inner spacing when a chat frame already provides its own border space.
rel='app/(portal)/game/components/RoomMessageList.tsx'; text=read(rel)
old='''                    style={{
                      ...(privateLocationTheme
                        ? {
                            backgroundColor:
                              privateLocationTheme.backgroundColour,
                          }
                        : {}),
                      ...(chatFrameCss ?? {}),
                    }}'''
new='''                    style={{
                      ...(privateLocationTheme
                        ? {
                            backgroundColor:
                              privateLocationTheme.backgroundColour,
                          }
                        : {}),
                      ...(chatFrameCss ?? {}),
                      ...(chatFrameUrl
                        ? {
                            paddingLeft: "4px",
                            paddingTop: "4px",
                            paddingBottom: "4px",
                          }
                        : {}),
                    }}'''
text=repl(text,old,new,'chat framed spacing'); write(rel,text)
print('Cosmetics modal/context and chat spacing patch applied successfully.')

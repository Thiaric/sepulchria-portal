from pathlib import Path
import base64

ROOT = Path.cwd()
panel_path = ROOT / "app/(portal)/game/components/HouseOfChancesPanel.tsx"
admin_page_path = ROOT / "app/(portal)/admin/house-of-chances/page.tsx"
context_path = ROOT / "components/portal/admin-context-panel.tsx"
house_context_path = ROOT / "components/admin/house-of-chances-context-panel.tsx"

for path in [panel_path, admin_page_path, context_path]:
    if not path.exists():
        raise SystemExit(f"Missing expected file: {path}")

# Player panel imports + skin accents
panel = panel_path.read_text(encoding="utf-8")
anchor = 'import { formatRemnants } from "@/lib/economy/currency";\n'
if 'usePortalSkin' not in panel:
    panel = panel.replace(anchor, anchor + 'import { usePortalSkin } from "@/components/portal/portal-skin-provider";\n', 1)

swatch_anchor = 'type ReelValues = [number | null, number | null, number | null];\n\n'
swatches = '''const HOUSE_SKIN_ACCENTS: Record<string, string> = {
  sepulchria: "#b68b4f",
  vellum: "#5d4930",
  starfall: "#758fd6",
  "rose-nocturne": "#b36d8b",
  "verdant-reliquary": "#4f9c70",
  "amethyst-veil": "#9b6ac4",
  moonlit: "#b58a4c",
  emberforge: "#c7773d",
  deepwater: "#4f969d",
  "blood-court": "#9d3744",
  ashen: "#9fd4ef",
  "ivory-archive": "#d1c6ad",
  "aelari-dawn": "#e7d9a8",
  "dwarven-deep": "#b37945",
  "mortal-hearth": "#aaa79d",
  "wolfs-moon": "#9aaeb7",
};\n\n'''
if "HOUSE_SKIN_ACCENTS" not in panel:
    if swatch_anchor not in panel: raise SystemExit("Could not find reel type anchor.")
    panel = panel.replace(swatch_anchor, swatch_anchor + swatches, 1)

component_anchor = '}) {\n  const router = useRouter();\n'
component_insert = '}) {\n  const router = useRouter();\n  const { skin } = usePortalSkin();\n  const skinAccent =\n    HOUSE_SKIN_ACCENTS[skin] ?? HOUSE_SKIN_ACCENTS.sepulchria;\n'
if "const { skin } = usePortalSkin();" not in panel:
    if component_anchor not in panel: raise SystemExit("Could not find House component anchor.")
    panel = panel.replace(component_anchor, component_insert, 1)

old_reel = '''              <div
                key={index}
                className={[
                  "relative flex aspect-[5/4] items-center justify-center overflow-hidden",
                  "border border-[rgb(var(--sep-colour-987344))]",
                  "bg-[radial-gradient(circle_at_center,rgb(var(--sep-colour-2b2117)),rgb(var(--sep-colour-100c09))_72%)]",
                  "shadow-[inset_0_0_18px_rgba(196,150,82,0.16),0_0_10px_rgba(0,0,0,0.35)]",
                  spinning ? "animate-pulse" : "",
                ].join(" ")}
              >
                <div className="pointer-events-none absolute inset-[3px] border border-[rgb(var(--sep-colour-987344))]/35" />
                <span className="font-serif text-3xl tabular-nums text-[rgb(var(--sep-colour-efd6a8))] sm:text-4xl">'''
new_reel = '''              <div
                key={index}
                className={[
                  "relative flex aspect-[5/4] items-center justify-center overflow-hidden",
                  "border bg-[rgb(var(--sep-colour-100c09))]",
                  spinning ? "animate-pulse" : "",
                ].join(" ")}
                style={{
                  borderColor: skinAccent,
                  backgroundImage: `radial-gradient(circle at center, color-mix(in srgb, ${skinAccent} 18%, transparent), transparent 72%)`,
                  boxShadow: `inset 0 0 24px color-mix(in srgb, ${skinAccent} 24%, transparent), 0 0 10px rgba(0,0,0,0.35)`,
                }}
              >
                <div
                  className="pointer-events-none absolute inset-[3px] border"
                  style={{
                    borderColor: `color-mix(in srgb, ${skinAccent} 38%, transparent)`,
                  }}
                />
                <span className="font-serif text-3xl tabular-nums text-[rgb(var(--sep-colour-efd6a8))] sm:text-4xl">'''
if old_reel not in panel: raise SystemExit("Could not locate current House reel block.")
panel = panel.replace(old_reel, new_reel, 1)

old_result = '''          {result ? (
            <div className="mt-4 border border-[rgb(var(--sep-colour-6f5435))]/55 bg-[rgb(var(--sep-colour-17110d))] p-3 text-center">'''
new_result = '''          {result ? (
            <div
              className="mt-4 border bg-[rgb(var(--sep-colour-17110d))] p-3 text-center"
              style={{ borderColor: skinAccent }}
            >'''
if old_result not in panel: raise SystemExit("Could not locate House result block.")
panel = panel.replace(old_result, new_result, 1)
panel_path.write_text(panel, encoding="utf-8")

# Admin page DOM hooks
admin_page = admin_page_path.read_text(encoding="utf-8")
old_rule = '''              <section key={rule.id} id={`house-of-chances-rule-${rule.id}`} className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6">'''
new_rule = '''              <section
                key={rule.id}
                id={`house-of-chances-rule-${rule.id}`}
                data-house-rule-id={rule.id}
                data-house-rule-name={rule.name}
                data-house-rule-match-type={rule.match_type}
                data-house-rule-priority={rule.priority}
                data-house-rule-roll-1-min={rule.roll_1_min ?? ""}
                data-house-rule-roll-1-max={rule.roll_1_max ?? ""}
                data-house-rule-roll-2-min={rule.roll_2_min ?? ""}
                data-house-rule-roll-2-max={rule.roll_2_max ?? ""}
                data-house-rule-roll-3-min={rule.roll_3_min ?? ""}
                data-house-rule-roll-3-max={rule.roll_3_max ?? ""}
                data-house-rule-total-min={rule.total_min ?? ""}
                data-house-rule-total-max={rule.total_max ?? ""}
                className="scroll-mt-6 border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-5 sm:p-6"
              >'''
if old_rule not in admin_page: raise SystemExit("Could not locate rule section.")
admin_page = admin_page.replace(old_rule, new_rule, 1)

old_play = '''              <div key={play.id} className="grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(180px,1fr)_150px_120px_minmax(150px,1fr)_150px] md:items-center">'''
new_play = '''              <div
                key={play.id}
                id={`house-of-chances-play-${play.id}`}
                data-house-play-id={play.id}
                data-house-play-character={characterName(play)}
                data-house-play-rule={play.matched_rule_name ?? "No winnings"}
                data-house-play-date={new Date(play.created_at).toLocaleString("en-GB")}
                data-house-play-roll-1={play.roll_1}
                data-house-play-roll-2={play.roll_2}
                data-house-play-roll-3={play.roll_3}
                className="scroll-mt-6 grid gap-2 border-b border-[rgb(var(--sep-colour-59432c))]/25 px-4 py-3 last:border-b-0 md:grid-cols-[minmax(180px,1fr)_150px_120px_minmax(150px,1fr)_150px] md:items-center"
              >'''
if old_play not in admin_page: raise SystemExit("Could not locate recent play row.")
admin_page = admin_page.replace(old_play, new_play, 1)
admin_page_path.write_text(admin_page, encoding="utf-8")

# Create House context component
house_context_path.parent.mkdir(parents=True, exist_ok=True)
house_context_path.write_bytes(base64.b64decode('InVzZSBjbGllbnQiOwoKaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VNZW1vLCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0IjsKCnR5cGUgUnVsZUVudHJ5ID0gewogIGlkOiBzdHJpbmc7CiAgbmFtZTogc3RyaW5nOwogIG1hdGNoVHlwZTogc3RyaW5nOwogIHByaW9yaXR5OiBzdHJpbmc7CiAgcm9sbDFNaW46IHN0cmluZzsKICByb2xsMU1heDogc3RyaW5nOwogIHJvbGwyTWluOiBzdHJpbmc7CiAgcm9sbDJNYXg6IHN0cmluZzsKICByb2xsM01pbjogc3RyaW5nOwogIHJvbGwzTWF4OiBzdHJpbmc7CiAgdG90YWxNaW46IHN0cmluZzsKICB0b3RhbE1heDogc3RyaW5nOwp9OwoKdHlwZSBQbGF5RW50cnkgPSB7CiAgaWQ6IHN0cmluZzsKICBjaGFyYWN0ZXI6IHN0cmluZzsKICBydWxlOiBzdHJpbmc7CiAgZGF0ZTogc3RyaW5nOwogIHJvbGwxOiBzdHJpbmc7CiAgcm9sbDI6IHN0cmluZzsKICByb2xsMzogc3RyaW5nOwp9OwoKY29uc3Qgc2VhcmNoQ2xhc3MgPQogICJ3LWZ1bGwgYm9yZGVyIGJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNTk0MzJjKSldLzQ1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0xMDBjMDkpKV0gcHgtMyBweS0yLjUgdGV4dC14cyB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1kNGJlYTApKV0gb3V0bGluZS1ub25lIHBsYWNlaG9sZGVyOnRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLTY2NWI0ZCkpXSBmb2N1czpib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTk4NzM0NCkpXSI7CgpmdW5jdGlvbiBqdW1wVG8oaWQ6IHN0cmluZykgewogIGNvbnN0IHRhcmdldCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkKTsKICBpZiAoIXRhcmdldCkgcmV0dXJuOwoKICB0YXJnZXQuc2Nyb2xsSW50b1ZpZXcoewogICAgYmVoYXZpb3I6ICJzbW9vdGgiLAogICAgYmxvY2s6ICJzdGFydCIsCiAgfSk7CgogIGNvbnN0IHByZXZpb3VzT3V0bGluZSA9IHRhcmdldC5zdHlsZS5vdXRsaW5lOwogIGNvbnN0IHByZXZpb3VzT2Zmc2V0ID0gdGFyZ2V0LnN0eWxlLm91dGxpbmVPZmZzZXQ7CgogIHRhcmdldC5zdHlsZS5vdXRsaW5lID0KICAgICIxcHggc29saWQgcmdiKHZhcigtLXNlcC1jb2xvdXItOTg3MzQ0KSkiOwogIHRhcmdldC5zdHlsZS5vdXRsaW5lT2Zmc2V0ID0gIjNweCI7CgogIHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHsKICAgIHRhcmdldC5zdHlsZS5vdXRsaW5lID0gcHJldmlvdXNPdXRsaW5lOwogICAgdGFyZ2V0LnN0eWxlLm91dGxpbmVPZmZzZXQgPSBwcmV2aW91c09mZnNldDsKICB9LCAxMjAwKTsKfQoKZnVuY3Rpb24gcmVhZFJ1bGVzKCk6IFJ1bGVFbnRyeVtdIHsKICByZXR1cm4gQXJyYXkuZnJvbSgKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCJbZGF0YS1ob3VzZS1ydWxlLWlkXSIpLAogICkubWFwKChub2RlKSA9PiAoewogICAgaWQ6IG5vZGUuZGF0YXNldC5ob3VzZVJ1bGVJZCA/PyAiIiwKICAgIG5hbWU6IG5vZGUuZGF0YXNldC5ob3VzZVJ1bGVOYW1lID8/ICIiLAogICAgbWF0Y2hUeXBlOiBub2RlLmRhdGFzZXQuaG91c2VSdWxlTWF0Y2hUeXBlID8/ICIiLAogICAgcHJpb3JpdHk6IG5vZGUuZGF0YXNldC5ob3VzZVJ1bGVQcmlvcml0eSA/PyAiIiwKICAgIHJvbGwxTWluOiBub2RlLmRhdGFzZXQuaG91c2VSdWxlUm9sbDFNaW4gPz8gIiIsCiAgICByb2xsMU1heDogbm9kZS5kYXRhc2V0LmhvdXNlUnVsZVJvbGwxTWF4ID8/ICIiLAogICAgcm9sbDJNaW46IG5vZGUuZGF0YXNldC5ob3VzZVJ1bGVSb2xsMk1pbiA/PyAiIiwKICAgIHJvbGwyTWF4OiBub2RlLmRhdGFzZXQuaG91c2VSdWxlUm9sbDJNYXggPz8gIiIsCiAgICByb2xsM01pbjogbm9kZS5kYXRhc2V0LmhvdXNlUnVsZVJvbGwzTWluID8/ICIiLAogICAgcm9sbDNNYXg6IG5vZGUuZGF0YXNldC5ob3VzZVJ1bGVSb2xsM01heCA/PyAiIiwKICAgIHRvdGFsTWluOiBub2RlLmRhdGFzZXQuaG91c2VSdWxlVG90YWxNaW4gPz8gIiIsCiAgICB0b3RhbE1heDogbm9kZS5kYXRhc2V0LmhvdXNlUnVsZVRvdGFsTWF4ID8/ICIiLAogIH0pKTsKfQoKZnVuY3Rpb24gcmVhZFBsYXlzKCk6IFBsYXlFbnRyeVtdIHsKICByZXR1cm4gQXJyYXkuZnJvbSgKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KCJbZGF0YS1ob3VzZS1wbGF5LWlkXSIpLAogICkubWFwKChub2RlKSA9PiAoewogICAgaWQ6IG5vZGUuZGF0YXNldC5ob3VzZVBsYXlJZCA/PyAiIiwKICAgIGNoYXJhY3Rlcjogbm9kZS5kYXRhc2V0LmhvdXNlUGxheUNoYXJhY3RlciA/PyAiIiwKICAgIHJ1bGU6IG5vZGUuZGF0YXNldC5ob3VzZVBsYXlSdWxlID8/ICIiLAogICAgZGF0ZTogbm9kZS5kYXRhc2V0LmhvdXNlUGxheURhdGUgPz8gIiIsCiAgICByb2xsMTogbm9kZS5kYXRhc2V0LmhvdXNlUGxheVJvbGwxID8/ICIiLAogICAgcm9sbDI6IG5vZGUuZGF0YXNldC5ob3VzZVBsYXlSb2xsMiA/PyAiIiwKICAgIHJvbGwzOiBub2RlLmRhdGFzZXQuaG91c2VQbGF5Um9sbDMgPz8gIiIsCiAgfSkpOwp9CgpmdW5jdGlvbiBjb25kaXRpb25Ub2tlbnMocnVsZTogUnVsZUVudHJ5KSB7CiAgc3dpdGNoIChydWxlLm1hdGNoVHlwZSkgewogICAgY2FzZSAiZXhhY3QiOgogICAgICByZXR1cm4gWwogICAgICAgIHJ1bGUucm9sbDFNaW4gfHwgIuKAlCIsCiAgICAgICAgcnVsZS5yb2xsMk1pbiB8fCAi4oCUIiwKICAgICAgICBydWxlLnJvbGwzTWluIHx8ICLigJQiLAogICAgICBdOwoKICAgIGNhc2UgImFsbF9lcXVhbCI6IHsKICAgICAgY29uc3QgcmFuZ2UgPQogICAgICAgIHJ1bGUucm9sbDFNaW4gfHwgcnVsZS5yb2xsMU1heAogICAgICAgICAgPyBgJHtydWxlLnJvbGwxTWluIHx8ICIxIn3igJMke3J1bGUucm9sbDFNYXggfHwgIjEwMCJ9YAogICAgICAgICAgOiAiMeKAkzEwMCI7CiAgICAgIHJldHVybiBbIj0iLCByYW5nZV07CiAgICB9CgogICAgY2FzZSAiYWxsX2luX3JhbmdlIjoKICAgICAgcmV0dXJuIFsKICAgICAgICBgJHtydWxlLnJvbGwxTWluIHx8ICIxIn3igJMke3J1bGUucm9sbDFNYXggfHwgIjEwMCJ9YCwKICAgICAgICAiw5czIiwKICAgICAgXTsKCiAgICBjYXNlICJ0b3RhbF9yYW5nZSI6CiAgICAgIHJldHVybiBbCiAgICAgICAgYM6jICR7cnVsZS50b3RhbE1pbiB8fCAiMyJ94oCTJHtydWxlLnRvdGFsTWF4IHx8ICIzMDAifWAsCiAgICAgIF07CgogICAgY2FzZSAib3JkZXJlZF9yYW5nZXMiOgogICAgICByZXR1cm4gWwogICAgICAgIGAxOiAke3J1bGUucm9sbDFNaW4gfHwgIuKAlCJ94oCTJHtydWxlLnJvbGwxTWF4IHx8ICLigJQifWAsCiAgICAgICAgYDI6ICR7cnVsZS5yb2xsMk1pbiB8fCAi4oCUIn3igJMke3J1bGUucm9sbDJNYXggfHwgIuKAlCJ9YCwKICAgICAgICBgMzogJHtydWxlLnJvbGwzTWluIHx8ICLigJQifeKAkyR7cnVsZS5yb2xsM01heCB8fCAi4oCUIn1gLAogICAgICBdOwoKICAgIGRlZmF1bHQ6CiAgICAgIHJldHVybiBbcnVsZS5tYXRjaFR5cGUgfHwgIlJ1bGUiXTsKICB9Cn0KCmV4cG9ydCBmdW5jdGlvbiBIb3VzZU9mQ2hhbmNlc0NvbnRleHRQYW5lbCgpIHsKICBjb25zdCBbcnVsZXMsIHNldFJ1bGVzXSA9IHVzZVN0YXRlPFJ1bGVFbnRyeVtdPihbXSk7CiAgY29uc3QgW3BsYXlzLCBzZXRQbGF5c10gPSB1c2VTdGF0ZTxQbGF5RW50cnlbXT4oW10pOwogIGNvbnN0IFtydWxlU2VhcmNoLCBzZXRSdWxlU2VhcmNoXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbcGxheVNlYXJjaCwgc2V0UGxheVNlYXJjaF0gPSB1c2VTdGF0ZSgiIik7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBsZXQgZnJhbWUgPSAwOwoKICAgIGNvbnN0IHJlYWQgPSAoKSA9PiB7CiAgICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShmcmFtZSk7CiAgICAgIGZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7CiAgICAgICAgc2V0UnVsZXMocmVhZFJ1bGVzKCkpOwogICAgICAgIHNldFBsYXlzKHJlYWRQbGF5cygpKTsKICAgICAgfSk7CiAgICB9OwoKICAgIHJlYWQoKTsKCiAgICBjb25zdCBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKHJlYWQpOwogICAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7CiAgICAgIGNoaWxkTGlzdDogdHJ1ZSwKICAgICAgc3VidHJlZTogdHJ1ZSwKICAgIH0pOwoKICAgIHJldHVybiAoKSA9PiB7CiAgICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTsKICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lKTsKICAgIH07CiAgfSwgW10pOwoKICBjb25zdCBydWxlUXVlcnkgPSBydWxlU2VhcmNoLnRyaW0oKS50b0xvY2FsZUxvd2VyQ2FzZSgpOwogIGNvbnN0IHBsYXlRdWVyeSA9IHBsYXlTZWFyY2gudHJpbSgpLnRvTG9jYWxlTG93ZXJDYXNlKCk7CgogIGNvbnN0IHZpc2libGVSdWxlcyA9IHVzZU1lbW8oCiAgICAoKSA9PgogICAgICBydWxlcy5maWx0ZXIoKHJ1bGUpID0+IHsKICAgICAgICBpZiAoIXJ1bGVRdWVyeSkgcmV0dXJuIHRydWU7CgogICAgICAgIHJldHVybiBbCiAgICAgICAgICBydWxlLm5hbWUsCiAgICAgICAgICBydWxlLm1hdGNoVHlwZSwKICAgICAgICAgIHJ1bGUucHJpb3JpdHksCiAgICAgICAgICBydWxlLnJvbGwxTWluLAogICAgICAgICAgcnVsZS5yb2xsMU1heCwKICAgICAgICAgIHJ1bGUucm9sbDJNaW4sCiAgICAgICAgICBydWxlLnJvbGwyTWF4LAogICAgICAgICAgcnVsZS5yb2xsM01pbiwKICAgICAgICAgIHJ1bGUucm9sbDNNYXgsCiAgICAgICAgICBydWxlLnRvdGFsTWluLAogICAgICAgICAgcnVsZS50b3RhbE1heCwKICAgICAgICBdCiAgICAgICAgICAuam9pbigiICIpCiAgICAgICAgICAudG9Mb2NhbGVMb3dlckNhc2UoKQogICAgICAgICAgLmluY2x1ZGVzKHJ1bGVRdWVyeSk7CiAgICAgIH0pLAogICAgW3J1bGVzLCBydWxlUXVlcnldLAogICk7CgogIGNvbnN0IHZpc2libGVQbGF5cyA9IHVzZU1lbW8oCiAgICAoKSA9PgogICAgICBwbGF5cy5maWx0ZXIoKHBsYXkpID0+IHsKICAgICAgICBpZiAoIXBsYXlRdWVyeSkgcmV0dXJuIHRydWU7CgogICAgICAgIHJldHVybiBbCiAgICAgICAgICBwbGF5LmNoYXJhY3RlciwKICAgICAgICAgIHBsYXkucnVsZSwKICAgICAgICAgIHBsYXkuZGF0ZSwKICAgICAgICAgIHBsYXkucm9sbDEsCiAgICAgICAgICBwbGF5LnJvbGwyLAogICAgICAgICAgcGxheS5yb2xsMywKICAgICAgICBdCiAgICAgICAgICAuam9pbigiICIpCiAgICAgICAgICAudG9Mb2NhbGVMb3dlckNhc2UoKQogICAgICAgICAgLmluY2x1ZGVzKHBsYXlRdWVyeSk7CiAgICAgIH0pLAogICAgW3BsYXlzLCBwbGF5UXVlcnldLAogICk7CgogIHJldHVybiAoCiAgICA8ZGl2IGNsYXNzTmFtZT0iZ3JpZCBoLWZ1bGwgbWluLWgtMCBncmlkLXJvd3MtMiBnYXAtNCI+CiAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT0iZmxleCBtaW4taC0wIGZsZXgtY29sIj4KICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ic2hyaW5rLTAiPgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVs4cHhdIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yNGVtXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci04MDZiNTApKV0iPgogICAgICAgICAgICBQcml6ZSBydWxlcwogICAgICAgICAgPC9wPgogICAgICAgICAgPGgyIGNsYXNzTmFtZT0ibXQtMSBmb250LXNlcmlmIHRleHQteGwgdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItZDhiZjkxKSldIj4KICAgICAgICAgICAgSnVtcCB0byBSdWxlCiAgICAgICAgICA8L2gyPgoKICAgICAgICAgIDxpbnB1dAogICAgICAgICAgICB0eXBlPSJzZWFyY2giCiAgICAgICAgICAgIHZhbHVlPXtydWxlU2VhcmNofQogICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRSdWxlU2VhcmNoKGV2ZW50LnRhcmdldC52YWx1ZSl9CiAgICAgICAgICAgIHBsYWNlaG9sZGVyPSJTZWFyY2ggcnVsZXMgb3IgbnVtYmVycy4uLiIKICAgICAgICAgICAgY2xhc3NOYW1lPXtgJHtzZWFyY2hDbGFzc30gbXQtM2B9CiAgICAgICAgICAvPgoKICAgICAgICAgIDxwIGNsYXNzTmFtZT0ibWItMiBtdC0zIHRleHQtWzhweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjE4ZW1dIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLTgwNmI1MCkpXSI+CiAgICAgICAgICAgIFJ1bGVzIMK3IHt2aXNpYmxlUnVsZXMubGVuZ3RofQogICAgICAgICAgICB7cnVsZVF1ZXJ5ID8gYCAvICR7cnVsZXMubGVuZ3RofWAgOiAiIn0KICAgICAgICAgIDwvcD4KICAgICAgICA8L2Rpdj4KCiAgICAgICAgPGRpdiBjbGFzc05hbWU9Im1pbi1oLTAgZmxleC0xIHNwYWNlLXktMS41IG92ZXJmbG93LXktYXV0byBwci0xIj4KICAgICAgICAgIHt2aXNpYmxlUnVsZXMubGVuZ3RoID8gKAogICAgICAgICAgICB2aXNpYmxlUnVsZXMubWFwKChydWxlKSA9PiAoCiAgICAgICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICAgICAga2V5PXtydWxlLmlkfQogICAgICAgICAgICAgICAgdHlwZT0iYnV0dG9uIgogICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4KICAgICAgICAgICAgICAgICAganVtcFRvKGBob3VzZS1vZi1jaGFuY2VzLXJ1bGUtJHtydWxlLmlkfWApCiAgICAgICAgICAgICAgICB9CiAgICAgICAgICAgICAgICBjbGFzc05hbWU9Imdyb3VwIHctZnVsbCBib3JkZXIgYm9yZGVyLVtyZ2IodmFyKC0tc2VwLWNvbG91ci01OTQzMmMpKV0vNDUgYmctW3JnYih2YXIoLS1zZXAtY29sb3VyLTEwMGMwOSkpXSBweC0zIHB5LTIuNSB0ZXh0LWxlZnQgdHJhbnNpdGlvbiBob3Zlcjpib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLThhNjczZikpXSBob3ZlcjpiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTcxMTBkKSldIgogICAgICAgICAgICAgID4KICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0iZmxleCBpdGVtcy1zdGFydCBqdXN0aWZ5LWJldHdlZW4gZ2FwLTIiPgogICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9Im1pbi13LTAgdHJ1bmNhdGUgZm9udC1zZXJpZiB0ZXh0LVsxM3B4XSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1jYmIyOGEpKV0gZ3JvdXAtaG92ZXI6dGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItZWFkMGEwKSldIj4KICAgICAgICAgICAgICAgICAgICB7cnVsZS5uYW1lfQogICAgICAgICAgICAgICAgICA8L3NwYW4+CgogICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InNocmluay0wIHRleHQtWzdweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjEyZW1dIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLTcyNWEzZCkpXSI+CiAgICAgICAgICAgICAgICAgICAgUHtydWxlLnByaW9yaXR5fQogICAgICAgICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgICAgICA8L3NwYW4+CgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJtdC0yIGZsZXggZmxleC13cmFwIGdhcC0xIj4KICAgICAgICAgICAgICAgICAge2NvbmRpdGlvblRva2VucyhydWxlKS5tYXAoKHRva2VuLCBpbmRleCkgPT4gKAogICAgICAgICAgICAgICAgICAgIDxzcGFuCiAgICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3J1bGUuaWR9LSR7dG9rZW59LSR7aW5kZXh9YH0KICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0iYm9yZGVyIGJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNzY1NzM1KSldLzU1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0xNzExMGQpKV0gcHgtMS41IHB5LTAuNSBmb250LW1vbm8gdGV4dC1bOHB4XSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1jN2FhN2IpKV0iCiAgICAgICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICAgICAge3Rva2VufQogICAgICAgICAgICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgICAgICAgICAgKSl9CiAgICAgICAgICAgICAgICA8L3NwYW4+CiAgICAgICAgICAgICAgPC9idXR0b24+CiAgICAgICAgICAgICkpCiAgICAgICAgICApIDogKAogICAgICAgICAgICA8cCBjbGFzc05hbWU9InRleHQteHMgdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItOGY4MjZmKSldIj4KICAgICAgICAgICAgICBObyBtYXRjaGluZyBydWxlcy4KICAgICAgICAgICAgPC9wPgogICAgICAgICAgKX0KICAgICAgICA8L2Rpdj4KICAgICAgPC9zZWN0aW9uPgoKICAgICAgPHNlY3Rpb24gY2xhc3NOYW1lPSJmbGV4IG1pbi1oLTAgZmxleC1jb2wgYm9yZGVyLXQgYm9yZGVyLVtyZ2IodmFyKC0tc2VwLWNvbG91ci01OTQzMmMpKV0vMzUgcHQtNCI+CiAgICAgICAgPGRpdiBjbGFzc05hbWU9InNocmluay0wIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bOHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMjRlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItODA2YjUwKSldIj4KICAgICAgICAgICAgUmVjZW50IHBsYXlzCiAgICAgICAgICA8L3A+CiAgICAgICAgICA8aDIgY2xhc3NOYW1lPSJtdC0xIGZvbnQtc2VyaWYgdGV4dC14bCB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1kOGJmOTEpKV0iPgogICAgICAgICAgICBGaW5kIGEgUGxheQogICAgICAgICAgPC9oMj4KCiAgICAgICAgICA8aW5wdXQKICAgICAgICAgICAgdHlwZT0ic2VhcmNoIgogICAgICAgICAgICB2YWx1ZT17cGxheVNlYXJjaH0KICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gc2V0UGxheVNlYXJjaChldmVudC50YXJnZXQudmFsdWUpfQogICAgICAgICAgICBwbGFjZWhvbGRlcj0iTmFtZSwgcnVsZSBvciBkYXRlLi4uIgogICAgICAgICAgICBjbGFzc05hbWU9e2Ake3NlYXJjaENsYXNzfSBtdC0zYH0KICAgICAgICAgIC8+CgogICAgICAgICAgPHAgY2xhc3NOYW1lPSJtYi0yIG10LTMgdGV4dC1bOHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMThlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItODA2YjUwKSldIj4KICAgICAgICAgICAgUGxheXMgwrcge3Zpc2libGVQbGF5cy5sZW5ndGh9CiAgICAgICAgICAgIHtwbGF5UXVlcnkgPyBgIC8gJHtwbGF5cy5sZW5ndGh9YCA6ICIifQogICAgICAgICAgPC9wPgogICAgICAgIDwvZGl2PgoKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0ibWluLWgtMCBmbGV4LTEgc3BhY2UteS0xLjUgb3ZlcmZsb3cteS1hdXRvIHByLTEiPgogICAgICAgICAge3Zpc2libGVQbGF5cy5sZW5ndGggPyAoCiAgICAgICAgICAgIHZpc2libGVQbGF5cy5tYXAoKHBsYXkpID0+ICgKICAgICAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgICAgICBrZXk9e3BsYXkuaWR9CiAgICAgICAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PgogICAgICAgICAgICAgICAgICBqdW1wVG8oYGhvdXNlLW9mLWNoYW5jZXMtcGxheS0ke3BsYXkuaWR9YCkKICAgICAgICAgICAgICAgIH0KICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0iZ3JvdXAgdy1mdWxsIGJvcmRlciBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTU5NDMyYykpXS80NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTAwYzA5KSldIHB4LTMgcHktMi41IHRleHQtbGVmdCB0cmFuc2l0aW9uIGhvdmVyOmJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItOGE2NzNmKSldIGhvdmVyOmJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0xNzExMGQpKV0iCiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJibG9jayB0cnVuY2F0ZSBmb250LXNlcmlmIHRleHQtWzEzcHhdIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWNiYjI4YSkpXSBncm91cC1ob3Zlcjp0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1lYWQwYTApKV0iPgogICAgICAgICAgICAgICAgICB7cGxheS5jaGFyYWN0ZXJ9CiAgICAgICAgICAgICAgICA8L3NwYW4+CgogICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJtdC0xIGJsb2NrIHRydW5jYXRlIHRleHQtWzhweF0gdXBwZXJjYXNlIHRyYWNraW5nLVswLjFlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItN2Y3MDVkKSldIj4KICAgICAgICAgICAgICAgICAge3BsYXkucnVsZX0KICAgICAgICAgICAgICAgIDwvc3Bhbj4KCiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9Im10LTIgZmxleCBmbGV4LXdyYXAgaXRlbXMtY2VudGVyIGdhcC0xIj4KICAgICAgICAgICAgICAgICAge1twbGF5LnJvbGwxLCBwbGF5LnJvbGwyLCBwbGF5LnJvbGwzXS5tYXAoKHJvbGwsIGluZGV4KSA9PiAoCiAgICAgICAgICAgICAgICAgICAgPHNwYW4KICAgICAgICAgICAgICAgICAgICAgIGtleT17YCR7cGxheS5pZH0tcm9sbC0ke2luZGV4fWB9CiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9Im1pbi13LTYgYm9yZGVyIGJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNzY1NzM1KSldLzU1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0xNzExMGQpKV0gcHgtMS41IHB5LTAuNSB0ZXh0LWNlbnRlciBmb250LW1vbm8gdGV4dC1bOHB4XSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1jN2FhN2IpKV0iCiAgICAgICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICAgICAge3JvbGx9CiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgICApKX0KCiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT0ibWwtYXV0byB0ZXh0LVs3cHhdIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLTY2NWI0ZCkpXSI+CiAgICAgICAgICAgICAgICAgICAge3BsYXkuZGF0ZX0KICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICApKQogICAgICAgICAgKSA6ICgKICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LXhzIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLThmODI2ZikpXSI+CiAgICAgICAgICAgICAgTm8gbWF0Y2hpbmcgcGxheXMuCiAgICAgICAgICAgIDwvcD4KICAgICAgICAgICl9CiAgICAgICAgPC9kaXY+CiAgICAgIDwvc2VjdGlvbj4KICAgIDwvZGl2PgogICk7Cn0K'))

# Hook into admin context router + overview
context = context_path.read_text(encoding="utf-8")
import_anchor = 'import { CraftingRecipesContextPanel } from "@/components/admin/crafting-recipes-context-panel";\n'
if "HouseOfChancesContextPanel" not in context:
    context = context.replace(import_anchor, import_anchor + 'import { HouseOfChancesContextPanel } from "@/components/admin/house-of-chances-context-panel";\n', 1)

mode_anchor = '  | "items"\n  | "crafting_recipes"\n'
if '  | "house_of_chances"\n' not in context:
    context = context.replace(mode_anchor, '  | "items"\n  | "house_of_chances"\n  | "crafting_recipes"\n', 1)

route_anchor = '''  if (pathname === "/admin/items") {
    return "items";
  }

'''
route_insert = '''  if (pathname === "/admin/items") {
    return "items";
  }

  if (pathname === "/admin/house-of-chances") {
    return "house_of_chances";
  }

'''
if 'pathname === "/admin/house-of-chances"' not in context:
    if route_anchor not in context: raise SystemExit("Could not find context route anchor.")
    context = context.replace(route_anchor, route_insert, 1)

render_anchor = '''  if (mode === "codex") {
    return (
      <AdminCodexNavigatorContext />
    );
  }

'''
render_insert = '''  if (mode === "house_of_chances") {
    return (
      <HouseOfChancesContextPanel />
    );
  }

  if (mode === "codex") {
    return (
      <AdminCodexNavigatorContext />
    );
  }

'''
if 'mode === "house_of_chances"' not in context:
    if render_anchor not in context: raise SystemExit("Could not find context render anchor.")
    context = context.replace(render_anchor, render_insert, 1)

nav_anchor = '  { section: "forum", label: "Forum", href: "/admin/forum" },\n  { section: "items", label: "Items", href: "/admin/items" },\n'
nav_insert = '  { section: "forum", label: "Forum", href: "/admin/forum" },\n  { section: "house_of_chances", label: "House of Chances", href: "/admin/house-of-chances", aliases: ["chances", "gambling", "fortune"] },\n  { section: "items", label: "Items", href: "/admin/items" },\n'
if 'label: "House of Chances"' not in context:
    if nav_anchor not in context: raise SystemExit("Could not find overview nav anchor.")
    context = context.replace(nav_anchor, nav_insert, 1)
context_path.write_text(context, encoding="utf-8")

print("SUCCESS")
print("Applied House of Chances refinements based on eaf01cf.")
print("Now run: npm run build")
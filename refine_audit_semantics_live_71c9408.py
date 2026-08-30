from pathlib import Path
import base64
import re

root = Path.cwd()

required = [
    root / "app/(portal)/admin/character-audit/page.tsx",
    root / "app/api/character-audit/route.ts",
    root / "lib/audit/character-audit-display.ts",
    root / "components/characters/character-audit-entry.tsx",
    root / "components/admin/character-audit-context-panel.tsx",
]
for path in required:
    if not path.exists():
        raise SystemExit(f"Could not find {path.relative_to(root)}. Run this from the repository root.")

payloads = {'lib/audit/enrich-character-audit-context.ts': 'aW1wb3J0ICJzZXJ2ZXItb25seSI7CgppbXBvcnQgeyBlbnJpY2hDaGFyYWN0ZXJBdWRpdEl0ZW1OYW1lcyB9IGZyb20gIkAvbGliL2F1ZGl0L2VucmljaC1jaGFyYWN0ZXItYXVkaXQtaXRlbXMiOwoKdHlwZSBSb3cgPSB7CiAgaWQ6IHN0cmluZzsKICBjaGFyYWN0ZXJfaWQ/OiBzdHJpbmcgfCBudWxsOwogIGVudGl0eV90eXBlOiBzdHJpbmc7CiAgZW50aXR5X2lkOiBzdHJpbmcgfCBudWxsOwogIG9wZXJhdGlvbjogc3RyaW5nOwogIGFjdG9yX3R5cGU/OiBzdHJpbmcgfCBudWxsOwogIHNvdXJjZT86IHN0cmluZyB8IG51bGw7CiAgb2xkX3ZhbHVlczogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsOwogIG5ld192YWx1ZXM6IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbDsKICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIHVua25vd24+IHwgbnVsbDsKICBjcmVhdGVkX2F0OiBzdHJpbmc7Cn07CgpmdW5jdGlvbiBpc0ludmVudG9yeShyb3c6IFJvdykgewogIHJldHVybiAoCiAgICByb3cuZW50aXR5X3R5cGUgPT09ICJjaGFyYWN0ZXJfaXRlbXMiIHx8CiAgICByb3cuZW50aXR5X3R5cGUgPT09ICJjaGFyYWN0ZXJfaXRlbV9pbnN0YW5jZXMiCiAgKTsKfQoKZnVuY3Rpb24gY29udGFpbnNDcmFmdCh2YWx1ZTogdW5rbm93bikgewogIGlmICh2YWx1ZSA9PT0gbnVsbCB8fCB2YWx1ZSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7CgogIHRyeSB7CiAgICBjb25zdCB0ZXh0ID0KICAgICAgdHlwZW9mIHZhbHVlID09PSAic3RyaW5nIgogICAgICAgID8gdmFsdWUKICAgICAgICA6IEpTT04uc3RyaW5naWZ5KHZhbHVlKTsKCiAgICByZXR1cm4gdGV4dC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKCJjcmFmdCIpOwogIH0gY2F0Y2ggewogICAgcmV0dXJuIGZhbHNlOwogIH0KfQoKZnVuY3Rpb24gZXhwbGljaXRDcmFmdGluZyhyb3c6IFJvdykgewogIHJldHVybiAoCiAgICBjb250YWluc0NyYWZ0KHJvdy5zb3VyY2UpIHx8CiAgICBjb250YWluc0NyYWZ0KHJvdy5tZXRhZGF0YSkgfHwKICAgIGNvbnRhaW5zQ3JhZnQocm93Lm9sZF92YWx1ZXM/LmFjcXVpc2l0aW9uX3NvdXJjZSkgfHwKICAgIGNvbnRhaW5zQ3JhZnQocm93Lm5ld192YWx1ZXM/LmFjcXVpc2l0aW9uX3NvdXJjZSkKICApOwp9CgpmdW5jdGlvbiBxdWFudGl0eSh2YWx1ZTogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gfCBudWxsKSB7CiAgY29uc3QgcmF3ID0gdmFsdWU/LnF1YW50aXR5OwoKICBpZiAodHlwZW9mIHJhdyA9PT0gIm51bWJlciIpIHJldHVybiByYXc7CgogIGlmICgKICAgIHJhdyAhPT0gbnVsbCAmJgogICAgcmF3ICE9PSB1bmRlZmluZWQgJiYKICAgIE51bWJlci5pc0Zpbml0ZShOdW1iZXIocmF3KSkKICApIHsKICAgIHJldHVybiBOdW1iZXIocmF3KTsKICB9CgogIHJldHVybiBudWxsOwp9CgpmdW5jdGlvbiBkZWx0YShyb3c6IFJvdykgewogIGlmICghaXNJbnZlbnRvcnkocm93KSkgcmV0dXJuIG51bGw7CgogIGlmIChyb3cuZW50aXR5X3R5cGUgPT09ICJjaGFyYWN0ZXJfaXRlbV9pbnN0YW5jZXMiKSB7CiAgICBpZiAocm93Lm9wZXJhdGlvbiA9PT0gImluc2VydCIpIHJldHVybiAxOwogICAgaWYgKHJvdy5vcGVyYXRpb24gPT09ICJkZWxldGUiKSByZXR1cm4gLTE7CiAgICByZXR1cm4gMDsKICB9CgogIGNvbnN0IGJlZm9yZSA9IHF1YW50aXR5KHJvdy5vbGRfdmFsdWVzKTsKICBjb25zdCBhZnRlciA9IHF1YW50aXR5KHJvdy5uZXdfdmFsdWVzKTsKCiAgaWYgKHJvdy5vcGVyYXRpb24gPT09ICJpbnNlcnQiKSByZXR1cm4gYWZ0ZXIgPz8gMTsKICBpZiAocm93Lm9wZXJhdGlvbiA9PT0gImRlbGV0ZSIpIHJldHVybiAtKGJlZm9yZSA/PyAxKTsKCiAgcmV0dXJuIGJlZm9yZSAhPT0gbnVsbCAmJiBhZnRlciAhPT0gbnVsbAogICAgPyBhZnRlciAtIGJlZm9yZQogICAgOiBudWxsOwp9CgpmdW5jdGlvbiBncm91cEtleShyb3c6IFJvdykgewogIHJldHVybiBbCiAgICByb3cuY2hhcmFjdGVyX2lkID8/ICJzaW5nbGUtY2hhcmFjdGVyIiwKICAgIHJvdy5hY3Rvcl90eXBlID8/ICJ1bmtub3duIiwKICAgIHJvdy5jcmVhdGVkX2F0LAogIF0uam9pbigifCIpOwp9CgpleHBvcnQgYXN5bmMgZnVuY3Rpb24gZW5yaWNoQ2hhcmFjdGVyQXVkaXRSb3dzPFQgZXh0ZW5kcyBSb3c+KAogIHJvd3M6IFRbXSwKKTogUHJvbWlzZTwKICBBcnJheTwKICAgIFQgJiB7CiAgICAgIGl0ZW1fbmFtZTogc3RyaW5nIHwgbnVsbDsKICAgICAgYXVkaXRfY29udGV4dDogc3RyaW5nIHwgbnVsbDsKICAgIH0KICA+Cj4gewogIGNvbnN0IGVucmljaGVkID0KICAgIGF3YWl0IGVucmljaENoYXJhY3RlckF1ZGl0SXRlbU5hbWVzKHJvd3MpOwoKICBjb25zdCBncm91cHMgPSBuZXcgTWFwPAogICAgc3RyaW5nLAogICAgdHlwZW9mIGVucmljaGVkCiAgPigpOwoKICBmb3IgKGNvbnN0IHJvdyBvZiBlbnJpY2hlZCkgewogICAgaWYgKCFpc0ludmVudG9yeShyb3cpKSBjb250aW51ZTsKCiAgICBjb25zdCBrZXkgPSBncm91cEtleShyb3cpOwogICAgY29uc3QgZ3JvdXAgPSBncm91cHMuZ2V0KGtleSkgPz8gW107CiAgICBncm91cC5wdXNoKHJvdyk7CiAgICBncm91cHMuc2V0KGtleSwgZ3JvdXApOwogIH0KCiAgY29uc3QgY3JhZnRpbmdJZHMgPSBuZXcgU2V0PHN0cmluZz4oKTsKCiAgZm9yIChjb25zdCBncm91cCBvZiBncm91cHMudmFsdWVzKCkpIHsKICAgIGNvbnN0IGV4cGxpY2l0ID0KICAgICAgZ3JvdXAuc29tZShleHBsaWNpdENyYWZ0aW5nKTsKCiAgICBjb25zdCBkZWx0YXMgPSBncm91cAogICAgICAubWFwKGRlbHRhKQogICAgICAuZmlsdGVyKAogICAgICAgICh2YWx1ZSk6IHZhbHVlIGlzIG51bWJlciA9PgogICAgICAgICAgdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IDAsCiAgICAgICk7CgogICAgY29uc3QgaGFzR2FpbiA9CiAgICAgIGRlbHRhcy5zb21lKCh2YWx1ZSkgPT4gdmFsdWUgPiAwKTsKICAgIGNvbnN0IGhhc0xvc3MgPQogICAgICBkZWx0YXMuc29tZSgodmFsdWUpID0+IHZhbHVlIDwgMCk7CiAgICBjb25zdCBieVBsYXllciA9CiAgICAgIGdyb3VwLnNvbWUoKHJvdykgPT4gcm93LmFjdG9yX3R5cGUgPT09ICJwbGF5ZXIiKTsKCiAgICBpZiAoCiAgICAgIGV4cGxpY2l0IHx8CiAgICAgIChieVBsYXllciAmJiBoYXNHYWluICYmIGhhc0xvc3MpCiAgICApIHsKICAgICAgZm9yIChjb25zdCByb3cgb2YgZ3JvdXApIHsKICAgICAgICBjcmFmdGluZ0lkcy5hZGQocm93LmlkKTsKICAgICAgfQogICAgfQogIH0KCiAgcmV0dXJuIGVucmljaGVkLm1hcCgocm93KSA9PiAoewogICAgLi4ucm93LAogICAgYXVkaXRfY29udGV4dDoKICAgICAgY3JhZnRpbmdJZHMuaGFzKHJvdy5pZCkKICAgICAgICA/ICJjcmFmdGluZyIKICAgICAgICA6IG51bGwsCiAgfSkpOwp9Cg==', 'components/admin/character-audit-live-filter.tsx': 'InVzZSBjbGllbnQiOwoKaW1wb3J0IHsKICB1c2VFZmZlY3QsCiAgdXNlTWVtbywKICB1c2VTdGF0ZSwKfSBmcm9tICJyZWFjdCI7Cgp0eXBlIENoYXJhY3Rlck9wdGlvbiA9IHsKICBpZDogc3RyaW5nOwogIGRpc3BsYXlfbmFtZTogc3RyaW5nIHwgbnVsbDsKICBmaXJzdF9uYW1lOiBzdHJpbmc7CiAgc3VybmFtZTogc3RyaW5nIHwgbnVsbDsKfTsKCmNvbnN0IGNvbnRyb2xDbGFzcyA9CiAgImgtOSBtaW4tdy0wIGJvcmRlciBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTYwNDgyZSkpXS81NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTAwYzA5KSldIHB4LTMgdGV4dC1bOXB4XSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1kN2M0YTUpKV0gb3V0bGluZS1ub25lIHBsYWNlaG9sZGVyOnRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLTYyNTc0NykpXSBmb2N1czpib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTliNzQ0NikpXSI7CgpmdW5jdGlvbiBuYW1lKGNoYXJhY3RlcjogQ2hhcmFjdGVyT3B0aW9uKSB7CiAgcmV0dXJuICgKICAgIGNoYXJhY3Rlci5kaXNwbGF5X25hbWU/LnRyaW0oKSB8fAogICAgW2NoYXJhY3Rlci5maXJzdF9uYW1lLCBjaGFyYWN0ZXIuc3VybmFtZV0KICAgICAgLmZpbHRlcihCb29sZWFuKQogICAgICAuam9pbigiICIpCiAgICAgIC50cmltKCkgfHwKICAgICJVbm5hbWVkIGNoYXJhY3RlciIKICApOwp9CgpmdW5jdGlvbiBub2RlcygpIHsKICByZXR1cm4gQXJyYXkuZnJvbSgKICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KAogICAgICAiW2RhdGEtY2hhcmFjdGVyLWF1ZGl0LWlkXSIsCiAgICApLAogICk7Cn0KCmV4cG9ydCBmdW5jdGlvbiBDaGFyYWN0ZXJBdWRpdExpdmVGaWx0ZXIoewogIGNoYXJhY3RlcnMsCn06IHsKICBjaGFyYWN0ZXJzOiBDaGFyYWN0ZXJPcHRpb25bXTsKfSkgewogIGNvbnN0IFtzZWFyY2gsIHNldFNlYXJjaF0gPSB1c2VTdGF0ZSgiIik7CiAgY29uc3QgW2NoYXJhY3Rlciwgc2V0Q2hhcmFjdGVyXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbZXZlbnQsIHNldEV2ZW50XSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbYWN0b3IsIHNldEFjdG9yXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbc291cmNlLCBzZXRTb3VyY2VdID0gdXNlU3RhdGUoIiIpOwogIGNvbnN0IFtmcm9tLCBzZXRGcm9tXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbdG8sIHNldFRvXSA9IHVzZVN0YXRlKCIiKTsKICBjb25zdCBbZXZlbnRzLCBzZXRFdmVudHNdID0gdXNlU3RhdGU8c3RyaW5nW10+KFtdKTsKICBjb25zdCBbc291cmNlcywgc2V0U291cmNlc10gPSB1c2VTdGF0ZTxzdHJpbmdbXT4oW10pOwogIGNvbnN0IFt0b3RhbCwgc2V0VG90YWxdID0gdXNlU3RhdGUoMCk7CiAgY29uc3QgW3Zpc2libGUsIHNldFZpc2libGVdID0gdXNlU3RhdGUoMCk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBjb25zdCByZWNvcmRzID0gbm9kZXMoKTsKCiAgICBzZXRUb3RhbChyZWNvcmRzLmxlbmd0aCk7CiAgICBzZXRWaXNpYmxlKHJlY29yZHMubGVuZ3RoKTsKCiAgICBzZXRFdmVudHMoCiAgICAgIEFycmF5LmZyb20oCiAgICAgICAgbmV3IFNldCgKICAgICAgICAgIHJlY29yZHMKICAgICAgICAgICAgLm1hcCgKICAgICAgICAgICAgICAobm9kZSkgPT4KICAgICAgICAgICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdEV2ZW50ID8/ICIiLAogICAgICAgICAgICApCiAgICAgICAgICAgIC5maWx0ZXIoQm9vbGVhbiksCiAgICAgICAgKSwKICAgICAgKS5zb3J0KCksCiAgICApOwoKICAgIHNldFNvdXJjZXMoCiAgICAgIEFycmF5LmZyb20oCiAgICAgICAgbmV3IFNldCgKICAgICAgICAgIHJlY29yZHMKICAgICAgICAgICAgLm1hcCgKICAgICAgICAgICAgICAobm9kZSkgPT4KICAgICAgICAgICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdFNvdXJjZSA/PyAiIiwKICAgICAgICAgICAgKQogICAgICAgICAgICAuZmlsdGVyKEJvb2xlYW4pLAogICAgICAgICksCiAgICAgICkuc29ydCgpLAogICAgKTsKICB9LCBbXSk7CgogIHVzZUVmZmVjdCgoKSA9PiB7CiAgICBjb25zdCBuZWVkbGUgPQogICAgICBzZWFyY2gudHJpbSgpLnRvTG93ZXJDYXNlKCk7CgogICAgbGV0IGNvdW50ID0gMDsKCiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygbm9kZXMoKSkgewogICAgICBjb25zdCBjaGFyYWN0ZXJNYXRjaGVzID0KICAgICAgICAhY2hhcmFjdGVyIHx8CiAgICAgICAgbm9kZS5kYXRhc2V0LmNoYXJhY3RlckF1ZGl0Q2hhcmFjdGVySWQgPT09CiAgICAgICAgICBjaGFyYWN0ZXI7CgogICAgICBjb25zdCBldmVudE1hdGNoZXMgPQogICAgICAgICFldmVudCB8fAogICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdEV2ZW50ID09PQogICAgICAgICAgZXZlbnQ7CgogICAgICBjb25zdCBhY3Rvck1hdGNoZXMgPQogICAgICAgICFhY3RvciB8fAogICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdEFjdG9yVHlwZSA9PT0KICAgICAgICAgIGFjdG9yOwoKICAgICAgY29uc3Qgc291cmNlTWF0Y2hlcyA9CiAgICAgICAgIXNvdXJjZSB8fAogICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdFNvdXJjZSA9PT0KICAgICAgICAgIHNvdXJjZTsKCiAgICAgIGNvbnN0IHJhd0RhdGUgPQogICAgICAgIG5vZGUuZGF0YXNldC5jaGFyYWN0ZXJBdWRpdERhdGVJc28gPz8gIiI7CgogICAgICBjb25zdCBkYXkgPSByYXdEYXRlCiAgICAgICAgPyByYXdEYXRlLnNsaWNlKDAsIDEwKQogICAgICAgIDogIiI7CgogICAgICBjb25zdCBkYXRlTWF0Y2hlcyA9CiAgICAgICAgKCFmcm9tIHx8IGRheSA+PSBmcm9tKSAmJgogICAgICAgICghdG8gfHwgZGF5IDw9IHRvKTsKCiAgICAgIGNvbnN0IHNlYXJjaE1hdGNoZXMgPQogICAgICAgICFuZWVkbGUgfHwKICAgICAgICAobm9kZS50ZXh0Q29udGVudCA/PyAiIikKICAgICAgICAgIC50b0xvd2VyQ2FzZSgpCiAgICAgICAgICAuaW5jbHVkZXMobmVlZGxlKTsKCiAgICAgIGNvbnN0IHNob3cgPQogICAgICAgIGNoYXJhY3Rlck1hdGNoZXMgJiYKICAgICAgICBldmVudE1hdGNoZXMgJiYKICAgICAgICBhY3Rvck1hdGNoZXMgJiYKICAgICAgICBzb3VyY2VNYXRjaGVzICYmCiAgICAgICAgZGF0ZU1hdGNoZXMgJiYKICAgICAgICBzZWFyY2hNYXRjaGVzOwoKICAgICAgbm9kZS5oaWRkZW4gPSAhc2hvdzsKCiAgICAgIGlmIChzaG93KSBjb3VudCArPSAxOwogICAgfQoKICAgIHNldFZpc2libGUoY291bnQpOwogIH0sIFsKICAgIHNlYXJjaCwKICAgIGNoYXJhY3RlciwKICAgIGV2ZW50LAogICAgYWN0b3IsCiAgICBzb3VyY2UsCiAgICBmcm9tLAogICAgdG8sCiAgXSk7CgogIGNvbnN0IHNvcnRlZENoYXJhY3RlcnMgPQogICAgdXNlTWVtbygKICAgICAgKCkgPT4KICAgICAgICBbLi4uY2hhcmFjdGVyc10uc29ydCgoYSwgYikgPT4KICAgICAgICAgIG5hbWUoYSkubG9jYWxlQ29tcGFyZShuYW1lKGIpKSwKICAgICAgICApLAogICAgICBbY2hhcmFjdGVyc10sCiAgICApOwoKICBjb25zdCBoYXNGaWx0ZXJzID0KICAgIEJvb2xlYW4oCiAgICAgIHNlYXJjaCB8fAogICAgICAgIGNoYXJhY3RlciB8fAogICAgICAgIGV2ZW50IHx8CiAgICAgICAgYWN0b3IgfHwKICAgICAgICBzb3VyY2UgfHwKICAgICAgICBmcm9tIHx8CiAgICAgICAgdG8sCiAgICApOwoKICBmdW5jdGlvbiByZXNldCgpIHsKICAgIHNldFNlYXJjaCgiIik7CiAgICBzZXRDaGFyYWN0ZXIoIiIpOwogICAgc2V0RXZlbnQoIiIpOwogICAgc2V0QWN0b3IoIiIpOwogICAgc2V0U291cmNlKCIiKTsKICAgIHNldEZyb20oIiIpOwogICAgc2V0VG8oIiIpOwogIH0KCiAgcmV0dXJuICgKICAgIDxkaXYKICAgICAgZGF0YS1zZXAtaW50ZXJhY3Rpb24tZml4ZWQ9InRydWUiCiAgICAgIGNsYXNzTmFtZT0ibXQtNiBib3JkZXIgYm9yZGVyLVtyZ2IodmFyKC0tc2VwLWNvbG91ci02MDQ4MmUpKV0vNDUgYmctW3JnYih2YXIoLS1zZXAtY29sb3VyLTE1MTAwZCkpXSBwLTQiCiAgICA+CiAgICAgIDxkaXYgY2xhc3NOYW1lPSJncmlkIGdhcC0yIG1kOmdyaWQtY29scy0yIHhsOmdyaWQtY29scy00Ij4KICAgICAgICA8aW5wdXQKICAgICAgICAgIHR5cGU9InNlYXJjaCIKICAgICAgICAgIHZhbHVlPXtzZWFyY2h9CiAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldFNlYXJjaChlLnRhcmdldC52YWx1ZSl9CiAgICAgICAgICBwbGFjZWhvbGRlcj0iU2VhcmNoIHZhbHVlcywgSXRlbSwgYWN0b3IsIGV2ZW50Li4uIgogICAgICAgICAgY2xhc3NOYW1lPXtjb250cm9sQ2xhc3N9CiAgICAgICAgLz4KCiAgICAgICAgPHNlbGVjdAogICAgICAgICAgdmFsdWU9e2NoYXJhY3Rlcn0KICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0Q2hhcmFjdGVyKGUudGFyZ2V0LnZhbHVlKX0KICAgICAgICAgIGNsYXNzTmFtZT17Y29udHJvbENsYXNzfQogICAgICAgID4KICAgICAgICAgIDxvcHRpb24gdmFsdWU9IiI+QWxsIENoYXJhY3RlcnM8L29wdGlvbj4KICAgICAgICAgIHtzb3J0ZWRDaGFyYWN0ZXJzLm1hcCgoZW50cnkpID0+ICgKICAgICAgICAgICAgPG9wdGlvbiBrZXk9e2VudHJ5LmlkfSB2YWx1ZT17ZW50cnkuaWR9PgogICAgICAgICAgICAgIHtuYW1lKGVudHJ5KX0KICAgICAgICAgICAgPC9vcHRpb24+CiAgICAgICAgICApKX0KICAgICAgICA8L3NlbGVjdD4KCiAgICAgICAgPHNlbGVjdAogICAgICAgICAgdmFsdWU9e2V2ZW50fQogICAgICAgICAgb25DaGFuZ2U9eyhlKSA9PiBzZXRFdmVudChlLnRhcmdldC52YWx1ZSl9CiAgICAgICAgICBjbGFzc05hbWU9e2NvbnRyb2xDbGFzc30KICAgICAgICA+CiAgICAgICAgICA8b3B0aW9uIHZhbHVlPSIiPkFsbCBldmVudHM8L29wdGlvbj4KICAgICAgICAgIHtldmVudHMubWFwKCh2YWx1ZSkgPT4gKAogICAgICAgICAgICA8b3B0aW9uIGtleT17dmFsdWV9IHZhbHVlPXt2YWx1ZX0+CiAgICAgICAgICAgICAge3ZhbHVlfQogICAgICAgICAgICA8L29wdGlvbj4KICAgICAgICAgICkpfQogICAgICAgIDwvc2VsZWN0PgoKICAgICAgICA8c2VsZWN0CiAgICAgICAgICB2YWx1ZT17YWN0b3J9CiAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEFjdG9yKGUudGFyZ2V0LnZhbHVlKX0KICAgICAgICAgIGNsYXNzTmFtZT17Y29udHJvbENsYXNzfQogICAgICAgID4KICAgICAgICAgIDxvcHRpb24gdmFsdWU9IiI+QWxsIGFjdG9yczwvb3B0aW9uPgogICAgICAgICAgPG9wdGlvbiB2YWx1ZT0icGxheWVyIj5QbGF5ZXI8L29wdGlvbj4KICAgICAgICAgIDxvcHRpb24gdmFsdWU9InN0YWZmIj5TdGFmZjwvb3B0aW9uPgogICAgICAgICAgPG9wdGlvbiB2YWx1ZT0ic3lzdGVtIj5TeXN0ZW08L29wdGlvbj4KICAgICAgICA8L3NlbGVjdD4KCiAgICAgICAgPHNlbGVjdAogICAgICAgICAgdmFsdWU9e3NvdXJjZX0KICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0U291cmNlKGUudGFyZ2V0LnZhbHVlKX0KICAgICAgICAgIGNsYXNzTmFtZT17Y29udHJvbENsYXNzfQogICAgICAgID4KICAgICAgICAgIDxvcHRpb24gdmFsdWU9IiI+QWxsIHNvdXJjZXM8L29wdGlvbj4KICAgICAgICAgIHtzb3VyY2VzLm1hcCgodmFsdWUpID0+ICgKICAgICAgICAgICAgPG9wdGlvbiBrZXk9e3ZhbHVlfSB2YWx1ZT17dmFsdWV9PgogICAgICAgICAgICAgIHt2YWx1ZX0KICAgICAgICAgICAgPC9vcHRpb24+CiAgICAgICAgICApKX0KICAgICAgICA8L3NlbGVjdD4KCiAgICAgICAgPGlucHV0CiAgICAgICAgICB0eXBlPSJkYXRlIgogICAgICAgICAgdmFsdWU9e2Zyb219CiAgICAgICAgICBvbkNoYW5nZT17KGUpID0+IHNldEZyb20oZS50YXJnZXQudmFsdWUpfQogICAgICAgICAgdGl0bGU9IkZyb20gZGF0ZSIKICAgICAgICAgIGNsYXNzTmFtZT17Y29udHJvbENsYXNzfQogICAgICAgIC8+CgogICAgICAgIDxpbnB1dAogICAgICAgICAgdHlwZT0iZGF0ZSIKICAgICAgICAgIHZhbHVlPXt0b30KICAgICAgICAgIG9uQ2hhbmdlPXsoZSkgPT4gc2V0VG8oZS50YXJnZXQudmFsdWUpfQogICAgICAgICAgdGl0bGU9IlRvIGRhdGUiCiAgICAgICAgICBjbGFzc05hbWU9e2NvbnRyb2xDbGFzc30KICAgICAgICAvPgoKICAgICAgICA8ZGl2IGNsYXNzTmFtZT0iZmxleCBpdGVtcy1jZW50ZXIganVzdGlmeS1iZXR3ZWVuIGdhcC0yIj4KICAgICAgICAgIDxwIGNsYXNzTmFtZT0idGV4dC1bOHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTJlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItNzE2NjU0KSldIj4KICAgICAgICAgICAge3Zpc2libGV9IC8ge3RvdGFsfSByZWNvcmRzCiAgICAgICAgICA8L3A+CgogICAgICAgICAgPGJ1dHRvbgogICAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICAgIG9uQ2xpY2s9e3Jlc2V0fQogICAgICAgICAgICBkaXNhYmxlZD17IWhhc0ZpbHRlcnN9CiAgICAgICAgICAgIGNsYXNzTmFtZT0iaC05IGJvcmRlciBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTYwNDgyZSkpXS81NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTgxMTBkKSldIHB4LTMgdGV4dC1bOHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTRlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItYWU5YTdiKSldIGRpc2FibGVkOmN1cnNvci1ub3QtYWxsb3dlZCBkaXNhYmxlZDpvcGFjaXR5LTQwIgogICAgICAgICAgPgogICAgICAgICAgICBSZXNldAogICAgICAgICAgPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvZGl2PgoKICAgICAgPHAgY2xhc3NOYW1lPSJtdC0zIHRleHQtcmlnaHQgdGV4dC1bOHB4XSB1cHBlcmNhc2UgdHJhY2tpbmctWzAuMTJlbV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItNzE2NjU0KSldIj4KICAgICAgICBMaXZlIGZpbHRlcnMgwrcgbmV3ZXN0IGZpcnN0IMK3IG1heGltdW0gNTAwIGRhdGFiYXNlIHJlc3VsdHMKICAgICAgPC9wPgogICAgPC9kaXY+CiAgKTsKfQo='}
for relative, content64 in payloads.items():
    target = root / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(base64.b64decode(content64))

display_path = root / "lib/audit/character-audit-display.ts"
text = display_path.read_text(encoding="utf-8")
type_old = '  item_name?: string | null;\n};'
type_new = '  item_name?: string | null;\n  audit_context?: string | null;\n};'
if "audit_context?: string | null;" not in text:
    if type_old not in text: raise SystemExit("Could not find audit row type anchor.")
    text = text.replace(type_old, type_new, 1)
helper_anchor = 'export function auditDisplayValue(value: unknown): string {'
helper_add = 'export function auditEventLabel(row: CharacterAuditDisplayBase) {\n  return row.audit_context\n    ? humanAuditLabel(row.audit_context)\n    : humanAuditLabel(row.event_type);\n}\n\nexport function auditSourceLabel(row: CharacterAuditDisplayBase) {\n  return row.audit_context\n    ? humanAuditLabel(row.audit_context)\n    : humanAuditLabel(row.source);\n}\n\nexport function auditRecordTypeLabel(row: CharacterAuditDisplayBase) {\n  return row.audit_context\n    ? humanAuditLabel(row.audit_context)\n    : humanAuditLabel(row.entity_type);\n}\n\n'
if "export function auditEventLabel" not in text:
    if helper_anchor not in text: raise SystemExit("Could not find audit helper anchor.")
    text = text.replace(helper_anchor, helper_add + helper_anchor, 1)
summary_anchor = '  if (isInventory(row.entity_type) && row.item_name) {\n    const beforeQty = qty(row, "before");\n    const afterQty = qty(row, "after");\n'
summary_new = '  if (\n    row.audit_context === "crafting" &&\n    isInventory(row.entity_type) &&\n    row.item_name\n  ) {\n    const beforeQty = qty(row, "before");\n    const afterQty = qty(row, "after");\n    let delta: number | null = null;\n\n    if (row.entity_type === "character_item_instances") {\n      delta =\n        row.operation === "insert"\n          ? 1\n          : row.operation === "delete"\n            ? -1\n            : 0;\n    } else if (row.operation === "insert") {\n      delta = afterQty ?? 1;\n    } else if (row.operation === "delete") {\n      delta = -(beforeQty ?? 1);\n    } else if (beforeQty !== null && afterQty !== null) {\n      delta = afterQty - beforeQty;\n    }\n\n    if (delta !== null && delta > 0) {\n      return `Crafted ${delta} × ${row.item_name}`;\n    }\n\n    if (delta !== null && delta < 0) {\n      return `Used ${Math.abs(delta)} × ${row.item_name} for Crafting`;\n    }\n\n    return `${row.item_name} changed during Crafting`;\n  }\n\n  if (isInventory(row.entity_type) && row.item_name) {\n    const beforeQty = qty(row, "before");\n    const afterQty = qty(row, "after");\n'
if 'row.audit_context === "crafting"' not in text:
    if summary_anchor not in text: raise SystemExit("Could not find inventory summary anchor.")
    text = text.replace(summary_anchor, summary_new, 1)
display_path.write_text(text, encoding="utf-8")

entry_path = root / "components/characters/character-audit-entry.tsx"
entry = entry_path.read_text(encoding="utf-8")
entry_import_old = '  auditDisplayValue,\n  auditSummary,'
entry_import_new = '  auditDisplayValue,\n  auditEventLabel,\n  auditRecordTypeLabel,\n  auditSourceLabel,\n  auditSummary,'
if "auditEventLabel," not in entry:
    if entry_import_old not in entry: raise SystemExit("Could not find audit-entry import anchor.")
    entry = entry.replace(entry_import_old, entry_import_new, 1)
article_old = '<article className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">'
article_new = '<article data-sep-interaction-fixed="true" className="border border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-15100d))] p-4">'
if 'data-sep-interaction-fixed="true"' not in entry:
    if article_old not in entry: raise SystemExit("Could not find audit card article anchor.")
    entry = entry.replace(article_old, article_new, 1)
entry = entry.replace("{humanAuditLabel(row.event_type)}", "{auditEventLabel(row)}")
entry = entry.replace("{humanAuditLabel(row.operation)} · {humanAuditLabel(row.entity_type)}", "{humanAuditLabel(row.operation)} · {auditRecordTypeLabel(row)}")
entry = entry.replace('["Source", humanAuditLabel(row.source)],', '["Source", auditSourceLabel(row)],')
entry = entry.replace('["Record type", humanAuditLabel(row.entity_type)],', '["Record type", auditRecordTypeLabel(row)],')
technical_old = '<p>Entity ID: {row.entity_id ?? "—"}</p>'
technical_new = '<p>Entity ID: {row.entity_id ?? "—"}</p>\n            <p>Raw event: {humanAuditLabel(row.event_type)}</p>\n            <p>Raw source: {humanAuditLabel(row.source)}</p>\n            <p>Raw record type: {humanAuditLabel(row.entity_type)}</p>'
if "Raw event:" not in entry:
    if technical_old not in entry: raise SystemExit("Could not find technical details anchor.")
    entry = entry.replace(technical_old, technical_new, 1)
entry_path.write_text(entry, encoding="utf-8")

api_path = root / "app/api/character-audit/route.ts"
api = api_path.read_text(encoding="utf-8")
api_import_old = 'import {\n  enrichCharacterAuditItemNames,\n} from "@/lib/audit/enrich-character-audit-items";'
api_import_new = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";'
if "enrichCharacterAuditRows" not in api:
    if api_import_old not in api: raise SystemExit("Could not find audit API enrichment import.")
    api = api.replace(api_import_old, api_import_new, 1)
api = api.replace("await enrichCharacterAuditItemNames(", "await enrichCharacterAuditRows(", 1)
api_map_old = '        item_name:\n          row.item_name,\n        actor_type:'
api_map_new = '        item_name:\n          row.item_name,\n        audit_context:\n          row.audit_context,\n        actor_type:'
if "audit_context:\n          row.audit_context" not in api:
    if api_map_old not in api: raise SystemExit("Could not find audit API mapping anchor.")
    api = api.replace(api_map_old, api_map_new, 1)
api_path.write_text(api, encoding="utf-8")

admin_path = root / "app/(portal)/admin/character-audit/page.tsx"
admin = admin_path.read_text(encoding="utf-8")
admin_old_import = 'import Link from "next/link";\n\nimport { CharacterAuditEntry } from "@/components/characters/character-audit-entry";'
admin_new_import = 'import { CharacterAuditEntry } from "@/components/characters/character-audit-entry";\nimport { CharacterAuditLiveFilter } from "@/components/admin/character-audit-live-filter";'
if "CharacterAuditLiveFilter" not in admin:
    if admin_old_import not in admin: raise SystemExit("Could not find admin audit import anchor.")
    admin = admin.replace(admin_old_import, admin_new_import, 1)
enrich_import_old = 'import {\n  enrichCharacterAuditItemNames,\n} from "@/lib/audit/enrich-character-audit-items";'
enrich_import_new = 'import {\n  enrichCharacterAuditRows,\n} from "@/lib/audit/enrich-character-audit-context";'
if "enrichCharacterAuditRows" not in admin:
    if enrich_import_old not in admin: raise SystemExit("Could not find admin enrichment import.")
    admin = admin.replace(enrich_import_old, enrich_import_new, 1)
admin = admin.replace("await enrichCharacterAuditItemNames(", "await enrichCharacterAuditRows(", 1)

# Remove server-side URL filtering so the complete 500-row set is available to live filters.
admin = re.sub(r'  const params = \(await searchParams\) \?\? \{\};\n', "", admin, count=1)
admin = re.sub(r'\n  if \(params\.character\) \{.*?\n  const \{ data, error \} = await query;', '\n  const { data, error } = await query;', admin, count=1, flags=re.S)
admin = re.sub(r'\n  const needle = params\.q\?\.trim\(\)\.toLowerCase\(\) \?\? "";.*?\n    : enrichedRows;', '\n  const rows = enrichedRows;', admin, count=1, flags=re.S)

# Replace the GET form with the live browser filter.
form_start = admin.find('        <form\n          method="get"')
if form_start == -1: raise SystemExit("Could not find admin audit filter form start.")
form_end = admin.find("        </form>", form_start)
if form_end == -1: raise SystemExit("Could not find admin audit filter form end.")
form_end += len("        </form>")
live_block = '        <CharacterAuditLiveFilter characters={(characters ?? []) as CharacterOption[]} />'
admin = admin[:form_start] + live_block + admin[form_end:]

# Use semantic labels + filter metadata on every rendered record.
admin = admin.replace("data-character-audit-event={humanAuditLabel(row.event_type)}", "data-character-audit-event={auditEventLabel(row)}")
admin = admin.replace("data-character-audit-source={row.source}", "data-character-audit-source={auditSourceLabel(row)}")
admin = admin.replace('data-character-audit-character={characterLabel}\n', 'data-character-audit-character={characterLabel}\n                  data-character-audit-character-id={row.character_id ?? ""}\n                  data-character-audit-actor-type={row.actor_type}\n                  data-character-audit-date-iso={row.created_at}\n')

# Ensure semantic helpers are imported.
admin = admin.replace("  auditChangeRows,\n  auditSummary,", "  auditChangeRows,\n  auditEventLabel,\n  auditSourceLabel,\n  auditSummary,", 1) if "auditEventLabel," not in admin else admin
admin_path.write_text(admin, encoding="utf-8")

context_path = root / "components/admin/character-audit-context-panel.tsx"
context = context_path.read_text(encoding="utf-8")
context = context.replace(').map((node) => ({\n    id:', ').filter((node) => !node.hidden).map((node) => ({\n    id:', 1) if ".filter((node) => !node.hidden)" not in context else context
context = context.replace('observer.observe(document.body, { childList: true, subtree: true });', 'observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });')
context_path.write_text(context, encoding="utf-8")

print("Audit semantic/live-filter patch applied successfully.")
print("Next: npm run build")
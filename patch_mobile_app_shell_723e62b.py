from pathlib import Path
import subprocess, base64

BASE = "723e62b"

def read(path):
    p = Path(path)
    if not p.exists():
        raise SystemExit(f"Missing {path}. Run from repo root. Expected {BASE}.")
    return p.read_text(encoding="utf-8")

def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}. Expected {BASE}.")
    return text.replace(old, new, 1)

head = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
if head != BASE:
    raise SystemExit(f"Wrong baseline: HEAD is {head}, expected {BASE}.")

new_path = Path("components/portal/mobile-portal-navigation.tsx")
if new_path.exists():
    raise SystemExit(f"{new_path} already exists. Expected clean {BASE}.")

mobile_nav = base64.b64decode("InVzZSBjbGllbnQiOwoKaW1wb3J0IExpbmsgZnJvbSAibmV4dC9saW5rIjsKaW1wb3J0IHsKICBCb29rT3BlbiwKICBFbGxpcHNpcywKICBIb21lLAogIE1hcCwKICBNZXNzYWdlQ2lyY2xlLAogIFNob3BwaW5nQmFnLAogIFNwYXJrbGVzLAogIFVzZXJzLAogIFgsCn0gZnJvbSAibHVjaWRlLXJlYWN0IjsKaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gInJlYWN0IjsKaW1wb3J0IHsgdXNlUGF0aG5hbWUgfSBmcm9tICJuZXh0L25hdmlnYXRpb24iOwoKdHlwZSBNb2JpbGVQb3J0YWxOYXZpZ2F0aW9uUHJvcHMgPSB7CiAgdW5yZWFkTWVzc2FnZUNvdW50OiBudW1iZXI7CiAgaXNTdGFmZjogYm9vbGVhbjsKfTsKCnR5cGUgTmF2RW50cnkgPSB7CiAgaHJlZjogc3RyaW5nOwogIGxhYmVsOiBzdHJpbmc7CiAgaWNvbjogUmVhY3QuQ29tcG9uZW50VHlwZTx7IGNsYXNzTmFtZT86IHN0cmluZyB9PjsKfTsKCmNvbnN0IG1vcmVFbnRyaWVzOiBOYXZFbnRyeVtdID0gWwogIHsgaHJlZjogIi9jaGFyYWN0ZXIiLCBsYWJlbDogIk15IENoYXJhY3RlciIsIGljb246IFVzZXJzIH0sCiAgeyBocmVmOiAiL2ZyaWVuZHMiLCBsYWJlbDogIkZyaWVuZHMiLCBpY29uOiBVc2VycyB9LAogIHsgaHJlZjogIi9tYXJrZXQiLCBsYWJlbDogIk1hcmtldCIsIGljb246IFNob3BwaW5nQmFnIH0sCiAgeyBocmVmOiAiL2NyYWZ0aW5nIiwgbGFiZWw6ICJDcmFmdGluZyIsIGljb246IFNwYXJrbGVzIH0sCiAgeyBocmVmOiAiL21pc3Npb25zIiwgbGFiZWw6ICJEYWlseSBNaXNzaW9ucyIsIGljb246IFNwYXJrbGVzIH0sCiAgeyBocmVmOiAiL2ZvcnVtIiwgbGFiZWw6ICJGb3J1bSIsIGljb246IE1lc3NhZ2VDaXJjbGUgfSwKICB7IGhyZWY6ICIvY29kZXgiLCBsYWJlbDogIkNvZGV4IiwgaWNvbjogQm9va09wZW4gfSwKICB7IGhyZWY6ICIvcnVsZXMiLCBsYWJlbDogIlJ1bGVzIiwgaWNvbjogQm9va09wZW4gfSwKXTsKCmZ1bmN0aW9uIGlzQWN0aXZlKHBhdGhuYW1lOiBzdHJpbmcsIGhyZWY6IHN0cmluZykgewogIGlmIChocmVmID09PSAiLyIpIHJldHVybiBwYXRobmFtZSA9PT0gIi8iOwogIHJldHVybiBwYXRobmFtZSA9PT0gaHJlZiB8fCBwYXRobmFtZS5zdGFydHNXaXRoKGAke2hyZWZ9L2ApOwp9CgpleHBvcnQgZnVuY3Rpb24gTW9iaWxlUG9ydGFsTmF2aWdhdGlvbih7CiAgdW5yZWFkTWVzc2FnZUNvdW50LAogIGlzU3RhZmYsCn06IE1vYmlsZVBvcnRhbE5hdmlnYXRpb25Qcm9wcykgewogIGNvbnN0IHBhdGhuYW1lID0gdXNlUGF0aG5hbWUoKTsKICBjb25zdCBbbW9yZU9wZW4sIHNldE1vcmVPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTsKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIHNldE1vcmVPcGVuKGZhbHNlKTsKICB9LCBbcGF0aG5hbWVdKTsKCiAgdXNlRWZmZWN0KCgpID0+IHsKICAgIGlmICghbW9yZU9wZW4pIHJldHVybjsKCiAgICBjb25zdCBwcmV2aW91cyA9IGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3c7CiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gImhpZGRlbiI7CgogICAgcmV0dXJuICgpID0+IHsKICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9IHByZXZpb3VzOwogICAgfTsKICB9LCBbbW9yZU9wZW5dKTsKCiAgY29uc3QgcHJpbWFyeTogTmF2RW50cnlbXSA9IFsKICAgIHsgaHJlZjogIi8iLCBsYWJlbDogIkhvbWUiLCBpY29uOiBIb21lIH0sCiAgICB7IGhyZWY6ICIvZ2FtZSIsIGxhYmVsOiAiUGxheSIsIGljb246IE1hcCB9LAogICAgeyBocmVmOiAiL2NoYXJhY3RlcnMiLCBsYWJlbDogIlBlb3BsZSIsIGljb246IFVzZXJzIH0sCiAgICB7IGhyZWY6ICIvbWVzc2FnZXMiLCBsYWJlbDogIk1lc3NhZ2VzIiwgaWNvbjogTWVzc2FnZUNpcmNsZSB9LAogIF07CgogIHJldHVybiAoCiAgICA8PgogICAgICA8bmF2CiAgICAgICAgZGF0YS1tb2JpbGUtcG9ydGFsLW5hdgogICAgICAgIGRhdGEtc2VwLWludGVyYWN0aW9uLWlnbm9yZT0idHJ1ZSIKICAgICAgICBhcmlhLWxhYmVsPSJNb2JpbGUgcG9ydGFsIG5hdmlnYXRpb24iCiAgICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC14LTAgYm90dG9tLTAgei1bODVdIGJvcmRlci10IGJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNjA0ODJlKSldLzU1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0wZDBiMGEpKV0vWzAuOTddIHB4LTIgcGItW21heCgwLjQ1cmVtLGVudihzYWZlLWFyZWEtaW5zZXQtYm90dG9tKSldIHB0LTEuNSBzaGFkb3ctWzBfLTEwcHhfMzJweF9yZ2JhKHZhcigtLXNlcC1yZ2ItMC0wLTApLDAuNDIpXSBiYWNrZHJvcC1ibHVyIGxnOmhpZGRlbiIKICAgICAgPgogICAgICAgIDxkaXYgY2xhc3NOYW1lPSJteC1hdXRvIGdyaWQgbWF4LXctbWQgZ3JpZC1jb2xzLTUgZ2FwLTEiPgogICAgICAgICAge3ByaW1hcnkubWFwKChlbnRyeSkgPT4gewogICAgICAgICAgICBjb25zdCBJY29uID0gZW50cnkuaWNvbjsKICAgICAgICAgICAgY29uc3QgYWN0aXZlID0gaXNBY3RpdmUocGF0aG5hbWUsIGVudHJ5LmhyZWYpOwoKICAgICAgICAgICAgcmV0dXJuICgKICAgICAgICAgICAgICA8TGluawogICAgICAgICAgICAgICAga2V5PXtlbnRyeS5ocmVmfQogICAgICAgICAgICAgICAgaHJlZj17ZW50cnkuaHJlZn0KICAgICAgICAgICAgICAgIGNsYXNzTmFtZT17WwogICAgICAgICAgICAgICAgICAicmVsYXRpdmUgZmxleCBtaW4taC1bNTBweF0gZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIHB4LTEgdGV4dC1bOXB4XSB0cmFja2luZy1bMC4wNGVtXSB0cmFuc2l0aW9uLWNvbG9ycyIsCiAgICAgICAgICAgICAgICAgIGFjdGl2ZQogICAgICAgICAgICAgICAgICAgID8gImJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0yMTE3MGYpKV0gdGV4dC1bcmdiKHZhcigtLXNlcC1jb2xvdXItZDRiNDdkKSldIgogICAgICAgICAgICAgICAgICAgIDogInRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLThmODA2ZCkpXSIsCiAgICAgICAgICAgICAgICBdLmpvaW4oIiAiKX0KICAgICAgICAgICAgICA+CiAgICAgICAgICAgICAgICA8SWNvbiBjbGFzc05hbWU9ImgtWzE4cHhdIHctWzE4cHhdIiAvPgogICAgICAgICAgICAgICAgPHNwYW4+e2VudHJ5LmxhYmVsfTwvc3Bhbj4KCiAgICAgICAgICAgICAgICB7ZW50cnkuaHJlZiA9PT0gIi9tZXNzYWdlcyIgJiYgdW5yZWFkTWVzc2FnZUNvdW50ID4gMCA/ICgKICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJhYnNvbHV0ZSByaWdodC1bMjAlXSB0b3AtMSBtaW4tdy00IHJvdW5kZWQtZnVsbCBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItOGEzODJkKSldIHB4LTEgdGV4dC1jZW50ZXIgdGV4dC1bOHB4XSBsZWFkaW5nLTQgdGV4dC13aGl0ZSI+CiAgICAgICAgICAgICAgICAgICAge3VucmVhZE1lc3NhZ2VDb3VudCA+IDk5ID8gIjk5KyIgOiB1bnJlYWRNZXNzYWdlQ291bnR9CiAgICAgICAgICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgICAgICAgICkgOiBudWxsfQogICAgICAgICAgICAgIDwvTGluaz4KICAgICAgICAgICAgKTsKICAgICAgICAgIH0pfQoKICAgICAgICAgIDxidXR0b24KICAgICAgICAgICAgdHlwZT0iYnV0dG9uIgogICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRNb3JlT3Blbih0cnVlKX0KICAgICAgICAgICAgYXJpYS1leHBhbmRlZD17bW9yZU9wZW59CiAgICAgICAgICAgIGFyaWEtbGFiZWw9Ik1vcmUgcG9ydGFsIG9wdGlvbnMiCiAgICAgICAgICAgIGNsYXNzTmFtZT0iZmxleCBtaW4taC1bNTBweF0gZmxleC1jb2wgaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIGdhcC0xIHB4LTEgdGV4dC1bOXB4XSB0cmFja2luZy1bMC4wNGVtXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci04ZjgwNmQpKV0iCiAgICAgICAgICA+CiAgICAgICAgICAgIDxFbGxpcHNpcyBjbGFzc05hbWU9ImgtWzE5cHhdIHctWzE5cHhdIiAvPgogICAgICAgICAgICA8c3Bhbj5Nb3JlPC9zcGFuPgogICAgICAgICAgPC9idXR0b24+CiAgICAgICAgPC9kaXY+CiAgICAgIDwvbmF2PgoKICAgICAge21vcmVPcGVuID8gKAogICAgICAgIDw+CiAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgIHR5cGU9ImJ1dHRvbiIKICAgICAgICAgICAgYXJpYS1sYWJlbD0iQ2xvc2UgbW9iaWxlIG1lbnUiCiAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNldE1vcmVPcGVuKGZhbHNlKX0KICAgICAgICAgICAgY2xhc3NOYW1lPSJmaXhlZCBpbnNldC0wIHotWzkwXSBiZy1ibGFjay83MCBiYWNrZHJvcC1ibHVyLVsycHhdIGxnOmhpZGRlbiIKICAgICAgICAgIC8+CgogICAgICAgICAgPHNlY3Rpb24KICAgICAgICAgICAgcm9sZT0iZGlhbG9nIgogICAgICAgICAgICBhcmlhLW1vZGFsPSJ0cnVlIgogICAgICAgICAgICBhcmlhLWxhYmVsPSJNb3JlIFNlcHVsY2hyaWEgbmF2aWdhdGlvbiIKICAgICAgICAgICAgZGF0YS1zZXAtaW50ZXJhY3Rpb24taWdub3JlPSJ0cnVlIgogICAgICAgICAgICBjbGFzc05hbWU9ImZpeGVkIGluc2V0LXgtMCBib3R0b20tMCB6LVs5NV0gbWF4LWgtWzc4ZHZoXSBvdmVyZmxvdy1oaWRkZW4gcm91bmRlZC10LVsxOHB4XSBib3JkZXItdCBib3JkZXItW3JnYih2YXIoLS1zZXAtY29sb3VyLTYwNDgyZSkpXS82NSBiZy1bcmdiKHZhcigtLXNlcC1jb2xvdXItMTAwZDBiKSldIHNoYWRvdy1bMF8tMjRweF81NXB4X3JnYmEodmFyKC0tc2VwLXJnYi0wLTAtMCksMC41OCldIGxnOmhpZGRlbiIKICAgICAgICAgID4KICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9Im14LWF1dG8gbXQtMiBoLTEgdy0xMCByb3VuZGVkLWZ1bGwgYmctW3JnYih2YXIoLS1zZXAtY29sb3VyLTVjNDcyZikpXSIgLz4KCiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWJldHdlZW4gYm9yZGVyLWIgYm9yZGVyLVtyZ2IodmFyKC0tc2VwLWNvbG91ci02MDQ4MmUpKV0vMzUgcHgtNCBweS0zIj4KICAgICAgICAgICAgICA8ZGl2PgogICAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPSJ0ZXh0LVs4cHhdIHVwcGVyY2FzZSB0cmFja2luZy1bMC4yMmVtXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci03NTY5NTcpKV0iPgogICAgICAgICAgICAgICAgICBTZXB1bGNocmlhCiAgICAgICAgICAgICAgICA8L3A+CiAgICAgICAgICAgICAgICA8aDIgY2xhc3NOYW1lPSJtdC0xIGZvbnQtc2VyaWYgdGV4dC1sZyB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1jOWIxODQpKV0iPgogICAgICAgICAgICAgICAgICBNb3JlCiAgICAgICAgICAgICAgICA8L2gyPgogICAgICAgICAgICAgIDwvZGl2PgoKICAgICAgICAgICAgICA8YnV0dG9uCiAgICAgICAgICAgICAgICB0eXBlPSJidXR0b24iCiAgICAgICAgICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRNb3JlT3BlbihmYWxzZSl9CiAgICAgICAgICAgICAgICBhcmlhLWxhYmVsPSJDbG9zZSIKICAgICAgICAgICAgICAgIGNsYXNzTmFtZT0iZmxleCBoLTkgdy05IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBib3JkZXIgYm9yZGVyLVtyZ2IodmFyKC0tc2VwLWNvbG91ci02MDQ4MmUpKV0vNDUgYmctW3JnYih2YXIoLS1zZXAtY29sb3VyLTE3MTIwZikpXSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1hOTliODkpKV0iCiAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgPFggY2xhc3NOYW1lPSJoLTQgdy00IiAvPgogICAgICAgICAgICAgIDwvYnV0dG9uPgogICAgICAgICAgICA8L2Rpdj4KCiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPSJncmlkIG1heC1oLVtjYWxjKDc4ZHZoLTc0cHgpXSBncmlkLWNvbHMtMiBnYXAtMiBvdmVyZmxvdy15LWF1dG8gcC00IHBiLVttYXgoMXJlbSxlbnYoc2FmZS1hcmVhLWluc2V0LWJvdHRvbSkpXSI+CiAgICAgICAgICAgICAge21vcmVFbnRyaWVzLm1hcCgoZW50cnkpID0+IHsKICAgICAgICAgICAgICAgIGNvbnN0IEljb24gPSBlbnRyeS5pY29uOwogICAgICAgICAgICAgICAgY29uc3QgYWN0aXZlID0gaXNBY3RpdmUocGF0aG5hbWUsIGVudHJ5LmhyZWYpOwoKICAgICAgICAgICAgICAgIHJldHVybiAoCiAgICAgICAgICAgICAgICAgIDxMaW5rCiAgICAgICAgICAgICAgICAgICAga2V5PXtlbnRyeS5ocmVmfQogICAgICAgICAgICAgICAgICAgIGhyZWY9e2VudHJ5LmhyZWZ9CiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPXtbCiAgICAgICAgICAgICAgICAgICAgICAiZmxleCBtaW4taC1bNThweF0gaXRlbXMtY2VudGVyIGdhcC0zIGJvcmRlciBweC0zIHB5LTIiLAogICAgICAgICAgICAgICAgICAgICAgYWN0aXZlCiAgICAgICAgICAgICAgICAgICAgICAgID8gImJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItODc2YTQ2KSldIGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0yMTE3MGYpKV0iCiAgICAgICAgICAgICAgICAgICAgICAgIDogImJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNjA0ODJlKSldLzM1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0xNTEwMGQpKV0iLAogICAgICAgICAgICAgICAgICAgIF0uam9pbigiICIpfQogICAgICAgICAgICAgICAgICA+CiAgICAgICAgICAgICAgICAgICAgPEljb24gY2xhc3NOYW1lPSJoLTUgdy01IHNocmluay0wIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWE4ODY1OCkpXSIgLz4KICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9InRleHQtWzExcHhdIHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWI4YTk4ZikpXSI+CiAgICAgICAgICAgICAgICAgICAgICB7ZW50cnkubGFiZWx9CiAgICAgICAgICAgICAgICAgICAgPC9zcGFuPgogICAgICAgICAgICAgICAgICA8L0xpbms+CiAgICAgICAgICAgICAgICApOwogICAgICAgICAgICAgIH0pfQoKICAgICAgICAgICAgICB7aXNTdGFmZiA/ICgKICAgICAgICAgICAgICAgIDxMaW5rCiAgICAgICAgICAgICAgICAgIGhyZWY9Ii9hZG1pbiIKICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPSJmbGV4IG1pbi1oLVs1OHB4XSBpdGVtcy1jZW50ZXIgZ2FwLTMgYm9yZGVyIGJvcmRlci1bcmdiKHZhcigtLXNlcC1jb2xvdXItNzY1OTM3KSldLzU1IGJnLVtyZ2IodmFyKC0tc2VwLWNvbG91ci0yMTE3MGYpKV0gcHgtMyBweS0yIgogICAgICAgICAgICAgICAgPgogICAgICAgICAgICAgICAgICA8U3BhcmtsZXMgY2xhc3NOYW1lPSJoLTUgdy01IHRleHQtW3JnYih2YXIoLS1zZXAtY29sb3VyLWE4ODY1OCkpXSIgLz4KICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPSJ0ZXh0LVsxMXB4XSB0ZXh0LVtyZ2IodmFyKC0tc2VwLWNvbG91ci1iOGE5OGYpKV0iPgogICAgICAgICAgICAgICAgICAgIEFkbWluaXN0cmF0aW9uCiAgICAgICAgICAgICAgICAgIDwvc3Bhbj4KICAgICAgICAgICAgICAgIDwvTGluaz4KICAgICAgICAgICAgICApIDogbnVsbH0KICAgICAgICAgICAgPC9kaXY+CiAgICAgICAgICA8L3NlY3Rpb24+CiAgICAgICAgPC8+CiAgICAgICkgOiBudWxsfQogICAgPC8+CiAgKTsKfQo=").decode("utf-8")

path = "app/(portal)/layout.tsx"
text = read(path)

text = replace_once(
    text,
    'import { PortalHeader } from "@/components/portal/portal-header";',
    'import { PortalHeader } from "@/components/portal/portal-header";\nimport { MobilePortalNavigation } from "@/components/portal/mobile-portal-navigation";',
    "Mobile nav import",
)

old_mount = """            <TidingsTicker
              initialTidings={
                initialTidings
              }
            />"""
new_mount = """            <TidingsTicker
              initialTidings={
                initialTidings
              }
            />

            <MobilePortalNavigation
              unreadMessageCount={
                context.unreadMessageCount
              }
              isStaff={
                context.isStaff
              }
            />"""
text = replace_once(text, old_mount, new_mount, "Mobile nav mount")

old_css = """              @media (min-width: 1024px) {
                .sepulchria-viewport-body {"""
new_css = """              @media (max-width: 1023px) {
                .sepulchria-viewport-body {
                  display: block;
                  width: 100%;
                  max-width: none;
                  overflow: hidden;
                  padding-bottom:
                    calc(64px + env(safe-area-inset-bottom));
                }

                .portal-left-shell {
                  display: none !important;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host] {
                  height: 100%;
                  min-height: 0;
                  overflow: hidden;
                }

                .sepulchria-viewport-body
                  > [data-portal-centre-host]
                  > [data-portal-column] {
                  height: 100%;
                  min-height: 0;
                  overflow-y: auto;
                  overscroll-behavior: contain;
                }

                [data-portal-shell] {
                  padding-top: env(safe-area-inset-top);
                }
              }

              @media (min-width: 1024px) {
                .sepulchria-viewport-body {"""
text = replace_once(text, old_css, new_css, "Mobile shell CSS")

Path(path).write_text(text, encoding="utf-8")
print("✓", path)

path = "components/portal/portal-responsive-right-sidebar.tsx"
text = read(path)
text = replace_once(
    text,
    'className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center border',
    'className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-11 w-11 items-center justify-center border',
    "Mobile context trigger position",
)
Path(path).write_text(text, encoding="utf-8")
print("✓", path)

new_path.parent.mkdir(parents=True, exist_ok=True)
new_path.write_text(mobile_nav, encoding="utf-8")
print("✓", new_path)

print("")
print("Mobile app shell Phase 1 installed.")
print("Desktop lg+ behaviour is preserved.")
print("No SQL and no npm install required.")
print("Run: npm run build")

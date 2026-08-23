#!/usr/bin/env python3
from pathlib import Path
import argparse
import subprocess

BASELINE = "a00066536f46e304087fd2b0e46786e3a1f7edfc"

def once(s, a, b, label):
    n = s.count(a)
    if n != 1:
        raise SystemExit(
            f"ERROR: {label}: expected anchor once, found {n}. Nothing written."
        )
    return s.replace(a, b, 1)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    root = Path.cwd()
    if not (root / "package.json").exists():
        raise SystemExit("ERROR: run from sepulchria-portal root.")

    head = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        text=True,
    ).strip()

    if head != BASELINE:
        raise SystemExit(
            f"ERROR: HEAD is {head}; expected {BASELINE}."
        )

    p = root / "app/(portal)/messages/components/MessageComposer.tsx"
    s = p.read_text(encoding="utf-8")

    s = once(
        s,
        '''  const submittedNonceRef =
    useRef<string | null>(null);

  useEffect(() => {''',
        '''  const submittedNonceRef =
    useRef<string | null>(null);

  const submittedBodyRef =
    useRef<string>("");

  useEffect(() => {''',
        "submitted body ref",
    )

    s = once(
        s,
        '''    submittedNonceRef.current = null;

    if (state.ok && state.submittedAt) {
      setBody("");
      setNonce(crypto.randomUUID());''',
        '''    submittedNonceRef.current = null;

    if (!state.ok) {
      const submittedBody =
        submittedBodyRef.current;

      if (submittedBody) {
        setBody((current) =>
          current ? current : submittedBody,
        );
      }

      submittedBodyRef.current = "";
      return;
    }

    submittedBodyRef.current = "";

    if (state.submittedAt) {
      setNonce(crypto.randomUUID());''',
        "restore failed optimistic send",
    )

    s = once(
        s,
        '''      onSubmit={() => {
        submittedNonceRef.current = nonce;

        window.dispatchEvent(
          new CustomEvent(
            PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
            {
              detail: {
                conversationId,
                nonce,
                body,
                messageMode,
              },
            },
          ),
        );
      }}''',
        '''      onSubmit={() => {
        submittedNonceRef.current = nonce;
        submittedBodyRef.current = body;

        window.dispatchEvent(
          new CustomEvent(
            PRIVATE_MESSAGE_OPTIMISTIC_EVENT,
            {
              detail: {
                conversationId,
                nonce,
                body,
                messageMode,
              },
            },
          ),
        );

        setBody("");

        requestAnimationFrame(() => {
          formRef.current
            ?.querySelector<HTMLTextAreaElement>(
              "textarea",
            )
            ?.focus();
        });
      }}''',
        "clear composer on optimistic send",
    )

    print("Baseline:", head[:7])
    print("Prepared 1 local file change:")
    print(" ", str(p.relative_to(root)).replace("/", "\\"))

    if args.dry_run:
        print("\nDRY RUN ONLY — no files written.")
        return

    p.write_text(
        s,
        encoding="utf-8",
        newline="\n",
    )

    print("\nApplied LOCALLY only.")
    print("No SQL changes required.")
    print("Next: npm run build")

if __name__ == "__main__":
    main()

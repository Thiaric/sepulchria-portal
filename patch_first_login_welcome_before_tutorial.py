from pathlib import Path

ROOT = Path.cwd()

targets = {
    "signup": ROOT / "components/sign-up-form.tsx",
    "api": ROOT / "app/api/onboarding/welcome/route.ts",
    "modal": ROOT / "components/onboarding/mandatory-welcome-modal.tsx",
    "tour": ROOT / "components/tutorial/portal-first-visit-tour.tsx",
}

for name, path in targets.items():
    if not path.exists():
        raise SystemExit(
            f"ERROR: Missing {path}\n"
            "Run this patch from the sepulchria-portal project root.\n"
            "No changes were made."
        )

original = {k: p.read_text(encoding="utf-8") for k, p in targets.items()}
patched = dict(original)

def replace_once(key: str, old: str, new: str, description: str) -> None:
    count = patched[key].count(old)
    if count != 1:
        raise SystemExit(
            f"ERROR: {description}: expected exactly 1 match, found {count}.\n"
            "This patch is intended for the code around commit c1ebc83.\n"
            "No changes were made."
        )
    patched[key] = patched[key].replace(old, new, 1)

# 1) New signups are explicitly marked as requiring the welcome.
replace_once(
    "signup",
    '''          privacy_version:
            PRIVACY_VERSION,
        },
''',
    '''          privacy_version:
            PRIVACY_VERSION,
          welcome_required:
            true,
        },
''',
    "signup metadata block",
)

# 2) Existing accounts are grandfathered by the welcome API.
replace_once(
    "api",
    '''  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_onboarding_acknowledgements")
    .select("welcome_acknowledged_at")
    .eq("user_id", user.id)
    .maybeSingle();
''',
    '''  /*
   * Only accounts created after the welcome rollout carry
   * welcome_required=true. Existing accounts are grandfathered.
   */
  if (user.user_metadata?.welcome_required !== true) {
    return NextResponse.json(
      {
        ok: true,
        acknowledged: true,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_onboarding_acknowledgements")
    .select("welcome_acknowledged_at")
    .eq("user_id", user.id)
    .maybeSingle();
''',
    "welcome GET acknowledgement block",
)

# 3) Notify the tutorial system after successful acknowledgement.
replace_once(
    "modal",
    '''      setVisible(false);

      if (pathname !== "/character/create") {
''',
    '''      setVisible(false);

      /*
       * The mandatory welcome is the first onboarding gate.
       * Tutorial initialisation is allowed only after this fires.
       */
      window.dispatchEvent(
        new CustomEvent(
          "sepulchria:welcome-acknowledged",
        ),
      );

      if (pathname !== "/character/create") {
''',
    "welcome acknowledgement success block",
)

# 4a) Tutorial gets a version trigger for welcome completion.
replace_once(
    "tour",
    '''  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const startingRef = useRef(false);
''',
    '''  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [welcomeVersion, setWelcomeVersion] = useState(0);
  const startingRef = useRef(false);
''',
    "tutorial state block",
)

# 4b) Listen for successful welcome acknowledgement.
replace_once(
    "tour",
    '''  useEffect(() => {
    let cancelled = false;

    setReady(false);
''',
    '''  useEffect(() => {
    function handleWelcomeAcknowledged() {
      setWelcomeVersion(
        (current) => current + 1,
      );
    }

    window.addEventListener(
      "sepulchria:welcome-acknowledged",
      handleWelcomeAcknowledged,
    );

    return () => {
      window.removeEventListener(
        "sepulchria:welcome-acknowledged",
        handleWelcomeAcknowledged,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    setReady(false);
''',
    "tutorial loading effect start",
)

# 4c) Hard-gate tutorial progress loading behind the welcome API.
replace_once(
    "tour",
    '''      if (cancelled || !user) {
        if (!cancelled) {
          setUserId(null);
          setReady(true);
        }
        return;
      }

      const result = await supabase
''',
    '''      if (cancelled || !user) {
        if (!cancelled) {
          setUserId(null);
          setReady(true);
        }
        return;
      }

      /*
       * Mandatory welcome ALWAYS comes before the tutorial.
       * Do not load or start tutorial progress until the welcome API
       * confirms that this account is either grandfathered or has
       * completed the acknowledgement.
       */
      try {
        const welcomeResponse =
          await fetch(
            "/api/onboarding/welcome",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        const welcomeStatus =
          await welcomeResponse
            .json()
            .catch(() => null) as
              | {
                  ok?: boolean;
                  acknowledged?: boolean;
                }
              | null;

        if (cancelled) {
          return;
        }

        if (
          !welcomeResponse.ok ||
          !welcomeStatus?.ok ||
          welcomeStatus.acknowledged !== true
        ) {
          setUserId(user.id);
          setReady(false);
          return;
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Unable to verify mandatory welcome before tutorial:",
            error,
          );
          setUserId(user.id);
          setReady(false);
        }

        return;
      }

      const result = await supabase
''',
    "tutorial authenticated-user block",
)

# 4d) Re-run tutorial gate immediately when welcome completes.
replace_once(
    "tour",
    '''  }, [pathname, supabase]);
''',
    '''  }, [pathname, supabase, welcomeVersion]);
''',
    "tutorial loading dependencies",
)

# Write only after every replacement validated successfully.
for key, path in targets.items():
    if patched[key] == original[key]:
        raise SystemExit(
            f"ERROR: No change produced for {path}.\nNo changes were made."
        )

for key, path in targets.items():
    path.write_text(patched[key], encoding="utf-8")

print("PATCH APPLIED SUCCESSFULLY")
print()
print("Updated files:")
for path in targets.values():
    print(f"- {path}")
print()
print("Behaviour:")
print("- Existing accounts are grandfathered.")
print("- New signups are marked welcome_required=true.")
print("- First portal login shows the mandatory welcome.")
print("- User must scroll to the bottom and tick the acknowledgement.")
print("- Continue saves acknowledgement and sends them to /character/create.")
print("- Tutorial cannot start before or underneath the welcome.")
print("- Tutorial becomes eligible only after welcome completion.")

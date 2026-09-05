"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  getStoragePreferences,
  OPEN_STORAGE_SETTINGS_EVENT,
  openStorageSettings,
  saveStoragePreferences,
} from "@/lib/privacy/storage-preferences";

export function CookieStorageControls() {
  const [ready, setReady] =
    useState(false);

  const [bannerOpen, setBannerOpen] =
    useState(false);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [
    functionalEnabled,
    setFunctionalEnabled,
  ] = useState(true);

  useEffect(() => {
    const current =
      getStoragePreferences();

    setFunctionalEnabled(
      current.functional,
    );

    setBannerOpen(
      !current.decided,
    );

    setReady(true);

    function handleOpenSettings() {
      const latest =
        getStoragePreferences();

      setFunctionalEnabled(
        latest.functional,
      );

      setSettingsOpen(true);
    }

    window.addEventListener(
      OPEN_STORAGE_SETTINGS_EVENT,
      handleOpenSettings,
    );

    return () => {
      window.removeEventListener(
        OPEN_STORAGE_SETTINGS_EVENT,
        handleOpenSettings,
      );
    };
  }, []);

  function chooseNecessaryOnly() {
    saveStoragePreferences(false);
    setFunctionalEnabled(false);
    setBannerOpen(false);
    setSettingsOpen(false);
  }

  function choosePreferences() {
    saveStoragePreferences(true);
    setFunctionalEnabled(true);
    setBannerOpen(false);
    setSettingsOpen(false);
  }

  function saveSettings() {
    saveStoragePreferences(
      functionalEnabled,
    );
    setBannerOpen(false);
    setSettingsOpen(false);
  }

  if (!ready) {
    return null;
  }

  return (
    <>
      {bannerOpen ? (
        <section
          aria-label="Cookie and storage notice"
          className="fixed inset-x-3 bottom-3 z-[10000] mx-auto max-w-[760px] border border-[rgb(var(--sep-colour-6b5032))]/55 bg-[rgb(var(--sep-colour-100c09))]/[0.98] p-4 text-[rgb(var(--sep-colour-d8cbb5))] shadow-[0_18px_70px_rgba(0,0,0,0.78)] backdrop-blur-md sm:bottom-5 sm:p-5"
        >
          <div className="pointer-events-none absolute inset-1 border border-[rgb(var(--sep-colour-9a7547))]/10" />

          <div className="relative">
            <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-94744e))]">
              Privacy &amp; browser storage
            </p>

            <h2 className="mt-1 font-serif text-xl text-[rgb(var(--sep-colour-e4cda3))]">
              Sepulchria uses necessary storage and interface preferences.
            </h2>

            <p className="mt-2 text-[11px] leading-5 text-[rgb(var(--sep-colour-a39784))] sm:text-xs">
              Necessary storage keeps accounts secure and signed in. Interface storage remembers choices such as your portal skin, sidebar layout, sound preference and editor preferences. Sepulchria currently does not use advertising or behavioural tracking cookies.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={
                  chooseNecessaryOnly
                }
                className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8b28e))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-efd7aa))]"
              >
                Necessary only
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettingsOpen(true)
                }
                className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8b28e))] transition hover:border-[rgb(var(--sep-colour-a17a49))] hover:text-[rgb(var(--sep-colour-efd7aa))]"
              >
                Storage settings
              </button>

              <button
                type="button"
                onClick={
                  choosePreferences
                }
                className="border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ead3a6))] transition hover:border-[rgb(var(--sep-colour-d4a460))] hover:bg-[rgb(var(--sep-colour-472c17))]"
              >
                Keep preferences
              </button>

              <Link
                href="/cookies"
                className="ml-auto text-[8px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-8f806d))] underline decoration-[rgb(var(--sep-colour-60482e))] underline-offset-4 hover:text-[rgb(var(--sep-colour-cdb487))]"
              >
                Cookie Notice
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="storage-settings-title"
        >
          <button
            type="button"
            aria-label="Close storage settings"
            onClick={() =>
              setSettingsOpen(false)
            }
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          />

          <section className="relative z-10 max-h-[90dvh] w-full max-w-[620px] overflow-y-auto border border-[rgb(var(--sep-colour-6b5032))]/55 bg-[rgb(var(--sep-colour-100c09))] p-5 text-[rgb(var(--sep-colour-d8cbb5))] shadow-[0_25px_90px_rgba(0,0,0,0.9)] sm:p-7">
            <div className="pointer-events-none absolute inset-1 border border-[rgb(var(--sep-colour-9a7547))]/10" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[8px] uppercase tracking-[0.28em] text-[rgb(var(--sep-colour-94744e))]">
                    Privacy controls
                  </p>

                  <h2
                    id="storage-settings-title"
                    className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-e4cda3))]"
                  >
                    Cookie &amp; Storage Settings
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setSettingsOpen(false)
                  }
                  className="flex h-7 w-7 shrink-0 items-center justify-center border border-[rgb(var(--sep-colour-60482e))]/55 text-sm text-[rgb(var(--sep-colour-a98c67))]"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <SettingRow
                  title="Strictly necessary"
                  description="Authentication, session security, inactivity handling and privacy-choice storage required to operate the service."
                  checked
                  disabled
                />

                <SettingRow
                  title="Interface & preference storage"
                  description="Remembers portal skin, collapsed sidebars, sound preference, recent editor colours and spelling-dictionary choices."
                  checked={
                    functionalEnabled
                  }
                  onChange={
                    setFunctionalEnabled
                  }
                />

                <UnavailableRow
                  title="Analytics"
                  description="No dedicated analytics package is currently installed."
                />

                <UnavailableRow
                  title="Advertising & behavioural tracking"
                  description="Not used by the current Sepulchria application."
                />
              </div>

              <p className="mt-4 text-[10px] leading-5 text-[rgb(var(--sep-colour-8d816f))]">
                You can change this choice at any time using “Cookie Settings” in the homepage footer. Disabling interface storage removes the stored preference values from this browser.
              </p>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={
                    chooseNecessaryOnly
                  }
                  className="border border-[rgb(var(--sep-colour-765937))]/65 bg-[rgb(var(--sep-colour-15100d))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-c8b28e))]"
                >
                  Necessary only
                </button>

                <button
                  type="button"
                  onClick={
                    saveSettings
                  }
                  className="border border-[rgb(var(--sep-colour-a77a42))]/80 bg-[rgb(var(--sep-colour-382313))] px-4 py-2 text-[8px] uppercase tracking-[0.14em] text-[rgb(var(--sep-colour-ead3a6))]"
                >
                  Save settings
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function SettingRow({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/40 bg-[rgb(var(--sep-colour-15100d))] p-3">
      <span>
        <span className="block font-serif text-sm text-[rgb(var(--sep-colour-d6bd91))]">
          {title}
        </span>
        <span className="mt-1 block text-[9px] leading-4 text-[rgb(var(--sep-colour-827564))]">
          {description}
        </span>
      </span>

      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange?.(
            event.target.checked,
          )
        }
        className="mt-1 h-4 w-4 shrink-0 accent-[rgb(var(--sep-colour-a77a42))]"
      />
    </label>
  );
}

function UnavailableRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border border-[rgb(var(--sep-colour-60482e))]/30 bg-[rgb(var(--sep-colour-100c09))] p-3 opacity-70">
      <span>
        <span className="block font-serif text-sm text-[rgb(var(--sep-colour-b9a584))]">
          {title}
        </span>
        <span className="mt-1 block text-[9px] leading-4 text-[rgb(var(--sep-colour-74695b))]">
          {description}
        </span>
      </span>

      <span className="shrink-0 text-[7px] uppercase tracking-[0.12em] text-[rgb(var(--sep-colour-74695b))]">
        Not in use
      </span>
    </div>
  );
}

export function CookieSettingsButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={openStorageSettings}
      className={className}
    >
      Cookie Settings
    </button>
  );
}

export type StoragePreferenceState = {
  functional: boolean;
  decided: boolean;
};

export const STORAGE_PREFERENCES_KEY =
  "sepulchria:storage-preferences:v1";

export const STORAGE_PREFERENCES_EVENT =
  "sepulchria:storage-preferences-changed";

export const OPEN_STORAGE_SETTINGS_EVENT =
  "sepulchria:open-storage-settings";

export const OPTIONAL_PREFERENCE_KEYS = [
  "sepulchria:portal-skin",
  "sepulchria-left-sidebar-collapsed",
  "sepulchria-right-sidebar-collapsed",
  "sepulchria-portal-sound-muted",
  "sepulchria-recent-text-colours",
  "sepulchria-recent-highlight-colours",
  "sepulchria-spelling-user-dictionary",
] as const;

function parsePreferenceState(
  raw: string | null,
): StoragePreferenceState {
  if (!raw) {
    return {
      functional: true,
      decided: false,
    };
  }

  try {
    const parsed = JSON.parse(raw);

    return {
      functional:
        parsed?.functional !== false,
      decided: true,
    };
  } catch {
    return {
      functional: true,
      decided: false,
    };
  }
}

export function getStoragePreferences(): StoragePreferenceState {
  if (typeof window === "undefined") {
    return {
      functional: true,
      decided: false,
    };
  }

  try {
    return parsePreferenceState(
      window.localStorage.getItem(
        STORAGE_PREFERENCES_KEY,
      ),
    );
  } catch {
    return {
      functional: true,
      decided: false,
    };
  }
}

export function canUsePreferenceStorage(): boolean {
  return getStoragePreferences().functional;
}

export function saveStoragePreferences(
  functional: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_PREFERENCES_KEY,
      JSON.stringify({
        functional,
        decidedAt:
          new Date().toISOString(),
      }),
    );

    if (!functional) {
      for (const key of OPTIONAL_PREFERENCE_KEYS) {
        window.localStorage.removeItem(
          key,
        );
      }
    }
  } catch {
    // Browser storage may be disabled.
  }

  window.dispatchEvent(
    new CustomEvent(
      STORAGE_PREFERENCES_EVENT,
      {
        detail: {
          functional,
        },
      },
    ),
  );
}

export function readPreferenceStorage(
  key: string,
): string | null {
  if (
    typeof window === "undefined" ||
    !canUsePreferenceStorage()
  ) {
    return null;
  }

  try {
    return window.localStorage.getItem(
      key,
    );
  } catch {
    return null;
  }
}

export function writePreferenceStorage(
  key: string,
  value: string,
) {
  if (
    typeof window === "undefined" ||
    !canUsePreferenceStorage()
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      key,
      value,
    );
  } catch {
    // Browser storage may be disabled.
  }
}

export function openStorageSettings() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new Event(
      OPEN_STORAGE_SETTINGS_EVENT,
    ),
  );
}

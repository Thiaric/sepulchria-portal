"use client";

import {
  readPreferenceStorage,
  writePreferenceStorage,
} from "@/lib/privacy/storage-preferences";

import {
  type ReactNode,
  useEffect,
  useState,
} from "react";

type PortalCollapsibleColumnsProps = {
  left: ReactNode;
  centre: ReactNode;
  right: ReactNode;
};

const LEFT_KEY = "sepulchria-left-sidebar-collapsed";
const RIGHT_KEY = "sepulchria-right-sidebar-collapsed";

export function PortalCollapsibleColumns({
  left,
  centre,
  right,
}: PortalCollapsibleColumnsProps) {
  const [leftCollapsed, setLeftCollapsed] =
    useState(false);
  const [rightCollapsed, setRightCollapsed] =
    useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLeftCollapsed(
      readPreferenceStorage(LEFT_KEY) === "1",
    );
    setRightCollapsed(
      readPreferenceStorage(RIGHT_KEY) === "1",
    );
    setReady(true);
  }, []);

  function toggleLeft() {
    setLeftCollapsed((current) => {
      const next = !current;
      writePreferenceStorage(
        LEFT_KEY,
        next ? "1" : "0",
      );
      return next;
    });
  }

  function toggleRight() {
    setRightCollapsed((current) => {
      const next = !current;
      writePreferenceStorage(
        RIGHT_KEY,
        next ? "1" : "0",
      );
      return next;
    });
  }

  return (
    <div
      className="sepulchria-viewport-body mx-auto grid min-h-0 w-full flex-1 grid-cols-1 overflow-y-auto lg:overflow-hidden"
      data-left-collapsed={
        ready && leftCollapsed ? "true" : "false"
      }
      data-right-collapsed={
        ready && rightCollapsed ? "true" : "false"
      }
    >
      <div className="portal-left-shell relative min-h-0 min-w-0">
        {left}

        <button
          type="button"
          data-sep-interaction-ignore="true"
          onClick={toggleLeft}
          aria-label={
            leftCollapsed
              ? "Show left sidebar"
              : "Hide left sidebar"
          }
          title={
            leftCollapsed
              ? "Show left sidebar"
              : "Hide left sidebar"
          }
          className="portal-left-collapse-toggle"
        >
          {leftCollapsed ? "›" : "‹"}
        </button>
      </div>

      <div
        data-portal-centre-host
        className="min-h-0 min-w-0"
      >
        {centre}
      </div>

      <div className="portal-right-shell relative min-h-0 min-w-0">
        {right}

        <button
          type="button"
          data-sep-interaction-ignore="true"
          onClick={toggleRight}
          aria-label={
            rightCollapsed
              ? "Show right sidebar"
              : "Hide right sidebar"
          }
          title={
            rightCollapsed
              ? "Show right sidebar"
              : "Hide right sidebar"
          }
          className="portal-right-collapse-toggle"
        >
          {rightCollapsed ? "‹" : "›"}
        </button>
      </div>
    </div>
  );
}

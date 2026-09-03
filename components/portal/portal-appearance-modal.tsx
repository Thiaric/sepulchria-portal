"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  createPortal,
} from "react-dom";

import {
  PortalSkinGallery,
  type AppearanceSkin,
} from "@/components/portal/portal-skin-gallery";
import {
  usePortalSkin,
} from "@/components/portal/portal-skin-provider";
import {
  createClient,
} from "@/lib/supabase/client";

export function PortalAppearanceModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { endPreview } =
    usePortalSkin();

  const [mounted, setMounted] =
    useState(false);
  const [skins, setSkins] =
    useState<AppearanceSkin[]>([]);
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const modalRef =
    useRef<HTMLElement | null>(null);

  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [dragOffset, setDragOffset] =
    useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDragOffset({
      x: 0,
      y: 0,
    });
    dragStateRef.current = null;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function onKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        endPreview();
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      onKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previous;
      window.removeEventListener(
        "keydown",
        onKeyDown,
      );
    };
  }, [
    open,
    onClose,
    endPreview,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        if (!cancelled) {
          setError(
            "You must be signed in.",
          );
          setLoading(false);
        }
        return;
      }

      const [
        skinsResult,
        entitlementsResult,
      ] = await Promise.all([
        supabase
          .from("portal_skins")
          .select(`
            id,
            slug,
            name,
            description,
            preview_image_url,
            price_pence,
            is_default,
            sort_order
          `)
          .eq("is_active", true)
          .order(
            "sort_order",
            { ascending: true },
          )
          .order(
            "name",
            { ascending: true },
          ),

        supabase
          .from(
            "user_portal_skin_entitlements",
          )
          .select(
            "skin_id, enabled, source",
          )
          .eq(
            "user_id",
            user.id,
          )
          .eq("enabled", true),
      ]);

      if (cancelled) {
        return;
      }

      const firstError =
        skinsResult.error ??
        entitlementsResult.error;

      if (firstError) {
        setError(
          firstError.message,
        );
        setLoading(false);
        return;
      }

      const entitlements =
        new Map(
          (
            entitlementsResult.data ??
            []
          ).map((entry) => [
            String(entry.skin_id),
            entry.source as
              | "paid"
              | "staff",
          ]),
        );

      setSkins(
        (skinsResult.data ?? []).map(
          (entry) => ({
            id:
              String(entry.id),
            slug:
              String(entry.slug),
            name:
              String(entry.name),
            description:
              entry.description ??
              "",
            previewImageUrl:
              entry.preview_image_url ??
              null,
            pricePence:
              entry.price_pence ??
              null,
            isDefault:
              entry.is_default ===
              true,
            owned:
              entry.is_default ===
                true ||
              entitlements.has(
                String(entry.id),
              ),
            source:
              entitlements.get(
                String(entry.id),
              ) ?? null,
          }),
        ),
      );

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function clampDragOffset(
    nextX: number,
    nextY: number,
  ) {
    const modal =
      modalRef.current;

    if (!modal) {
      return {
        x: nextX,
        y: nextY,
      };
    }

    const rect =
      modal.getBoundingClientRect();

    const visibleHorizontal = 72;
    const titleBarHeight = 64;

    const minX =
      -rect.left -
      rect.width +
      visibleHorizontal;
    const maxX =
      window.innerWidth -
      rect.left -
      visibleHorizontal;

    const minY =
      -rect.top;
    const maxY =
      window.innerHeight -
      rect.top -
      titleBarHeight;

    return {
      x: Math.min(
        maxX,
        Math.max(minX, nextX),
      ),
      y: Math.min(
        maxY,
        Math.max(minY, nextY),
      ),
    };
  }

  function beginDrag(
    event: React.PointerEvent<HTMLElement>,
  ) {
    if (
      event.button !== 0 ||
      (
        event.target as HTMLElement
      ).closest(
        "button, a, input, select, textarea",
      )
    ) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dragOffset.x,
      originY: dragOffset.y,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function moveDrag(
    event: React.PointerEvent<HTMLElement>,
  ) {
    const drag =
      dragStateRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const next =
      clampDragOffset(
        drag.originX +
          event.clientX -
          drag.startX,
        drag.originY +
          event.clientY -
          drag.startY,
      );

    setDragOffset(next);
  }

  function endDrag(
    event: React.PointerEvent<HTMLElement>,
  ) {
    const drag =
      dragStateRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    dragStateRef.current = null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }
  }

  if (!mounted || !open) {
    return null;
  }

  function close() {
    endPreview();
    onClose();
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/10 p-3 sm:p-6"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          close();
        }
      }}
    >
      <section
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-appearance-title"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden border border-[rgb(var(--sep-colour-60482e))]/65 bg-[rgb(var(--sep-colour-0d0a08))] shadow-2xl"
        style={{
          transform:
            `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,
        }}
      >
        <header
          className="flex shrink-0 cursor-move touch-none select-none items-start justify-between gap-4 border-b border-[rgb(var(--sep-colour-60482e))]/45 bg-[rgb(var(--sep-colour-100c09))] px-5 py-4 sm:px-6"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          title="Drag to move Portal Appearance"
        >
          <div>
            
            <h2
              id="portal-appearance-title"
              className="mt-1 font-serif text-2xl text-[rgb(var(--sep-colour-ead5ac))]"
            >
              Portal Appearance
            </h2>

            <p className="mt-1 max-w-3xl text-[10px] leading-5 text-[rgb(var(--sep-colour-928674))]">
              Preview your available skins or select an unlocked appearance.
            </p>
          </div>

          <button
            type="button"
            onClick={close}
            aria-label="Close Appearance"
            className="border border-[rgb(var(--sep-colour-60482e))]/55 bg-[rgb(var(--sep-colour-15100d))] px-3 py-2 text-sm text-[rgb(var(--sep-colour-baa78c))] transition hover:border-[rgb(var(--sep-colour-987344))]"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <p className="py-12 text-center text-[10px] uppercase tracking-[0.18em] text-[rgb(var(--sep-colour-8f8271))]">
              Loading appearances...
            </p>
          ) : error ? (
            <div className="border border-red-900/55 bg-red-950/20 p-4 text-sm text-red-300">
              Unable to load Portal Appearance: {error}
            </div>
          ) : (
            <PortalSkinGallery
              skins={skins}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

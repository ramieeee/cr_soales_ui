"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { LoadingSignal } from "@/components/loading-signal";

const MIN_VISIBLE_MS = 380;
const FALLBACK_HIDE_MS = 1600;

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef(0);
  const fallbackTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearFallback = () => {
      if (fallbackTimerRef.current !== null) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const show = () => {
      clearFallback();
      startedAtRef.current = Date.now();
      setVisible(true);
      fallbackTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        fallbackTimerRef.current = null;
      }, FALLBACK_HIDE_MS);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin) return;
      if (
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search
      ) {
        return;
      }

      show();
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearFallback();
    };
  }, []);

  useEffect(() => {
    if (!visible) return;

    const elapsed = Date.now() - startedAtRef.current;
    const delay = Math.max(MIN_VISIBLE_MS - elapsed, 0);
    const timer = window.setTimeout(() => {
      setVisible(false);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [pathname, visible]);

  if (!visible) return null;

  return (
    <LoadingSignal
      label="Loading View"
      detail="Synchronizing visualization surface..."
    />
  );
}

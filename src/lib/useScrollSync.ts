import { useEffect, type RefObject } from "react";

/** How long a programmatic scroll suppresses echo events from its target. */
const ECHO_MS = 80;

const EDITOR_SCROLLER = ".cm-scroller";
const PREVIEW_SCROLLER = ".preview-pane";

/**
 * Keep the editor and preview scrolled to the same relative position.
 * Maps scroll % (not line positions) — cheap, and close enough for prose.
 *
 * Listens in the capture phase on the shared root, so it survives the panes
 * remounting (tab switch) and CodeMirror creating its scroller after mount.
 */
export function useScrollSync(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!enabled || !root) return;

    // The pane we last scrolled programmatically; its scroll events are echoes.
    let echoTarget: HTMLElement | null = null;
    let echoTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;

    const onScroll = (e: Event) => {
      const from = e.target as HTMLElement;
      if (!(from instanceof HTMLElement) || from === echoTarget) return;
      const otherSelector = from.matches(EDITOR_SCROLLER)
        ? PREVIEW_SCROLLER
        : from.matches(PREVIEW_SCROLLER)
          ? EDITOR_SCROLLER
          : null;
      if (!otherSelector) return;

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const to = root.querySelector<HTMLElement>(otherSelector);
        if (!to) return;
        const fromMax = from.scrollHeight - from.clientHeight;
        const pct = fromMax > 0 ? from.scrollTop / fromMax : 0;
        echoTarget = to;
        to.scrollTop = pct * (to.scrollHeight - to.clientHeight);
        clearTimeout(echoTimer);
        echoTimer = setTimeout(() => (echoTarget = null), ECHO_MS);
      });
    };

    root.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll, { capture: true });
      cancelAnimationFrame(frame);
      clearTimeout(echoTimer);
    };
  }, [rootRef, enabled]);
}

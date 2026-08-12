import { useEffect, type RefObject } from 'react';

// Reusable modal focus management (a11y). Point `ref` at the dialog panel and pass its
// `onClose`. On mount it moves keyboard focus into the dialog; while open it keeps Tab /
// Shift+Tab cycling inside the panel and closes on Escape; on unmount it restores focus to
// whatever was focused before the dialog opened (usually the trigger). Pointer users are
// unaffected. Shared by the admin Drawer and the program booking drawer.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Visible, focusable elements inside the panel (skip display:none via offsetParent).
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((el) => el.offsetParent !== null);

    // Move focus into the dialog (first control, else the panel itself).
    (items()[0] ?? node).focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const list = items();
      if (list.length === 0) { e.preventDefault(); node.focus(); return; }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (!node.contains(active)) { e.preventDefault(); first.focus(); return; }
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [ref, onClose]);
}

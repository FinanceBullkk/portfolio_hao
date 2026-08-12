import { useEffect, useRef, useState, type ReactNode } from 'react';
import { DotsIcon } from './admin-icons';
import { useFocusTrap } from '../lib/use-focus-trap';

// ── Row menu ────────────────────────────────────────────────────────────────

export type MenuItem = { label: string; onClick: () => void; danger?: boolean } | 'div';

// Shared fixed-position popover menu used by RowMenu (⋯ trigger) and MoreMenu
// (text trigger). Fixed coords let the menu escape a panel's `overflow: hidden`
// (otherwise the last rows of a long table clip the dropdown shut).
function PopMenu({
  items, renderTrigger, menuClass = 'rowmenu',
}: {
  items: MenuItem[];
  renderTrigger: (p: { ref: React.RefObject<HTMLButtonElement | null>; open: boolean; toggle: () => void }) => ReactNode;
  menuClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = btnRef.current!.getBoundingClientRect();
    const estH = items.length * 38 + 16;
    const up = window.innerHeight - r.bottom < estH && r.top > estH;
    setPos({ top: up ? r.top - 4 : r.bottom + 4, right: window.innerWidth - r.right, up });
    setOpen(true);
  };

  return (
    <div className="rowmenu-wrap">
      {renderTrigger({ ref: btnRef, open, toggle })}
      {open && pos && (
        <div
          ref={menuRef}
          className={menuClass}
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, transform: pos.up ? 'translateY(-100%)' : undefined }}
        >
          {items.map((it, i) =>
            it === 'div' ? (
              <div key={i} className="div" />
            ) : (
              <button key={i} type="button" role="menuitem" className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>
                {it.label}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function RowMenu({ items }: { items: MenuItem[] }) {
  return (
    <PopMenu
      items={items}
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="icon-act" aria-label="Actions" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          <DotsIcon />
        </button>
      )}
    />
  );
}

/** Text-triggered overflow menu (e.g. "More ▾") for secondary toolbar actions. */
export function MoreMenu({ label, items }: { label: string; items: MenuItem[] }) {
  return (
    <PopMenu
      items={items}
      menuClass="rowmenu more-menu"
      renderTrigger={({ ref, open, toggle }) => (
        <button ref={ref} type="button" className="btn sm ghost" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          {label} <span aria-hidden="true">▾</span>
        </button>
      )}
    />
  );
}

// ── Generic drawer chrome ─────────────────────────────────────────────────────

export function Drawer({
  title, sub, chip, cta, busy, dirty, closeLabel = 'Close', onClose, onSave, children,
}: {
  title: string; sub?: string; chip?: ReactNode; cta: string; busy?: boolean; dirty?: boolean;
  closeLabel?: string; onClose: () => void; onSave: () => void; children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, onClose);
  return (
    <div className="drawer-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" ref={panelRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <div className="drawer-hd">
          <div className="drawer-hd-main">
            <div className="dt">{title}</div>
            {(sub || chip) && <div className="ds-row">{sub && <span className="ds">{sub}</span>}{chip}</div>}
          </div>
          <button type="button" className="drawer-x" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <div className="drawer-bd">{children}</div>
        <div className="drawer-ft">
          {dirty && <span className="drawer-dirty"><span className="d" /> Unsaved changes</span>}
          <div className="drawer-ft-sp" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>{closeLabel}</button>
          <button type="button" className="btn" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : cta}</button>
        </div>
      </div>
    </div>
  );
}

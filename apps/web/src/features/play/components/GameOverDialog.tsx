// End-of-game dialog (native <dialog class="modal">: focus trap + Esc for free).
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function GameOverDialog({ open, title, subtitle, tone, children, actions, onClose }: {
  open: boolean; title: string; subtitle?: string; tone?: 'win' | 'loss' | 'draw';
  children?: ReactNode; actions?: ReactNode; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { try { d.showModal(); } catch { d.setAttribute('open', ''); } }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal play-gameover" aria-labelledby="gameover-title" onClose={onClose} onCancel={onClose}>
      <div className="modal__header">
        <h2 id="gameover-title" className={`modal__title ${tone ? `result result-${tone}` : ''}`}>{title}</h2>
        <button type="button" className="btn btn-ghost btn-icon btn-sm modal__close" aria-label="Close" onClick={onClose}><X size={18} strokeWidth={1.75} /></button>
      </div>
      <div className="modal__body">
        {subtitle && <p className="muted" style={{ marginTop: 0 }}>{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="modal__footer">{actions}</div>}
    </dialog>
  );
}

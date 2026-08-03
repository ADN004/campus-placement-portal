import { X } from 'lucide-react';
import Modal from '../Modal';
import useDeviceType from '../../hooks/useDeviceType';

/**
 * The shell every small student prompt shares — the dashboard nudges, the CGPA
 * notice, the email change, the correction gate.
 *
 * Two genuinely different shapes, because that is how many these earn:
 *
 *   phone            a bottom sheet. It rises from the thumb rather than
 *                    floating in the middle, and its buttons are stacked and
 *                    full width above the home indicator.
 *   tablet/desktop   a centred dialog with side-by-side buttons; desktop gets
 *                    a wider panel and roomier padding.
 *
 * These are 200-word prompts. Inventing a third distinct layout for tablet
 * would be decoration, not design, so tablet and desktop share a shape and
 * differ only in width and padding.
 *
 * The shell owns no state. `primary` and `secondary` are
 * `{ label, onClick, disabled }`; pass `dismissible={false}` for a gate the
 * student must act on.
 */

// Every class here is a whole literal string. Tailwind scans the source as
// text, so a class assembled at runtime (`hover:${t.text}`) is never generated.
const TONES = {
  teal: {
    band: 'bg-spc-teal',
    text: 'text-spc-on-teal',
    dim: 'text-spc-on-teal-dim',
    chip: 'bg-spc-on-teal/15',
    close: 'text-spc-on-teal-dim hover:text-spc-on-teal hover:bg-spc-on-teal/15',
  },
  bad: {
    band: 'bg-spc-bad',
    text: 'text-white',
    dim: 'text-[#f7d6d6]',
    chip: 'bg-white/15',
    close: 'text-[#f7d6d6] hover:text-white hover:bg-white/15',
  },
};

export default function PromptShell({
  onClose,
  labelledBy,
  title,
  eyebrow,
  icon: Icon,
  tone = 'teal',
  dismissible = true,
  closeOnBackdrop = false,
  closeOnEscape = true,
  children,
  primary,
  secondary,
  footNote,
}) {
  const deviceType = useDeviceType();
  const isPhone = deviceType === 'mobile';
  const t = TONES[tone] || TONES.teal;

  const overlayClassName = isPhone
    ? 'fixed inset-0 z-50 bg-spc-ink/55 backdrop-blur-sm flex items-end'
    : 'fixed inset-0 z-50 bg-spc-ink/55 backdrop-blur-sm flex items-center justify-center p-6';

  const panelClassName = isPhone
    ? 'spc-dialog-h w-full bg-spc-surface rounded-t-spc-lg shadow-2xl flex flex-col overflow-hidden outline-none'
    : `spc-dialog-h w-full ${deviceType === 'desktop' ? 'max-w-lg' : 'max-w-md'} bg-spc-surface rounded-spc-lg shadow-2xl flex flex-col overflow-hidden outline-none`;

  const pad = isPhone ? 'px-5' : deviceType === 'desktop' ? 'px-7' : 'px-6';

  return (
    <Modal
      onClose={dismissible ? onClose : undefined}
      labelledBy={labelledBy}
      closeOnBackdrop={dismissible && closeOnBackdrop}
      closeOnEscape={dismissible && closeOnEscape}
      overlayClassName={overlayClassName}
      panelClassName={panelClassName}
    >
      <header className={`flex-shrink-0 ${t.band} ${pad} ${isPhone ? 'pt-2.5 pb-4' : 'py-5'}`}>
        {/* Grab handle — a phone sheet reads as a sheet with one. It sits
            inside the coloured band so there is no white sliver above it. */}
        {isPhone && (
          <div className="flex justify-center mb-3">
            <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/30" />
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <span className={`w-11 h-11 rounded-spc ${t.chip} flex items-center justify-center flex-shrink-0`}>
                <Icon size={21} className={t.text} />
              </span>
            )}
            <div className="min-w-0">
              <h2 id={labelledBy} className={`text-spc-h2 font-extrabold ${t.text} leading-tight`}>
                {title}
              </h2>
              {eyebrow && <p className={`text-spc-xs ${t.dim} mt-0.5`}>{eyebrow}</p>}
            </div>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={`w-9 h-9 -mr-1 -mt-1 rounded-spc-sm flex items-center justify-center flex-shrink-0 transition-colors ${t.close}`}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </header>

      <div className={`flex-1 overflow-y-auto overscroll-contain ${pad} ${isPhone ? 'py-5' : 'py-6'}`}>
        {children}
      </div>

      <footer
        className={`flex-shrink-0 bg-spc-surface border-t border-spc-line ${pad} pt-4`}
        style={{ paddingBottom: isPhone ? 'calc(1rem + env(safe-area-inset-bottom))' : '1rem' }}
      >
        <div className={isPhone ? 'flex flex-col gap-2.5' : 'flex gap-3'}>
          {primary && (
            <button
              type="button"
              onClick={primary.onClick}
              disabled={primary.disabled}
              className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
                bg-spc-teal text-spc-on-teal text-spc-sm font-bold transition-opacity
                hover:opacity-95 disabled:opacity-45 disabled:cursor-not-allowed
                ${isPhone ? 'w-full' : 'flex-1'} ${isPhone ? '' : 'order-2'}`}
            >
              {primary.label}
            </button>
          )}
          {secondary && (
            <button
              type="button"
              onClick={secondary.onClick}
              disabled={secondary.disabled}
              className={`inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-spc-sm
                bg-spc-surface text-spc-body text-spc-sm font-bold border border-spc-line-strong
                transition-colors hover:bg-spc-surface-2 disabled:opacity-45 disabled:cursor-not-allowed
                ${isPhone ? 'w-full' : 'flex-1'} ${isPhone ? '' : 'order-1'}`}
            >
              {secondary.label}
            </button>
          )}
        </div>
        {footNote && (
          <p className="text-spc-xs text-spc-muted text-center mt-3 leading-relaxed">{footNote}</p>
        )}
      </footer>
    </Modal>
  );
}

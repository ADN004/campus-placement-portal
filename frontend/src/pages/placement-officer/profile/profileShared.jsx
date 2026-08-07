import { User, Upload, Trash2 } from 'lucide-react';
import {
  Panel, PanelHeading, ActionButton, FieldLabel, FIELD_CLASS,
} from '../../../components/officer/OfficerUI';

/**
 * Pieces shared by the three Profile presenters.
 *
 * The page holds three different kinds of thing and used to render them all as
 * the same gradient tile: two fields the officer can change, a set of facts
 * only the Super Admin can change, and two images. Separating them is most of
 * the work here — an officer should be able to see at a glance which lines they
 * can act on.
 */

/* ------------------------------------------------------------------ facts */

/** A read-only fact: label, value, and why it cannot be edited. */
export function FactRow({ label, value, note }) {
  return (
    <div className="px-4 py-3 border-b border-spc-line last:border-b-0">
      <p className="text-spc-xs font-bold uppercase tracking-[0.11em] text-spc-muted">{label}</p>
      <p className="text-spc-sm text-spc-ink mt-0.5 break-words">{value || '—'}</p>
      {note && <p className="text-xs text-spc-muted mt-0.5 leading-snug">{note}</p>}
    </div>
  );
}

/* ----------------------------------------------------------------- fields */

/** Name and contact email, shown or edited in place. */
export function EditableFields({ editMode, formData, profile, onChange }) {
  if (!editMode) {
    return (
      <>
        <FactRow label="Full name" value={profile?.officer_name} />
        <FactRow
          label="Contact email"
          value={profile?.officer_email}
          note="Where students and companies can reach you. This is not what you sign in with."
        />
      </>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <FieldLabel htmlFor="officer-name">Full name</FieldLabel>
        <input
          id="officer-name"
          name="officer_name"
          type="text"
          value={formData.officer_name}
          onChange={onChange}
          className={FIELD_CLASS}
          placeholder="Your full name"
          required
        />
      </div>
      <div>
        <FieldLabel htmlFor="officer-email">Contact email</FieldLabel>
        <input
          id="officer-email"
          name="email"
          type="email"
          value={formData.email}
          onChange={onChange}
          className={FIELD_CLASS}
          placeholder="you@college.ac.in"
        />
        <p className="text-xs text-spc-muted mt-1 leading-snug">
          Where students and companies can reach you. You still sign in with your phone number,
          which this does not change.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ media */

/**
 * An image with its upload and delete controls.
 *
 * Used for both the officer's photo and the college logo, which behaved
 * differently before for no reason: the photo's delete lived in a hover overlay
 * over the image — invisible on a touch screen and against the direction's rule
 * that nothing hides behind hover — while the logo's lived in a row of buttons.
 * One shape now, with the delete always visible and always labelled.
 */
export function MediaBlock({
  title,
  hint,
  imageUrl,
  alt,
  uploading,
  deleting,
  inputId,
  inputRef,
  onSelect,
  onDelete,
  error,
  fit = 'cover',
  emptyIcon: EmptyIcon = User,
  footNote,
}) {
  const busy = uploading || deleting;

  return (
    <Panel>
      <PanelHeading>{title}</PanelHeading>
      <div className="px-4 py-4">
        {hint && <p className="text-spc-xs text-spc-body mb-3 leading-snug">{hint}</p>}

        <div className="flex items-start gap-4 flex-wrap">
          <div className="relative flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={alt}
                className={`w-28 h-28 rounded-spc-control border border-spc-line-strong bg-spc-surface-2 ${
                  fit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
              />
            ) : (
              <div className="w-28 h-28 rounded-spc-control border border-dashed border-spc-control
                bg-spc-surface-2 flex items-center justify-center">
                <EmptyIcon size={34} className="text-spc-muted" aria-hidden="true" />
              </div>
            )}
            {busy && (
              <div className="absolute inset-0 rounded-spc-control bg-spc-ink/40 flex items-center justify-center">
                <span className="w-6 h-6 rounded-full border-2 border-white border-b-transparent animate-spin" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* The input carries `disabled` as well as the label being styled
                as busy: a label still activates its input however it looks, so
                styling alone let a second upload start mid-upload. */}
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={onSelect}
              disabled={busy}
              className="sr-only"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <label
                htmlFor={inputId}
                className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4
                  rounded-spc-control text-spc-xs font-bold transition-colors
                  bg-spc-surface-2 border border-spc-control text-spc-ink
                  ${busy ? 'opacity-50 cursor-not-allowed' : 'hover:bg-spc-surface-3 cursor-pointer'}`}
              >
                <Upload size={15} aria-hidden="true" />
                <span>
                  {uploading ? 'Uploading…' : imageUrl ? 'Replace' : 'Upload'}
                </span>
              </label>

              {imageUrl && (
                <ActionButton
                  label={deleting ? 'Removing…' : 'Remove'}
                  description={`Remove ${title.toLowerCase()}`}
                  tone="danger"
                  showLabel
                  onClick={busy ? () => {} : onDelete}
                >
                  <Trash2 size={17} aria-hidden="true" />
                </ActionButton>
              )}
            </div>

            <p className="text-xs text-spc-muted mt-2 leading-snug">
              PNG, JPG, GIF or WebP. Up to 500&nbsp;KB.
              {footNote ? ` ${footNote}` : ''}
            </p>

            {error && (
              <p className="text-xs text-spc-bad mt-2" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

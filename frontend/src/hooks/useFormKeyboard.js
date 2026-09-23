import { useCallback } from 'react';

/**
 * Enter moves to the next field; Enter on the last one submits.
 *
 * Officers enter a lot of these forms back to back — a job request has upwards
 * of twenty fields — and the web's default makes that worse than it needs to
 * be: Enter either submits a half-filled form or does nothing at all, so the
 * only way forward is Tab, or the mouse. People type, reach for Enter out of
 * habit, and are punished for it.
 *
 * So Enter advances, like a spreadsheet. Shift+Enter goes back. On the last
 * field it submits, which is the one place the habit and the web agree, and it
 * means a whole form can be filled without the hand leaving the keyboard.
 *
 * Deliberately left alone:
 *
 *   - textarea. Enter is a newline there and always will be; taking that away
 *     to save a Tab would be a straight trade down.
 *   - buttons, including submit. Enter already activates them, and intercepting
 *     it would break the last field's own submit.
 *   - anything the browser is already handling — a native select with its list
 *     open, or an input with an autocomplete suggestion highlighted, both
 *     consume Enter themselves. Detected via isComposing and defaultPrevented
 *     rather than guessed at.
 *
 * Attach to a form or any container:
 *
 *   const onKeyDown = useFormKeyboard({ onSubmit: save });
 *   <div onKeyDown={onKeyDown}> ...fields... </div>
 */

const FIELD_SELECTOR = [
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
].join(',');

/** The fields of `container`, in the order a person moves through them. */
const fieldsOf = (container) =>
  Array.from(container.querySelectorAll(FIELD_SELECTOR)).filter(
    (el) => el.getClientRects().length > 0 && el.tabIndex !== -1
  );

export default function useFormKeyboard({ onSubmit, enabled = true } = {}) {
  return useCallback(
    (event) => {
      if (!enabled || event.key !== 'Enter') return;

      // A newline is the whole point of a textarea.
      const el = event.target;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'textarea' || tag === 'button') return;
      if (tag !== 'input' && tag !== 'select') return;

      // Checkboxes and radios: Space toggles them, and Enter conventionally
      // submits the form around them. Advancing instead would strand someone
      // on a group of tick boxes with no way out but the mouse.
      if (tag === 'input' && (el.type === 'checkbox' || el.type === 'radio')) return;

      /*
       * Something else is already using this Enter.
       *
       * An IME composing a character, or a browser autocomplete suggestion
       * being accepted, both mean the key has a job already. Stealing it would
       * drop the character or the suggestion.
       */
      if (event.nativeEvent && event.nativeEvent.isComposing) return;
      if (event.defaultPrevented) return;

      const container = event.currentTarget;
      const fields = fieldsOf(container);
      const index = fields.indexOf(el);
      if (index === -1) return;

      const step = event.shiftKey ? -1 : 1;
      const next = fields[index + step];

      if (next) {
        event.preventDefault();
        next.focus();
        // Put the caret at the end rather than selecting the value, so typing
        // appends instead of replacing something the person already entered.
        if (next.select && next.type !== 'date' && next.type !== 'number') {
          const end = next.value ? next.value.length : 0;
          if (next.setSelectionRange) {
            try { next.setSelectionRange(end, end); } catch { /* unsupported type */ }
          }
        }
        return;
      }

      // Past the last field going forward: submit. Going backwards from the
      // first field does nothing, which is where a person would expect to stop.
      if (step === 1 && onSubmit) {
        event.preventDefault();
        onSubmit(event);
      }
    },
    [onSubmit, enabled]
  );
}

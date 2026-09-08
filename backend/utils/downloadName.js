/**
 * A Content-Disposition value Node will actually accept.
 *
 * HTTP header values are Latin-1. Node refuses anything outside it outright,
 * with `ERR_INVALID_CHAR`, and because the refusal happens at setHeader the
 * whole export dies after all the work of building it — the client sees a 500
 * with no clue why.
 *
 * Every download here names its file after something a person typed. A job
 * called "Junior Management Trainee (JMT) – Civil" has an en dash in it, not a
 * hyphen, and that one character was enough to break its spreadsheet export
 * completely. A student named with any non-Latin-1 letter breaks their own
 * resume download the same way. The existing filenames only stripped
 * whitespace, which does nothing about it.
 *
 * Two names go out, per RFC 6266: a plain ASCII one every client understands,
 * and a UTF-8 one that browsers prefer when they see it. So a reader still
 * gets the real title in the saved file where their browser supports it, and a
 * readable fallback where it does not — rather than an error either way.
 */

/*
 * Percent-encoding for the `filename*` form. encodeURIComponent leaves a few
 * characters RFC 5987 wants encoded; browsers tolerate them, but a header is
 * a bad place to rely on tolerance.
 */
const rfc5987 = (value) =>
  encodeURIComponent(value).replace(/['()*!]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * The ASCII fallback.
 *
 * Anything outside printable ASCII becomes an underscore — that covers the en
 * dash and every accented letter, and also strips CR and LF, which would
 * otherwise let a crafted name inject a second header. Quotes and backslashes
 * go too, since the value is about to sit inside quotes.
 */
const asciiOnly = (value) =>
  String(value)
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/_{2,}/g, '_')
    .trim() || 'download';

/** `attachment; filename="…"; filename*=UTF-8''…` for one file name. */
export const attachmentName = (filename) => {
  const name = String(filename ?? '').trim() || 'download';
  return `attachment; filename="${asciiOnly(name)}"; filename*=UTF-8''${rfc5987(name)}`;
};

export default attachmentName;

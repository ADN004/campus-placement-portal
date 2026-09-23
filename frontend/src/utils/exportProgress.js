import toast from 'react-hot-toast';

/**
 * Telling somebody an export is happening, for as long as it is happening.
 *
 * A few thousand applicants takes the server the better part of a minute to
 * turn into a spreadsheet, and the dialog closes the instant you click. What
 * was left was a toast reading "Preparing Excel export..." with no count, no
 * sense of how long, and no sign it was still alive — so the honest reading
 * after twenty silent seconds is that it failed, and the reasonable response is
 * to click Export again, which starts a second one.
 *
 * So the toast names what is being prepared and how many rows, and after a few
 * seconds says so again in a way that makes clear it has not died. On failure
 * it shows what the server actually said instead of "Failed to export", which
 * was the same sentence whether the job was too big, the session had expired,
 * or a company name had a character the header could not carry.
 *
 * Usage:
 *   await runExport({
 *     label: 'Excel',
 *     count: filteredStudents.length,
 *     run: () => api.exportJobApplicants(...),
 *     onFile: (response) => download(response),
 *   });
 */

/** "3,412" — grouped, because four digits and five look alike at a glance. */
const formatCount = (n) => Number(n || 0).toLocaleString('en-IN');

/**
 * How long before we reassure rather than just spin.
 *
 * Six seconds: long enough that a normal export finishes first and nobody sees
 * a second message, short enough to land before somebody decides it is stuck.
 */
const SLOW_AFTER_MS = 6000;

/** The server's own words, or a readable fallback. */
export function exportErrorMessage(error, label) {
  const status = error?.response?.status;

  if (status === 401 || status === 403) {
    return 'Your session has expired — sign in again and retry the export.';
  }
  if (status === 404) {
    return 'That job could not be found. It may have been removed.';
  }

  /*
   * Errors from these endpoints arrive as a Blob, because the request asked
   * for one. The JSON inside it is the only place the reason exists, and
   * reading it is why a failed export can say anything useful at all.
   */
  const data = error?.response?.data;
  if (data && typeof data === 'object' && !(data instanceof Blob) && data.message) {
    return data.message;
  }

  if (status >= 500) {
    return `The server could not build the ${label}. If this job is very large, try narrowing it first.`;
  }
  return `Could not export as ${label}. Please try again.`;
}

/** Pull the message out of a Blob error body, which arrives unparsed. */
async function readBlobError(error) {
  const data = error?.response?.data;
  if (!(data instanceof Blob)) return null;
  try {
    const text = await data.text();
    const parsed = JSON.parse(text);
    return parsed?.message || null;
  } catch {
    return null;
  }
}

/**
 * Run an export with progress, completion and a real failure message.
 *
 * @returns {Promise<boolean>} whether a file was produced
 */
export async function runExport({ label, count, run, onFile, noun = 'applicant' }) {
  const rows = formatCount(count);
  const subject = count ? `${rows} ${noun}${count === 1 ? '' : 's'}` : 'the list';

  const id = toast.loading(`Preparing ${label} — ${subject}…`);

  // Escalates rather than replaces: the same toast, saying more, so it reads as
  // one ongoing thing and not as a second export starting.
  const slow = window.setTimeout(() => {
    toast.loading(
      `Still preparing ${label} — ${subject}. Large exports can take a minute; the file downloads on its own.`,
      { id }
    );
  }, SLOW_AFTER_MS);

  try {
    const response = await run();
    window.clearTimeout(slow);
    if (onFile) onFile(response);
    toast.success(`${label} ready — ${subject}.`, { id });
    return true;
  } catch (error) {
    window.clearTimeout(slow);
    const fromBlob = await readBlobError(error);
    toast.error(fromBlob || exportErrorMessage(error, label), { id, duration: 7000 });
    console.error(`${label} export failed:`, error);
    return false;
  }
}

/** Save a blob response as a file. Shared so every export names files alike. */
export function downloadBlob(response, filename, mimeType) {
  const blob = new Blob([response.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default runExport;

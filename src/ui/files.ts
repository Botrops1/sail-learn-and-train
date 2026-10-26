/** M56 (PHASE8_SPEC 3.1 "Files", 14.4): saving a JSON file and reading one the learner chose. */

/** A file bigger than this is refused before it is read, bytes. */
export const JSON_FILE_MAX_BYTES = 1_000_000;

/** Offers `value` as a download: JSON, UTF-8, two-space indent, through a temporary link. */
export function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked later: some browsers start the download after the click returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * The text of the file chosen in `input`; `null` when nothing was chosen, `'tooBig'` for a file
 * over `JSON_FILE_MAX_BYTES` (not read). The input is emptied afterwards, so the same file can be
 * chosen again.
 */
export async function pickJsonFile(input: HTMLInputElement): Promise<string | 'tooBig' | null> {
  const file = input.files?.[0];
  if (!file) return null;
  try {
    if (file.size > JSON_FILE_MAX_BYTES) return 'tooBig';
    return await file.text();
  } finally {
    input.value = '';
  }
}

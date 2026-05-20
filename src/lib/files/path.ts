/**
 * Storage-path utilities. The path layout for tenant-scoped documents is:
 *
 *     <institution_id>/documents/<yyyy>/<mm>/<uuid>-<safe-name>.<ext>
 *
 * Layer roles:
 *   - segment[1] = institution_id  — used by storage RLS for tenant isolation
 *   - segment[2] = literal "documents" — reserved for future per-bucket sub-areas
 *   - segments[3..4] = date prefix — keeps listings shallow per month
 *   - segment[5] = the file itself
 */

const FILENAME_MAX = 200;

/** Strip path separators, null bytes, control chars; keep unicode (incl. Thai). */
export function sanitiseFilename(name: string): string {
  const noControl = name.replace(/[\x00-\x1f\x7f]/g, "");
  const noSlashes = noControl.replace(/[/\\]/g, "_");
  const trimmed = noSlashes.replace(/^\.+/, "").trim();
  return trimmed.slice(0, FILENAME_MAX) || "file";
}

/** Build the full storage path for a new upload. */
export function buildStoragePath(
  institutionId: string,
  originalFilename: string,
  now: Date = new Date()
): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = crypto.randomUUID();
  const safe = sanitiseFilename(originalFilename);
  return `${institutionId}/documents/${yyyy}/${mm}/${id}-${safe}`;
}

/** Defence-in-depth: confirm a path the client claims to have written is in the
 *  caller's tenant directory. Server Actions should call this before recording. */
export function pathBelongsToTenant(path: string, institutionId: string): boolean {
  // path[0] is the institution_id segment; reject anything weird.
  const segments = path.split("/");
  if (segments.length < 5) return false;
  if (segments[0] !== institutionId) return false;
  if (segments[1] !== "documents") return false;
  return true;
}

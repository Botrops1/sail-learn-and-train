import type { BoatData } from './boat';

/**
 * M113 (PHASE_DINGHY_SPEC 7.3): a boat file written as an overlay on another. `mergeBoat` returns
 * a deep copy of `base` with `overlay` laid over it: objects merge key by key, `controls.list`
 * merges entry by entry by `id`, every other value (numbers, strings, arrays) is replaced. The
 * overlay's `base` and `$comment` keys are not copied. Pure.
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeById(base: unknown[], overlay: unknown[]): unknown[] {
  const out = structuredClone(base);
  for (const entry of overlay) {
    const id = isPlainObject(entry) ? entry.id : undefined;
    const at = out.findIndex((item) => isPlainObject(item) && item.id === id);
    const old = out[at];
    if (at >= 0 && isPlainObject(old) && isPlainObject(entry)) {
      out[at] = { ...old, ...structuredClone(entry) };
    } else {
      out.push(structuredClone(entry));
    }
  }
  return out;
}

function mergeInto(
  base: Record<string, unknown>,
  overlay: Record<string, unknown>,
  path: string,
  top: boolean,
): Record<string, unknown> {
  const out = structuredClone(base);
  for (const [key, value] of Object.entries(overlay)) {
    if (top && (key === 'base' || key === '$comment')) continue;
    if (!top && key === '$comment') continue;
    const here = path === '' ? key : `${path}.${key}`;
    const old = out[key];
    if (here === 'controls.list' && Array.isArray(old) && Array.isArray(value)) {
      out[key] = mergeById(old, value);
    } else if (isPlainObject(old) && isPlainObject(value)) {
      out[key] = mergeInto(old, value, here, false);
    } else {
      out[key] = structuredClone(value);
    }
  }
  return out;
}

export const OVERLAY_BASE_ID = 'hanse508';

export function mergeBoat(base: BoatData, overlay: Record<string, unknown>): BoatData {
  if (overlay.base !== OVERLAY_BASE_ID) {
    throw new Error(`A boat overlay must name its base "${OVERLAY_BASE_ID}".`);
  }
  return mergeInto(base as unknown as Record<string, unknown>, overlay, '', true) as BoatData;
}

import { el } from './dom';
import { t, type StringKey } from './i18n';

/**
 * Error boundary (M5, PHASE1_SPEC 12): when the 3D view cannot start or stops, a plain message
 * takes its place and the panel keeps working; any other error shows a banner once, with what
 * to do next. The technical message is folded away for bug reports.
 */

/** True if the browser can make a WebGL context (the 3D view needs one). */
export function webglAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!context) return false;
    // Give the test context back at once: phones allow only a few.
    context.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export type SceneProblem = 'scene.unsupported' | 'scene.failed' | 'scene.lost';

const SCENE_HINT: Record<SceneProblem, StringKey> = {
  'scene.unsupported': 'scene.unsupportedHint',
  'scene.failed': 'scene.failedHint',
  'scene.lost': 'scene.lostHint',
};

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : '';
}

function details(error: unknown): HTMLElement[] {
  const text = errorText(error);
  if (!text) return [];
  return [
    el('details', { class: 'error-details' }, [
      el('summary', {}, [t('error.details')]),
      el('code', {}, [text]),
    ]),
  ];
}

/** Shows (or replaces) the message over the 3D view. */
export function showSceneError(view: HTMLElement, problem: SceneProblem, error?: unknown): void {
  clearSceneError(view);
  if (error !== undefined) console.warn(`${t(problem)}`, error);
  view.append(
    el('div', { class: 'scene-error', role: 'alert', 'data-testid': 'scene-error' }, [
      el('p', { class: 'scene-error-title' }, [t(problem)]),
      el('p', {}, [t(SCENE_HINT[problem])]),
      ...details(error),
    ]),
  );
  view.classList.add('view-failed');
}

export function clearSceneError(view: HTMLElement): void {
  view.querySelector('.scene-error')?.remove();
  view.classList.remove('view-failed');
}

/**
 * A banner at the top of the page for the first error nobody caught (a bug): what happened, and
 * that a reload and a shared link help. Closed with ×.
 */
export function installErrorBanner(host: HTMLElement): (error: unknown) => void {
  let shown = false;
  const report = (error: unknown) => {
    if (shown) return;
    shown = true;
    const close = el(
      'button',
      { type: 'button', class: 'banner-close', 'aria-label': t('card.close') },
      ['×'],
    );
    const banner = el(
      'div',
      { class: 'error-banner', role: 'alert', 'data-testid': 'error-banner' },
      [el('p', {}, [t('error.banner')]), ...details(error), close],
    );
    close.addEventListener('click', () => banner.remove());
    host.prepend(banner);
  };
  window.addEventListener('error', (event) => report(event.error ?? event.message));
  window.addEventListener('unhandledrejection', (event) => report(event.reason));
  return report;
}

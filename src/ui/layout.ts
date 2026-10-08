import { el } from './dom';
import { t } from './i18n';
import { layoutModeFor, type LayoutMode } from './layoutMode';

export interface Viewport {
  width: number;
  height: number;
  mode: LayoutMode;
}

export interface LayoutShell {
  root: HTMLElement;
  /** Host for the 3D canvas and its overlays. */
  view: HTMLElement;
  /** Host for the panel (tabs, content, footer). */
  panel: HTMLElement;
  viewport(): Viewport;
  onChange(listener: (viewport: Viewport) => void): void;
}

/**
 * The two-region shell: 3D view and panel, stacked or side by side (PHASE1_SPEC 5.1).
 * The mode is set on <html data-layout="..."> and switches live on resize, rotation and fold.
 */
export function createLayout(host: HTMLElement): LayoutShell {
  const view = el('section', { class: 'view', 'aria-label': t('scene.label') });
  const panel = el('section', { class: 'panel', 'aria-label': t('panel.label') });
  const root = el('div', { class: 'shell' }, [view, panel]);
  host.append(root);

  const listeners: ((viewport: Viewport) => void)[] = [];
  let current: Viewport = measure();

  function measure(): Viewport {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height, mode: layoutModeFor(width, height) };
  }

  function apply(): void {
    const next = measure();
    const changed =
      next.width !== current.width || next.height !== current.height || next.mode !== current.mode;
    current = next;
    document.documentElement.dataset.layout = next.mode;
    if (changed) listeners.forEach((listener) => listener(next));
  }

  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', apply);
  window.visualViewport?.addEventListener('resize', apply);
  apply();

  return {
    root,
    view,
    panel,
    viewport: () => current,
    onChange: (listener) => listeners.push(listener),
  };
}

import { el } from './dom';
import { t } from './i18n';
import { consoleWidthOf, layoutModeFor, type LayoutMode } from './layoutMode';

export interface Viewport {
  width: number;
  height: number;
  mode: LayoutMode;
  /** On the console layout: a window under 1,280 px is narrow, else wide; null on the phone layout. */
  console: 'narrow' | 'wide' | null;
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
 * The two-region shell: 3D view and panel (a sheet on the phone layout; hidden on the console layout, whose controls are in the console and its drawers).
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
    const mode = layoutModeFor(width, height);
    return { width, height, mode, console: mode === 'console' ? consoleWidthOf(width) : null };
  }

  function apply(): void {
    const next = measure();
    const changed =
      next.width !== current.width ||
      next.height !== current.height ||
      next.mode !== current.mode ||
      next.console !== current.console;
    current = next;
    document.documentElement.dataset.layout = next.mode;
    if (next.console) document.documentElement.dataset.console = next.console;
    else delete document.documentElement.dataset.console;
    delete document.documentElement.dataset.wide;
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

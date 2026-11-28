import type { Store } from '../app/store';
import { el } from './dom';
import { t } from './i18n';
import type { LayoutShell } from './layout';
import type { BlockId } from './modes';

export type { BlockId } from './modes';

/** The band's blocks, left to right (PHASE_CONSOLE_SPEC 7.5). */
export const BLOCK_IDS: readonly BlockId[] = [
  'port',
  'wheel',
  'engine',
  'sails',
  'starboard',
  'harbour',
];

export interface ConsoleView {
  root: HTMLElement;
  /** The block's element: a title row (`.console-title`), then the sections placed in it. */
  slot(id: BlockId): HTMLElement;
  /** The smallest top of the band and of the sails strip, for the camera (CSS px, window). */
  top(): number;
}

/**
 * The console (PHASE_CONSOLE_SPEC 7.5): a band along the bottom of the view with one slot per
 * block. The slots start empty; `panel.ts` moves each section's element into its slot and
 * sets the block's title. Built once on every layout and `hidden` on the phone layout.
 */
export function createConsole(view: HTMLElement, _store: Store, layout: LayoutShell): ConsoleView {
  const slots = new Map<BlockId, HTMLElement>();
  const hiddenAtStart: readonly BlockId[] = ['port', 'starboard', 'harbour'];
  for (const id of BLOCK_IDS) {
    const slot = el(
      'div',
      {
        class:
          id === 'sails'
            ? 'console-block console-sails console-slot'
            : 'console-block console-slot',
        'data-testid': `console-block-${id}`,
        'data-block': id,
      },
      [el('div', { class: 'console-title' })],
    );
    if (hiddenAtStart.includes(id)) slot.hidden = true;
    slots.set(id, slot);
  }
  const band = el(
    'div',
    { class: 'console-band' },
    BLOCK_IDS.map((id) => slots.get(id) as HTMLElement),
  );
  const root = el(
    'section',
    { class: 'console', 'data-testid': 'console', 'aria-label': t('console.label') },
    [band],
  );
  view.append(root);

  const apply = () => {
    root.hidden = layout.viewport().mode !== 'console';
  };
  layout.onChange(apply);
  apply();

  return {
    root,
    slot: (id) => slots.get(id) as HTMLElement,
    top: () => {
      let top = band.getBoundingClientRect().top;
      const sails = slots.get('sails');
      // From M120 the sails slot may stand outside the band, over it.
      if (sails && !band.contains(sails)) top = Math.min(top, sails.getBoundingClientRect().top);
      return top;
    },
  };
}

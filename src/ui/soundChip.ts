import { getSoundPrefs, onSoundPrefs, setSoundPrefs } from '../audio/prefs';
import { el } from './dom';
import { t } from './i18n';

/**
 * The speaker chip over the 3D view (M87, PHASE_AUDIO_SPEC 6.5): switches Sound on and off. Shown
 * on side and wide layouts only (CSS hides it on a phone); the chip row is made by app.ts.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
}

/** A speaker (a box and a cone), with two arcs when on and a cross when off. */
function speakerIcon(on: boolean): SVGSVGElement {
  const icon = svg('svg', {
    viewBox: '0 0 24 24',
    width: '24',
    height: '24',
    'aria-hidden': 'true',
    class: 'sound-icon',
  });
  icon.append(
    svg('rect', { x: '3', y: '9', width: '4', height: '6', fill: 'currentColor' }),
    svg('path', { d: 'M7 9 L12 5 L12 19 L7 15 Z', fill: 'currentColor' }),
  );
  const stroke = {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
  };
  if (on) {
    icon.append(
      svg('path', { ...stroke, d: 'M15.5 9 Q17.5 12 15.5 15' }),
      svg('path', { ...stroke, d: 'M18.5 6.5 Q22 12 18.5 17.5' }),
    );
  } else {
    icon.append(svg('path', { ...stroke, d: 'M15.5 9.5 L21 15 M21 9.5 L15.5 15' }));
  }
  return icon;
}

export function createSoundChip(row: HTMLElement): HTMLButtonElement {
  const chip = el('button', {
    type: 'button',
    class: 'view-chip sound-chip',
    'data-testid': 'sound-chip',
  });
  const sync = (): void => {
    const on = getSoundPrefs().on;
    chip.setAttribute('aria-pressed', String(on));
    const label = t(on ? 'sound.chipOn' : 'sound.chipOff');
    chip.setAttribute('aria-label', label);
    chip.title = label;
    chip.replaceChildren(speakerIcon(on));
  };
  chip.addEventListener('click', () => setSoundPrefs({ on: !getSoundPrefs().on }));
  onSoundPrefs(sync);
  sync();
  row.insertBefore(chip, row.querySelector('[data-testid="settings-button"]'));
  return chip;
}

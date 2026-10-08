import { boat } from '../model/boat';
import { SCENE } from '../render3d/sceneConfig';
import { el } from './dom';
import { t, type StringKey } from './i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';

export type RopeColorKey = keyof typeof SCENE.ropes.colors;

/**
 * Rope colour legend (PHASE1_SPEC 7.3): the teaching colours of the 3D ropes, each paired with a
 * dash pattern and a name, so colour is never the only signal. The clutch drawing uses the same
 * colours and patterns.
 */
export const ROPE_DASH: Record<RopeColorKey, string> = {
  mainsheet: 'none',
  jibsheet: '9 3',
  control: '2 3',
  furling: '7 3 2 3',
  halyard: '4 4',
};

const LEGEND_ORDER: readonly RopeColorKey[] = [
  'mainsheet',
  'jibsheet',
  'control',
  'furling',
  'halyard',
];

export function ropeColorKey(ropeId: string): RopeColorKey {
  const key = boat.ropes.list.find((rope) => rope.id === ropeId)?.colorKey;
  if (!key || !(key in SCENE.ropes.colors)) throw new Error(`No rope colour for ${ropeId}.`);
  return key as RopeColorKey;
}

function swatch(color: string, dash: string): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('viewBox', '0 0 36 10');
  root.setAttribute('class', 'legend-swatch');
  root.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(SVG_NS, 'line');
  for (const [name, value] of Object.entries({
    x1: '1',
    y1: '5',
    x2: '35',
    y2: '5',
    stroke: color,
    'stroke-width': '4.5',
    'stroke-dasharray': dash,
  })) {
    line.setAttribute(name, value);
  }
  root.append(line);
  return root;
}

export function createRopeLegend(): HTMLElement {
  const items = LEGEND_ORDER.map((key) =>
    el('li', {}, [
      swatch(SCENE.ropes.colors[key], ROPE_DASH[key]),
      el('span', {}, [t(`legend.${key}` as StringKey)]),
    ]),
  );
  items.push(
    el('li', {}, [swatch(SCENE.ropes.fighting, 'none'), el('span', {}, [t('legend.fighting')])]),
  );
  return el('section', { class: 'rope-legend', 'data-testid': 'rope-legend' }, [
    el('h3', { class: 'section-title' }, [t('legend.title')]),
    el('ul', {}, items),
  ]);
}

import type { Store } from '../app/store';
import { placeLabels, type ScreenBox } from '../model/labels3d';
import { highlightIds } from '../model/panelEntries';
import { partInfo } from '../model/registry';
import type { ScreenPoint } from '../render3d/scene';
import { el } from './dom';

export interface Labels3d {
  /** Places the labels at this frame's points (does nothing while the labels are off). */
  update(points: readonly ScreenPoint[]): void;
}

/** Gap between two labels, and between a label and its point, CSS px. */
const LABEL_GAP_PX = 4;
/** How often the buttons over the view (wind chip, Pause, camera bar, card) are measured, ms. */
const BLOCKED_REFRESH_MS = 300;
/** The view's own buttons and cards that labels must not cover. */
const BLOCKING =
  '.wind-chip, .pause-button, .camera-bar, .rig-alerts > :not([hidden]), .info-area .info-card:not([hidden]), .debug:not([hidden])';

/**
 * Labels in 3D (M5, PHASE1_SPEC 5.2): the registry name of each part and rope, over the 3D view,
 * just above its point on the boat. Turned on in the View tab (`lb=1`). Where labels would
 * overlap, the one higher in the data's list wins, and the selected part's label always shows
 * (highlighted); zooming in makes room for more. Tapping a label selects its part, as a tap on
 * the part itself does. A visual aid only: the same names are in the panel, so screen readers
 * skip the labels.
 */
export function createLabels3d(view: HTMLElement, store: Store): Labels3d {
  const layer = el('div', {
    class: 'labels3d',
    'data-testid': 'labels3d',
    'aria-hidden': 'true',
    hidden: '',
  });
  view.append(layer);

  interface Label {
    button: HTMLButtonElement;
    width: number;
    height: number;
    x: number;
    y: number;
    shown: boolean;
  }
  const labels = new Map<string, Label>();
  const labelFor = (id: string): Label => {
    let label = labels.get(id);
    if (!label) {
      const button = el(
        'button',
        { type: 'button', class: 'label3d', tabindex: '-1', 'data-part-id': id },
        [partInfo(id)?.name ?? id],
      );
      button.addEventListener('click', () => store.dispatch({ type: 'select', partId: id }));
      layer.append(button);
      label = { button, width: 0, height: 0, x: NaN, y: NaN, shown: false };
      labels.set(id, label);
    }
    if (label.width === 0) {
      label.width = label.button.offsetWidth;
      label.height = label.button.offsetHeight;
    }
    return label;
  };

  let blocked: ScreenBox[] = [];
  let blockedAt = -Infinity;
  const measureBlocked = (now: number) => {
    if (now - blockedAt < BLOCKED_REFRESH_MS) return;
    blockedAt = now;
    const origin = view.getBoundingClientRect();
    blocked = [...view.querySelectorAll<HTMLElement>(BLOCKING)]
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
      }));
  };

  let on = false;
  let selected = '';
  return {
    update(points) {
      const state = store.getState();
      if (state.settings.labels !== on) {
        on = state.settings.labels;
        layer.hidden = !on;
        blockedAt = -Infinity;
      }
      if (!on) return;
      measureBlocked(performance.now());
      if (state.selection !== selected) {
        labels.get(selected)?.button.classList.remove('label3d-selected');
        selected = state.selection ?? '';
        labels.get(selected)?.button.classList.add('label3d-selected');
      }
      const boxes = points.map((point) => {
        const label = labelFor(point.id);
        return {
          id: point.id,
          x: point.x - label.width / 2,
          y: point.y - label.height - LABEL_GAP_PX,
          width: label.width,
          height: label.height,
        };
      });
      const area = { x: 0, y: 0, width: view.clientWidth, height: view.clientHeight };
      const shown = placeLabels(boxes, area, blocked, highlightIds(state.selection), LABEL_GAP_PX);
      for (const [id, label] of labels) {
        const box = boxes.find((candidate) => candidate.id === id);
        const visible = box !== undefined && shown.has(id);
        // (A label not placed yet has NaN for its position: always moved.)
        if (visible && !(Math.abs(box.x - label.x) <= 0.5 && Math.abs(box.y - label.y) <= 0.5)) {
          label.x = box.x;
          label.y = box.y;
          label.button.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
        }
        if (visible !== label.shown) {
          label.shown = visible;
          label.button.classList.toggle('label3d-shown', visible);
        }
      }
    },
  };
}

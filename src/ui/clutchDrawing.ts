import type { AppState, Store } from '../app/store';
import { boat } from '../model/boat';
import { clutchSpots, entryFor, panelEntries, type ClutchSpot } from '../model/panelEntries';
import { partInfo } from '../model/registry';
import { SCENE } from '../render3d/sceneConfig';
import { t, type StringKey } from './i18n';
import { ropeColorKey, ROPE_DASH } from './ropeLegend';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Drawing of the clutch banks (PHASE1_SPEC 7.2), after the photos in docs/reference/photos/:
 * seen from the helm looking forward, bank B (port) on the left, bank A (starboard) on the
 * right, and the single JIB ROLL clutch on the port side deck, drawn on its own above them.
 * Ropes arrive from the mast at the top and leave towards the winch at the bottom, in their
 * teaching colours with a dash pattern (red while they fight another rope, as in 3D).
 *
 * Each clutch shows its label exactly as written on the boat and, along its rope tail, our name
 * where it differs. Tapping a clutch selects its rope; clutches whose ropes share a control
 * light up together. Sizes are drawing units (the SVG scales to the panel's width).
 */
const D = {
  width: 320,
  margin: 4,
  bankGap: 12,
  clutchGap: 2,
  /** The halyard clutches are a bigger type (hanse508.json → clutchPanel.largeClutchRopes). */
  largeWidthFactor: 1.3,
  roll: { top: 4, height: 26, width: 104, plateInset: 5, captionGap: 8 },
  bankCaptionY: 52,
  ropeInTop: 58,
  clutchTop: 72,
  clutchHeight: 104,
  /** A large clutch reaches further forward (its lever). */
  largeExtraTop: 10,
  sticker: { width: 15, inset: 11 },
  tailLength: 98,
  ropeWidth: 4.5,
  font: { label: 11.5, minLabel: 9.5, tag: 11, caption: 12.5 },
  /** Approximate glyph widths (em) to fit a label on its sticker. */
  glyphEm: { upper: 0.68, lower: 0.54 },
} as const;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
  children: (SVGElement | string)[] = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  node.append(...children);
  return node;
}

/** Font size so that `text` fits in `length` units (labels are short; a rough estimate). */
function fitFont(text: string, length: number): number {
  const upper = [...text].filter((c) => c >= 'A' && c <= 'Z').length;
  const em = upper * D.glyphEm.upper + (text.length - upper) * D.glyphEm.lower;
  return Math.max(D.font.minLabel, Math.min(D.font.label, length / em));
}

/** Our name for a clutch where it differs from the label on the boat (e.g. "jib sheet"). */
function tagFor(spot: ClutchSpot): string | null {
  if (spot.tail === 'furl') return t('clutch.tag.furlIn');
  if (spot.tail === 'unfurl') return t('clutch.tag.furlOut');
  const name = partInfo(spot.ropeId)?.name ?? '';
  const plain = (text: string) =>
    text
      .toLowerCase()
      .replace(/^main\s*/, '')
      .replace(/\s+/g, '');
  return plain(name) === plain(spot.label) ? null : name.toLowerCase();
}

/** What a screen reader says for a clutch: label, our name, and which end of the rope. */
function accessibleName(spot: ClutchSpot): string {
  const name = partInfo(spot.ropeId)?.name ?? spot.ropeId;
  const tail = spot.tail ? `, ${t(`clutch.tail.${spot.tail}` as StringKey)}` : '';
  return `${t('clutch.aria', { label: spot.label, name })}${tail}`;
}

interface ClutchNode {
  spot: ClutchSpot;
  group: SVGGElement;
  ropes: SVGLineElement[];
}

export interface ClutchDrawing {
  element: SVGSVGElement;
  refresh(state: AppState, previous?: AppState): void;
}

export function createClutchDrawing(store: Store): ClutchDrawing {
  const spots = clutchSpots();
  const bankWidth = (D.width - 2 * D.margin - D.bankGap) / 2;
  const bottom = D.clutchTop + D.clutchHeight + D.tailLength;
  const root = svg('svg', {
    viewBox: `0 0 ${D.width} ${bottom + 2}`,
    class: 'clutch-drawing',
    role: 'group',
    'aria-label': t('clutch.drawingLabel'),
    'data-testid': 'clutch-drawing',
  });
  const nodes: ClutchNode[] = [];

  const select = (spot: ClutchSpot) => {
    const entry = panelEntries().find((candidate) => candidate.key === spot.entryKey);
    store.dispatch({ type: 'select', partId: entry?.selectId ?? spot.ropeId });
  };

  const makeFocusable = (group: SVGGElement, spot: ClutchSpot) => {
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', accessibleName(spot));
    group.setAttribute('data-rope-id', spot.ropeId);
    group.classList.add('clutch');
    group.addEventListener('click', () => select(spot));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(spot);
      }
    });
  };

  const ropeLine = (spot: ClutchSpot, x1: number, y1: number, x2: number, y2: number) => {
    const line = svg('line', {
      x1,
      y1,
      x2,
      y2,
      class: 'clutch-rope',
      'stroke-width': D.ropeWidth,
      'stroke-dasharray': ROPE_DASH[ropeColorKey(spot.ropeId)],
    });
    return line;
  };

  // JIB ROLL: a single clutch on the port side deck, further forward (drawn at the top left).
  const roll = spots.find((spot) => spot.bankId === boat.cockpitHardware.jibRollClutch.id);
  if (roll) {
    const r = D.roll;
    const y = r.top;
    const midY = y + r.height / 2;
    const group = svg('g', {});
    makeFocusable(group, roll);
    const rope = ropeLine(roll, 0, midY, D.margin + r.width + 12, midY);
    const plateWidth = r.width - 2 * r.plateInset - 10;
    const label = svg(
      'text',
      {
        x: D.margin + r.plateInset + plateWidth / 2,
        y: midY,
        class: 'clutch-label',
        'font-size': fitFont(roll.label, plateWidth - 6),
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      },
      [roll.label],
    );
    const tag = tagFor(roll);
    const captionX = D.margin + r.width + r.captionGap + 12;
    group.append(
      svg('rect', {
        x: 0,
        y: 0,
        width: D.width * 0.75,
        height: y + r.height + 6,
        class: 'clutch-hit',
      }),
      rope,
      svg('rect', {
        x: D.margin,
        y,
        width: r.width,
        height: r.height,
        rx: 6,
        class: 'clutch-body',
      }),
      svg('rect', {
        x: D.margin + r.plateInset,
        y: y + r.plateInset,
        width: plateWidth,
        height: r.height - 2 * r.plateInset,
        rx: 2,
        class: 'clutch-sticker clutch-sticker-plate',
      }),
      label,
      svg('text', { x: captionX, y: midY - 6, class: 'clutch-caption' }, [t('clutch.sideDeck')]),
      ...(tag
        ? [svg('text', { x: captionX, y: midY + 9, class: 'clutch-tag' }, [`→ ${tag}`])]
        : []),
    );
    root.append(group);
    nodes.push({ spot: roll, group, ropes: [rope] });
  }

  // The two banks, port on the left.
  for (const side of ['port', 'starboard'] as const) {
    const bank = spots.filter((spot) => spot.side === side && spot.bankId !== roll?.bankId);
    bank.sort((a, b) => a.slot - b.slot);
    const left = side === 'port' ? D.margin : D.margin + bankWidth + D.bankGap;
    const units = bank.reduce((sum, spot) => sum + (spot.large ? D.largeWidthFactor : 1), 0);
    const unit = (bankWidth - (bank.length - 1) * D.clutchGap) / units;
    const bankId = bank[0]?.bankId ?? '';
    const caption = svg('text', { x: left, y: D.bankCaptionY, class: 'clutch-caption' }, [
      t(side === 'port' ? 'clutch.bankB' : 'clutch.bankA'),
    ]);
    const outline = svg('rect', {
      x: left - 2,
      y: D.clutchTop - D.largeExtraTop - 3,
      width: bankWidth + 4,
      height: D.clutchHeight + D.largeExtraTop + 6,
      rx: 6,
      class: 'clutch-bank',
      'data-part-id': bankId,
    });
    root.append(caption, outline);

    let x = left;
    for (const spot of bank) {
      const width = unit * (spot.large ? D.largeWidthFactor : 1);
      const top = D.clutchTop - (spot.large ? D.largeExtraTop : 0);
      const mid = x + width / 2;
      const clutchBottom = D.clutchTop + D.clutchHeight;
      const group = svg('g', {});
      makeFocusable(group, spot);
      const ropeIn = ropeLine(spot, mid, D.ropeInTop, mid, top);
      const tail = ropeLine(spot, mid, clutchBottom, mid, bottom);
      const stickerHeight = clutchBottom - top - 2 * D.sticker.inset;
      const stickerX = mid - D.sticker.width / 2;
      const stickerY = top + D.sticker.inset;
      const labelY = stickerY + stickerHeight / 2;
      const plate = spot.ropeId === 'rope_spi_halyard' ? ' clutch-sticker-plate' : '';
      const tag = tagFor(spot);
      group.append(
        svg('rect', {
          x: x - D.clutchGap / 2,
          y: D.ropeInTop - 4,
          width: width + D.clutchGap,
          height: bottom - D.ropeInTop + 4,
          class: 'clutch-hit',
        }),
        ropeIn,
        tail,
        svg('rect', {
          x,
          y: top,
          width,
          height: clutchBottom - top,
          rx: 4,
          class: `clutch-body${spot.large ? ' clutch-body-large' : ''}`,
        }),
        svg('rect', {
          x: stickerX,
          y: stickerY,
          width: D.sticker.width,
          height: stickerHeight,
          rx: D.sticker.width / 2,
          class: `clutch-sticker${plate}`,
        }),
        svg(
          'text',
          {
            x: mid,
            y: labelY,
            transform: `rotate(-90 ${mid} ${labelY})`,
            class: 'clutch-label',
            'font-size': fitFont(spot.label, stickerHeight - 8),
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
          },
          [spot.label],
        ),
        ...(tag
          ? [
              svg(
                'text',
                {
                  x: mid + D.ropeWidth / 2 + 2,
                  y: clutchBottom + 4,
                  transform: `rotate(-90 ${mid + D.ropeWidth / 2 + 2} ${clutchBottom + 4})`,
                  class: 'clutch-tag',
                  'text-anchor': 'end',
                  'dominant-baseline': 'hanging',
                },
                [tag],
              ),
            ]
          : []),
      );
      root.append(group);
      nodes.push({ spot, group, ropes: [ropeIn, tail] });
      x += width + D.clutchGap;
    }
  }

  const refresh = (state: AppState, previous?: AppState) => {
    const entry = entryFor(state.selection);
    for (const node of nodes) {
      const selected = entry ? entry.partIds.includes(node.spot.ropeId) : false;
      node.group.setAttribute('aria-pressed', String(selected));
      node.group.classList.toggle('is-selected', selected);
      const fighting = ropeState(state, node.spot.ropeId) === 'fighting';
      const color = fighting
        ? SCENE.ropes.fighting
        : SCENE.ropes.colors[ropeColorKey(node.spot.ropeId)];
      for (const rope of node.ropes) {
        if (rope.getAttribute('stroke') !== color) rope.setAttribute('stroke', color);
      }
    }
    if (!previous || state.selection !== previous.selection) {
      for (const outline of root.querySelectorAll<SVGRectElement>('.clutch-bank')) {
        outline.classList.toggle(
          'is-selected',
          outline.getAttribute('data-part-id') === state.selection,
        );
      }
    }
  };
  return { element: root, refresh };
}

/** The solver's state of a rope, where it has one (fighting ropes are drawn red). */
function ropeState(state: AppState, ropeId: string): string | undefined {
  switch (ropeId) {
    case 'rope_mainsheet':
      return state.rig.solution.mainsheet.state;
    case 'rope_vang':
      return state.rig.solution.vang.state;
    case 'rope_topping_lift':
      return state.rig.solution.toppingLift.state;
    case 'rope_jib_sheet':
      return state.rig.jibSolution.sheet.state;
    default:
      return undefined;
  }
}

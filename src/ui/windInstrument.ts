import type { AppState, Store } from '../app/store';
import { compassDeg, mpsToKn, wrap180 } from '../model/angles';
import { requirePartId } from '../model/registry';
import { el } from './dom';
import { t } from './i18n';
import { setText } from './stepper';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** The dial in SVG units (it scales with its box); angles run clockwise from the bow. */
const DIAL = {
  half: 116,
  ring: 100,
  tickMinor: 95,
  tickMajor: 90,
  labelRadius: 80,
  /** The close-hauled sector: a display convention of wind instruments, not a claim. */
  sectorRadius: 108,
  sectorFromDeg: 20,
  sectorToDeg: 60,
  /** Needles start outside the numbers in the middle and end inside the angle labels. */
  needleInner: 48,
  awaTip: 72,
  awaHeadLength: 14,
  trueNeedleEnd: 54,
  trueBubbleRadius: 9,
  trueBubbleCentre: 62,
};

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  return node;
}

/** Point on the dial for an angle: 0 at the top (the bow), + to the right (starboard). */
function onDial(angleDeg: number, radius: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [radius * Math.sin(a), -radius * Math.cos(a)];
}

/** An arc of the dial between two angles, clockwise. */
function arc(fromDeg: number, toDeg: number, radius: number): string {
  const [x1, y1] = onDial(fromDeg, radius);
  const [x2, y2] = onDial(toDeg, radius);
  return `M${x1.toFixed(2)},${y1.toFixed(2)} A${radius},${radius} 0 0 1 ${x2.toFixed(2)},${y2.toFixed(2)}`;
}

/** "17.1": one decimal, never "-0.0". */
function oneDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return (rounded === 0 ? 0 : rounded).toFixed(1);
}

/**
 * The wind instrument (PHASE2_SPEC 7.5), at the top of the Wind tab: a dial with the bow at the
 * top, as on a boat's display. The solid needle is the apparent wind angle (AWA, what the sails
 * feel); the outlined one with a "T" is the true wind angle (TWA). The middle shows the
 * apparent wind speed (AWS) big and the true wind speed (TWS) small. Held still, both needles
 * coincide. Carries the instrument display's id.
 */
export function createWindInstrument(store: Store): HTMLElement {
  const dial = svg('svg', {
    viewBox: `${-DIAL.half} ${-DIAL.half} ${DIAL.half * 2} ${DIAL.half * 2}`,
    class: 'instrument-dial',
    role: 'img',
    'data-testid': 'wind-instrument-dial',
  });
  dial.append(svg('circle', { r: DIAL.ring, class: 'instrument-ring' }));

  // Close-hauled sectors: port red, starboard green, 20° to 60° from the bow.
  dial.append(
    svg('path', {
      d: arc(-DIAL.sectorToDeg, -DIAL.sectorFromDeg, DIAL.sectorRadius),
      class: 'instrument-sector instrument-sector-port',
    }),
    svg('path', {
      d: arc(DIAL.sectorFromDeg, DIAL.sectorToDeg, DIAL.sectorRadius),
      class: 'instrument-sector instrument-sector-starboard',
    }),
  );

  for (let angle = 0; angle < 360; angle += 10) {
    const major = angle % 30 === 0;
    const [x1, y1] = onDial(angle, major ? DIAL.tickMajor : DIAL.tickMinor);
    const [x2, y2] = onDial(angle, DIAL.ring);
    dial.append(
      svg('line', {
        x1,
        y1,
        x2,
        y2,
        class: major ? 'instrument-tick instrument-tick-major' : 'instrument-tick',
      }),
    );
  }
  // 0, 30 … 180 on both sides (so 0 at the top and 180 at the bottom).
  for (let angle = 0; angle <= 180; angle += 30) {
    for (const side of angle === 0 || angle === 180 ? [1] : [1, -1]) {
      const [x, y] = onDial(side * angle, DIAL.labelRadius);
      const label = svg('text', {
        x: x.toFixed(2),
        y: y.toFixed(2),
        class: 'instrument-label',
        'dominant-baseline': 'middle',
      });
      label.textContent = String(angle);
      dial.append(label);
    }
  }

  // True wind: an outlined needle (dark edge, white middle) with a "T" in a bubble at its tip.
  const trueNeedle = svg('g', { class: 'instrument-true', 'data-testid': 'needle-true' });
  trueNeedle.append(
    svg('line', {
      x1: 0,
      y1: -DIAL.needleInner,
      x2: 0,
      y2: -DIAL.trueNeedleEnd,
      class: 'needle-edge',
    }),
    svg('line', {
      x1: 0,
      y1: -DIAL.needleInner,
      x2: 0,
      y2: -DIAL.trueNeedleEnd,
      class: 'needle-core',
    }),
  );
  const trueBubble = svg('g', { class: 'instrument-true-tip' });
  const trueLetter = svg('text', {
    class: 'instrument-true-letter',
    'dominant-baseline': 'middle',
  });
  trueLetter.textContent = 'T';
  trueBubble.append(svg('circle', { r: DIAL.trueBubbleRadius }), trueLetter);

  // Apparent wind: a solid needle with an arrow head.
  const apparentNeedle = svg('g', {
    class: 'instrument-apparent',
    'data-testid': 'needle-apparent',
  });
  apparentNeedle.append(
    svg('line', { x1: 0, y1: -DIAL.needleInner, x2: 0, y2: -(DIAL.awaTip - DIAL.awaHeadLength) }),
    svg('path', {
      d: `M0,${-DIAL.awaTip} L-7,${-(DIAL.awaTip - DIAL.awaHeadLength)} L7,${-(DIAL.awaTip - DIAL.awaHeadLength)} Z`,
    }),
  );

  const aws = svg('text', {
    x: 0,
    y: -4,
    class: 'instrument-aws',
    'data-testid': 'instrument-aws',
  });
  const tws = svg('text', {
    x: 0,
    y: 20,
    class: 'instrument-tws',
    'data-testid': 'instrument-tws',
  });
  dial.append(trueNeedle, trueBubble, apparentNeedle, aws, tws);

  const under = el('p', { class: 'instrument-under', 'data-testid': 'instrument-under' });
  const root = el(
    'div',
    {
      class: 'field instrument',
      'data-part-id': requirePartId('fit_instrument_display'),
      'data-testid': 'wind-instrument',
    },
    [
      el('p', { class: 'hint' }, [t('instrument.hint')]),
      el('div', { class: 'instrument-box' }, [dial]),
      under,
    ],
  );

  let shown = '';
  const refresh = (state: AppState) => {
    const { awaDeg, awsKn, twaDeg, twsKn } = state.rig.wind;
    const knots = oneDecimal(mpsToKn(state.boat.speedMps));
    const heading = Math.round(compassDeg(state.boat.headingDeg)) % 360;
    // Only touch the DOM when a shown value changes (the rig moves a little every frame).
    const key = [
      Math.round(awaDeg * 2),
      oneDecimal(awsKn),
      Math.round(twaDeg * 2),
      oneDecimal(twsKn),
      knots,
      heading,
    ].join('|');
    if (key === shown) return;
    shown = key;
    apparentNeedle.setAttribute('transform', `rotate(${awaDeg.toFixed(1)})`);
    trueNeedle.setAttribute('transform', `rotate(${twaDeg.toFixed(1)})`);
    const [tx, ty] = onDial(twaDeg, DIAL.trueBubbleCentre);
    trueBubble.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
    setText(aws, `${t('instrument.aws')} ${oneDecimal(awsKn)}`);
    setText(tws, `${t('instrument.tws')} ${oneDecimal(twsKn)}`);
    const sideOf = (angle: number): string => {
      const signed = wrap180(angle);
      if (signed === 0 || Math.abs(signed) === 180) return '';
      return t(signed > 0 ? 'instrument.fromStarboard' : 'instrument.fromPort');
    };
    dial.setAttribute(
      'aria-label',
      t('instrument.aria', {
        awa: Math.abs(Math.round(awaDeg)),
        awaSide: sideOf(awaDeg),
        aws: oneDecimal(awsKn),
        twa: Math.abs(Math.round(twaDeg)),
        twaSide: sideOf(twaDeg),
        tws: oneDecimal(twsKn),
      }),
    );
    setText(under, t('instrument.under', { speed: knots, deg: heading }));
  };
  store.subscribe((state, previous) => {
    if (
      state.rig.wind !== previous.rig.wind ||
      state.boat.speedMps !== previous.boat.speedMps ||
      state.boat.headingDeg !== previous.boat.headingDeg
    ) {
      refresh(state);
    }
  });
  refresh(store.getState());
  return root;
}

import type { AppState, Store } from '../app/store';
import { area } from '../model/area';
import {
  clockParam,
  daylight,
  defaultClockUtcMs,
  localParts,
  parseClockParam,
  type LocalParts,
} from '../model/clock';
import { sunPosition, sunTimes } from '../model/sun';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import { setText } from './stepper';

const pad2 = (value: number) => String(value).padStart(2, '0');

const timeText = (parts: LocalParts) => `${pad2(parts.hour)}:${pad2(parts.minute)}`;

/** `Monday 1 June 2026`. */
function dateText(parts: LocalParts): string {
  const weekday = t(`clock.weekday.${parts.weekday}` as StringKey);
  const month = t(`clock.month.${parts.month}` as StringKey);
  return t('clock.date', { weekday, day: parts.day, month, year: parts.year });
}

/** The local `HH:MM` of a time, rounded to the nearest minute (the chip and the link floor). */
function roundedTime(utcMs: number): string {
  return timeText(localParts(Math.round(utcMs / 60_000) * 60_000));
}

/** What the time widget (`timeBar.ts`) needs from the clock. */
export interface ClockParts {
  /** The local time, `12:00`, shown under the speed in the widget's left part. */
  chip: HTMLElement;
  /** The clock's part of the time card: the date, the area, sunrise and sunset, the light, the buttons. */
  section: HTMLElement;
  /** The card opens: the inputs start at the time on board. */
  opened(): void;
  /** Whether the clock shows (the Clock switch in Settings). */
  shown(state: AppState): boolean;
}

/**
 * The clock (PHASE3_SPEC 9.5, issue #26; M92, issue #172): the local time in the time widget's
 * left part, and the clock's part of the card that the widget opens: the date, the area, sunrise
 * and sunset, the light, and the buttons to set the time (the date, the time and Set in one row,
 * Now and Noon under them). The card's open state is not stored.
 */
export function createClockParts(store: Store): ClockParts {
  const chip = el('span', { class: 'clock-chip', 'data-testid': 'clock-chip' });

  const dateLine = el('p', { class: 'clock-line', 'data-testid': 'clock-date' });
  const zoneText = el('span', {});
  const sunText = el('span', { 'data-testid': 'clock-sun' });
  const lightText = el('span', {});
  const infoLine = el('p', { class: 'clock-line clock-info' }, [
    zoneText,
    ' · ',
    sunText,
    ' · ',
    lightText,
  ]);

  const button = (testId: string, label: string, action: () => void) => {
    const node = el('button', { type: 'button', class: 'clock-button', 'data-testid': testId });
    node.textContent = label;
    node.addEventListener('click', action);
    return node;
  };
  const now = button('clock-now', t('clock.now'), () =>
    store.dispatch({ type: 'setClock', utcMs: Date.now() }),
  );
  const noon = button('clock-default', t('clock.default'), () =>
    store.dispatch({ type: 'setClock', utcMs: defaultClockUtcMs() }),
  );

  const dateInput = el('input', {
    type: 'date',
    class: 'clock-input clock-input-date',
    min: '1900-01-01',
    max: '2100-12-31',
    'aria-label': t('clock.dateAria'),
    'data-testid': 'clock-date-input',
  });
  const timeInput = el('input', {
    type: 'time',
    class: 'clock-input clock-input-time',
    step: '60',
    'aria-label': t('clock.timeAria'),
    'data-testid': 'clock-time-input',
  });
  const set = button('clock-set', t('clock.set'), () => {
    const date = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput.value);
    const time = /^(\d{2}):(\d{2})/.exec(timeInput.value);
    if (!date || !time) return;
    const utcMs = parseClockParam(`${date[1]}${date[2]}${date[3]}${time[1]}${time[2]}`);
    if (utcMs !== null) store.dispatch({ type: 'setClock', utcMs });
  });
  // An exercise sets the time (PHASE10_SPEC 6.5).
  const lockedNote = el(
    'p',
    { class: 'clock-hint', 'data-testid': 'exercise-locked-clock', hidden: '' },
    [t('exercise.locked')],
  );

  const section = el(
    'section',
    { class: 'clock-card', 'data-testid': 'clock-card', 'aria-label': t('clock.label') },
    [
      el('h3', { class: 'time-card-heading' }, [t('clock.label')]),
      dateLine,
      infoLine,
      el('div', { class: 'clock-row clock-row-set' }, [dateInput, timeInput, set]),
      el('div', { class: 'clock-row' }, [now, noon]),
      el('p', { class: 'clock-hint' }, [t('clock.hint')]),
      lockedNote,
    ],
  );

  let cardKey = '';
  const refreshCard = (state: AppState) => {
    const key = clockParam(state.clock.utcMs);
    if (key === cardKey) return;
    cardKey = key;
    const parts = localParts(state.clock.utcMs);
    setText(dateLine, `${dateText(parts)} · ${timeText(parts)}`);
    const abbr = parts.summer
      ? area.timeZone.summerAbbreviation
      : area.timeZone.standardAbbreviation;
    setText(
      zoneText,
      t('clock.zone', {
        area: t(`area.${area.id}` as StringKey),
        abbr,
        hours: parts.offsetMin / 60,
      }),
    );
    const { latitudeDeg, longitudeDeg } = area.position;
    const sun = sunTimes(parts.year, parts.month, parts.day, latitudeDeg, longitudeDeg);
    if (sun.polar === 'day') setText(sunText, t('clock.polarDay'));
    else if (sun.polar === 'night') setText(sunText, t('clock.polarNight'));
    else if (sun.sunriseUtcMs !== null && sun.sunsetUtcMs !== null) {
      setText(
        sunText,
        t('clock.sun', { rise: roundedTime(sun.sunriseUtcMs), set: roundedTime(sun.sunsetUtcMs) }),
      );
    }
    const { elevationDeg } = sunPosition(state.clock.utcMs, latitudeDeg, longitudeDeg);
    setText(
      lightText,
      t('clock.light', { light: t(`clock.light.${daylight(elevationDeg)}` as StringKey) }),
    );
  };

  let chipKey = '';
  let lockedShown: boolean | null = null;
  const refresh = (state: AppState) => {
    const locked = state.exercise !== null;
    if (locked !== lockedShown) {
      lockedShown = locked;
      for (const control of [now, noon, set, dateInput, timeInput]) control.disabled = locked;
      lockedNote.hidden = !locked;
    }
    const key = clockParam(state.clock.utcMs);
    if (key !== chipKey) {
      chipKey = key;
      setText(chip, timeText(localParts(state.clock.utcMs)));
    }
    if (!section.hidden) refreshCard(state);
  };
  store.subscribe((state) => refresh(state));
  refresh(store.getState());

  return {
    chip,
    section,
    opened: () => {
      // The inputs start at the time on board when the card opens, and are left alone after.
      const parts = localParts(store.getState().clock.utcMs);
      dateInput.value = `${String(parts.year).padStart(4, '0')}-${pad2(parts.month)}-${pad2(parts.day)}`;
      timeInput.value = timeText(parts);
      cardKey = '';
      refreshCard(store.getState());
    },
    shown: (state) => state.settings.clock,
  };
}

/** The clock's words for the widget's name: `12:00, Monday 1 June 2026`. */
export function clockAria(utcMs: number): string {
  const parts = localParts(utcMs);
  return t('clock.chipAria', { time: timeText(parts), date: dateText(parts) });
}

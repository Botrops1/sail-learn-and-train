import type { Settings } from '../model/settings';
import type { AppState, Store } from './store';
import { clockParam } from '../model/clock';
import {
  boatParams,
  parseUrlState,
  placeParams,
  realisticParams,
  serializeUrlState,
} from './urlState';

/** At most one URL update per this long (PHASE1_SPEC 9.2); the sailing boat changes it all the time. */
const URL_UPDATE_DEBOUNCE_MS = 300;

/**
 * Keeps the address bar in sync with the store, using history.replaceState. The rig changes
 * every frame, so only a change of what the URL shows starts the timer; the latest link is
 * written when it runs out (a boat under way changes it all the time, so the timer is not
 * restarted by every change). Of the rig, only the jib's furl can show in the URL (`jr`); of
 * Realistic mode, the clutches, winches and station; of the boat, the rounded heading, speed,
 * mode and autopilot target.
 */
export function startUrlSync(store: Store): void {
  let timer: number | undefined;
  let pending = serializeUrlState(store.getState());
  const write = () => {
    timer = undefined;
    if (pending !== window.location.search) {
      const url = `${window.location.pathname}${pending}${window.location.hash}`;
      window.history.replaceState(null, '', url);
    }
  };
  // Back (PHASE4_SPEC 6.5): the link in the address bar is the state to show. `pending` is set
  // first, so the debounced writer does not push the old link back.
  window.addEventListener('popstate', () => {
    const current = store.getState();
    const next = parseUrlState(window.location.search, current.settings.detail);
    pending = window.location.search;
    // Another language in the link (Back across a language change): the page is built once per
    // language, so reload it (the address bar already holds the link).
    if (next.settings.language !== current.settings.language) {
      window.location.reload();
      return;
    }
    store.dispatch({
      type: 'load',
      state: {
        ...next,
        settings: {
          ...next.settings,
          detail: current.settings.detail,
          debug: current.settings.debug,
        },
      },
    });
  });
  store.subscribe((state, previous) => {
    if (
      state.controls === previous.controls &&
      state.camera === previous.camera &&
      state.settings === previous.settings &&
      state.sea.setting === previous.sea.setting &&
      state.selection === previous.selection &&
      state.learn === previous.learn &&
      state.appMode === previous.appMode &&
      state.harbour.fendersOut === previous.harbour.fendersOut &&
      state.harbour.place === previous.harbour.place &&
      state.harbour.layout === previous.harbour.layout &&
      state.harbour.traffic === previous.harbour.traffic &&
      state.harbour.berthArrow === previous.harbour.berthArrow &&
      state.lines.lines === previous.lines.lines &&
      state.rig.jibSolution.unfurled === previous.rig.jibSolution.unfurled &&
      sameClockLink(state, previous) &&
      sameRealisticLink(state, previous) &&
      sameBoatLink(state, previous)
    ) {
      return;
    }
    const next = serializeUrlState(state);
    if (next === pending) return;
    pending = next;
    if (timer === undefined) timer = window.setTimeout(write, URL_UPDATE_DEBOUNCE_MS);
  });
  write();
}

/** The boat changes every frame: compare only what the link stores (in a place also her position, M42). */
function sameBoatLink(state: AppState, previous: AppState): boolean {
  if (state.boat === previous.boat && state.autopilot === previous.autopilot) return true;
  const link = (s: AppState) => [...boatParams(s), ...placeParams(s)].join('&');
  return link(state) === link(previous);
}

/** The clock changes every frame: the link stores it to the minute. */
function sameClockLink(state: AppState, previous: AppState): boolean {
  if (state.clock === previous.clock) return true;
  return clockParam(state.clock.utcMs) === clockParam(previous.clock.utcMs);
}

/** Realistic mode changes every frame (drums, reports): compare only what the link stores. */
function sameRealisticLink(state: AppState, previous: AppState): boolean {
  if (state.realistic === previous.realistic) return true;
  return (
    realisticParams(state.realistic).join('&') === realisticParams(previous.realistic).join('&')
  );
}

/**
 * Opens a "Show me" scene (PHASE4_SPEC 6.5): the current link goes into the browser history first,
 * so the phone's Back button returns to it. Detail, debug and the open entry are kept. When the
 * scene is already showing (Show me tapped twice), it starts again without a new history step, so
 * one Back still returns to where the viewer was (owner, PR #54).
 */
export function openScene(store: Store, query: string): void {
  const state = store.getState();
  const { detail } = state.settings;
  const link = serializeUrlState(state);
  if (!showsScene(link, query)) {
    const here = `${window.location.pathname}${link}${window.location.hash}`;
    window.history.replaceState(null, '', here);
    window.history.pushState(null, '', here);
  }
  const next = parseUrlState(query, detail);
  store.dispatch({
    type: 'load',
    state: {
      ...next,
      settings: sceneSettings(state.settings, next.settings),
      learn: state.learn,
      appMode:
        state.appMode === 'learn' || state.appMode === 'harbour' ? state.appMode : next.appMode,
    },
  });
}

/**
 * The settings after a scene opens: the scene's own, except the ones that suit the viewer and the
 * device (detail, debug overlay, step size, labels, mini-map), which stay.
 */
export function sceneSettings(current: Settings, next: Settings): Settings {
  const { detail, debug, step, labels, miniMap } = current;
  return { ...next, detail, debug, step, labels, miniMap };
}

/** The full link to what is shown now (Settings → Share). */
export function shareLink(state: AppState): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${serializeUrlState(state)}`;
}

/** True if every setting of the scene's link has the same value in `link` (the scene is showing). */
export function showsScene(link: string, query: string): boolean {
  const current = new URLSearchParams(link);
  for (const [key, value] of new URLSearchParams(query)) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

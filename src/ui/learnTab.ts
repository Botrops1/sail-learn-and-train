import { REPO_URL } from '../app/buildInfo';
import type { Store } from '../app/store';
import { openScene } from '../app/urlSync';
import {
  GROUPS,
  groupEntries,
  learnEntry,
  normalizeSearch,
  NOT_DRAWN,
  searchGlossary,
  sourceLink,
  SOURCE_LANGUAGE,
  type LearnEntry,
} from '../model/glossary';
import { HANSE_508, boatId } from '../model/boat';
import { entryFor } from '../model/panelEntries';
import { el } from './dom';
import { currentLanguage, quoted, t, type StringKey } from './i18n';
import type { SheetHeight } from './sheetGeometry';
import { onSpotlight, requestSpotlight, spotlightNow } from './spotlight';

/** The name an entry has in this language (the id itself if the entry has no text). */
export function nameOf(id: string): string {
  return learnEntry(id, currentLanguage())?.text.name ?? id;
}

function textOf(tag: 'p' | 'div', testId: string, text: string, className = ''): HTMLElement {
  return el(tag, { ...(className ? { class: className } : {}), 'data-testid': testId }, [text]);
}

/**
 * The Learn section (PHASE4_SPEC 6.6, 7.4; a tab until M27): a search box, then either the list of every entry in
 * groups (or the search results) or one entry, from the glossary text (what it is called, what it
 * does, how it works on this boat, mistakes and fixes) and the registry's facts (links, sources,
 * how sure we are). It shows the entry `state.learn` names; the info card's, the Ropes strip's and
 * the Realistic strip's "More" buttons open it. M49: "Where is it?" and "Show it working" bring the
 * camera close to the part and fade the rest (src/ui/spotlight.ts) until the next tap.
 */
export function createLearnTab(
  store: Store,
  openRopes: () => void,
  sheetControl?: { height(): SheetHeight; setHeight(height: SheetHeight): void },
): HTMLElement[] {
  const root = el('div', { class: 'learn' });
  // The search box is created once: only the area below it is re-rendered, so typing keeps focus.
  const searchInput = el('input', {
    id: 'learn-search-input',
    type: 'search',
    class: 'learn-search',
    'data-testid': 'learn-search',
    placeholder: t('learn.searchPlaceholder'),
    autocomplete: 'off',
  });
  const below = el('div', { class: 'learn-below' });
  root.append(
    el('div', { class: 'learn-search-box' }, [
      el('label', { for: 'learn-search-input', class: 'visually-hidden' }, [t('learn.search')]),
      searchInput,
    ]),
    below,
  );
  const results = el('div', {
    class: 'learn-results',
    'data-testid': 'learn-results',
    'aria-live': 'polite',
  });

  const button = (testId: string, text: string, onClick: () => void): HTMLButtonElement => {
    const node = el(
      'button',
      { type: 'button', class: 'action-button learn-button', 'data-testid': testId },
      [text],
    );
    node.addEventListener('click', onClick);
    return node;
  };

  const section = (heading: StringKey, body: HTMLElement): HTMLElement[] => [
    el('h3', { class: 'learn-heading' }, [t(heading)]),
    body,
  ];

  /** M49: on a phone a full sheet comes down to half, so the part is in sight. */
  const lowerSheet = () => {
    if (sheetControl?.height() === 'full') sheetControl.setHeight('half');
  };

  const buttonRow = (label: StringKey, buttons: HTMLButtonElement[]): HTMLElement => {
    return el('div', { class: 'learn-links' }, [
      el('p', { class: 'hint learn-links-label' }, [t(label)]),
      el('div', { class: 'learn-links-row' }, buttons),
    ]);
  };

  /** The entry shown has one hint line, visible while a spotlight is on (M49). */
  let spotlightHint: HTMLElement | undefined;
  // (Reads the spotlight itself: a spotlight that finds nothing to light is ended inside its own call.)
  onSpotlight(() => {
    if (spotlightHint) spotlightHint.hidden = spotlightNow() === null;
  });

  const render = (id: string | null) => {
    const entry = id ? learnEntry(id, currentLanguage()) : undefined;
    if (entry) {
      below.replaceChildren(entryView(entry));
      return;
    }
    // The list: the groups, or the results of the search (the groups are closed on every rebuild).
    const query = searchInput.value;
    if (normalizeSearch(query) === '') {
      results.replaceChildren();
      below.replaceChildren(groupsView(), results);
    } else {
      results.replaceChildren(...resultsView(query));
      below.replaceChildren(results);
    }
  };

  const openEntry = (id: string, testId: string, children: (Node | string)[]): HTMLElement => {
    const node = el(
      'button',
      { type: 'button', class: 'learn-list-button', 'data-testid': testId },
      children,
    );
    node.addEventListener('click', () => store.dispatch({ type: 'openLearn', id }));
    return node;
  };

  const groupsView = (): HTMLElement =>
    el(
      'div',
      { class: 'learn-groups', 'data-testid': 'learn-groups' },
      GROUPS.map((group) => {
        const ids = groupEntries(group, currentLanguage());
        return el('details', { class: 'learn-group', 'data-testid': `learn-group-${group}` }, [
          el('summary', { class: 'learn-group-summary' }, [
            t(`learn.group.${group}` as StringKey, { count: ids.length }),
          ]),
          ...ids.map((id) => openEntry(id, `learn-entry-${id}`, [nameOf(id)])),
        ]);
      }),
    );

  const resultsView = (query: string): HTMLElement[] => {
    const hits = searchGlossary(query, currentLanguage());
    if (hits.length === 0) {
      return [textOf('p', 'learn-no-match', t('learn.noMatch'), 'hint')];
    }
    return hits.map((hit) =>
      openEntry(hit.id, `learn-hit-${hit.id}`, [
        el('span', { class: 'learn-hit-name' }, [hit.name]),
        ...(hit.matched !== null
          ? [
              el('span', { class: 'learn-hit-matched' }, [
                t('learn.matched', { term: hit.matched }),
              ]),
            ]
          : []),
      ]),
    );
  };

  searchInput.addEventListener('input', () => {
    // A search while an entry is open shows the results: leaving the entry re-renders the list.
    if (store.getState().learn !== null) store.dispatch({ type: 'openLearn', id: null });
    else render(null);
  });

  const entryView = (entry: LearnEntry): HTMLElement => {
    const { text } = entry;
    spotlightHint = undefined;
    const nodes: (HTMLElement | undefined)[] = [];

    nodes.push(
      button('learn-back', t('learn.back'), () => store.dispatch({ type: 'openLearn', id: null })),
    );
    nodes.push(
      el('div', { class: 'learn-title' }, [
        el('h2', { class: 'learn-name', 'data-testid': 'learn-name' }, [text.name]),
        textOf('p', 'learn-kind', t(`learn.kind.${entry.kind}` as StringKey), 'learn-kind'),
      ]),
    );

    if (text.alternatives.length > 0) {
      const terms = text.alternatives
        .map((alt) =>
          alt.note ? t('learn.alternativeWithNote', { term: alt.term, note: alt.note }) : alt.term,
        )
        .join(', ');
      nodes.push(
        textOf('p', 'learn-alternatives', t('learn.alternatives', { terms }), 'learn-line'),
      );
    }
    if (entry.boatLabels.length > 0) {
      const labels = entry.boatLabels.map(quoted).join(', ');
      nodes.push(textOf('p', 'learn-boat-label', t('learn.boatLabel', { labels }), 'learn-line'));
    }
    if (text.short) nodes.push(textOf('p', 'learn-short', text.short, 'learn-short'));
    if (text.what) {
      nodes.push(
        ...section(
          entry.kind === 'term' ? 'learn.whatTerm' : 'learn.what',
          textOf('p', 'learn-what', text.what, 'learn-text'),
        ),
      );
    }
    if (text.onThisBoat) {
      nodes.push(
        ...section(
          'learn.onThisBoat',
          textOf('p', 'learn-on-this-boat', text.onThisBoat, 'learn-text'),
        ),
      );
      // M58 (owner's answer 13): the texts describe the Hanse 508, whatever boat is in use.
      if (boatId !== HANSE_508.meta.id) {
        nodes.push(
          el('p', { class: 'hint', 'data-testid': 'learn-boat-note' }, [
            t('learn.writtenFor', { name: HANSE_508.meta.name }),
          ]),
        );
      }
    }
    if (text.mistakes && text.mistakes.length > 0) {
      const list = el(
        'ul',
        { class: 'learn-mistakes', 'data-testid': 'learn-mistakes' },
        text.mistakes.map((item) =>
          el('li', { class: 'learn-mistake' }, [
            el('p', {}, [el('strong', {}, [`${t('learn.mistake')} `]), item.mistake]),
            el('p', {}, [el('strong', {}, [`${t('learn.fix')} `]), item.fix]),
          ]),
        ),
      );
      nodes.push(...section('learn.mistakes', list));
    }

    let showMeBlock: HTMLElement | undefined;
    if (entry.showMeQuery) {
      const query = entry.showMeQuery;
      const status = el('p', {
        class: 'hint learn-status',
        'data-testid': 'learn-status',
        'aria-live': 'polite',
      });
      showMeBlock = el('div', { class: 'learn-show-me' }, [
        ...(text.showMe ? [textOf('p', 'learn-show-me-text', text.showMe, 'learn-text')] : []),
        button('learn-show-me', t('learn.showItWorking'), () => {
          // The link saved for Back must hold the open entry, and `learn=` is written only in
          // Learn mode (an entry read in the folded Learn section of Easy has no mode): switch
          // first, as "More" on the info card does (PHASE5_SPEC 8.3, review of PR #65).
          store.dispatch({ type: 'setAppMode', mode: 'learn' });
          openScene(store, query);
          status.textContent = t('learn.showMeDone');
          lowerSheet();
          requestSpotlight(entry.id, 'show');
        }),
        status,
      ]);
      nodes.push(showMeBlock);
    }

    let lastButtons: HTMLElement | undefined;
    if (entry.kind !== 'term' && !NOT_DRAWN.has(entry.id)) {
      lastButtons = el('div', { class: 'learn-links' }, [
        button('learn-show-on-boat', t('learn.whereIsIt'), () => {
          store.dispatch({ type: 'select', partId: entry.id });
          lowerSheet();
          requestSpotlight(entry.id, 'where');
        }),
      ]);
      nodes.push(lastButtons);
    }
    if (lastButtons ?? showMeBlock) {
      const hint = el(
        'p',
        { class: 'hint learn-spotlight-hint', 'data-testid': 'learn-spotlight-hint' },
        [t('learn.spotlightHint')],
      );
      hint.hidden = spotlightNow() === null;
      spotlightHint = hint;
      nodes.splice(nodes.indexOf(lastButtons ?? showMeBlock) + 1, 0, hint);
    }

    if (entry.controls.length > 0) {
      nodes.push(
        buttonRow(
          'learn.tryIt',
          entry.controls.map((controlId) =>
            button(`learn-try-${controlId}`, nameOf(controlId), () => {
              const target = entryFor(controlId);
              // Back to the boat: the ropes mode (Easy or Realistic) takes over from Learn.
              store.dispatch({ type: 'setAppMode', mode: store.getState().settings.ropesMode });
              store.dispatch({ type: 'select', partId: target?.selectId ?? controlId });
              openRopes();
            }),
          ),
        ),
      );
    }

    if (entry.related.length > 0) {
      nodes.push(
        buttonRow(
          'learn.related',
          entry.related.map((relatedId) =>
            button(`learn-related-${relatedId}`, nameOf(relatedId), () =>
              store.dispatch({ type: 'openLearn', id: relatedId }),
            ),
          ),
        ),
      );
    }

    const howSure: HTMLElement[] = [
      textOf(
        'p',
        'learn-fact-status',
        t(`learn.status.${entry.status}` as StringKey),
        'learn-text',
      ),
    ];
    if (currentLanguage() !== SOURCE_LANGUAGE && text.textStatus === 'draft') {
      howSure.push(textOf('p', 'learn-text-status', t('learn.textDraft'), 'learn-text'));
    }
    const sources = entry.sources.flatMap((key) => {
      const link = sourceLink(key, REPO_URL);
      if (!link) return [];
      switch (link.kind) {
        case 'url':
          return [sourceAnchor(link.href, link.text)];
        case 'photo':
          return [sourceAnchor(link.href, t('learn.source.photo', { name: link.name }))];
        case 'brochure':
          return [el('li', { class: 'learn-source' }, [t('learn.source.brochure')])];
        case 'owner':
          return [el('li', { class: 'learn-source' }, [t('learn.source.owner')])];
      }
    });
    if (sources.length > 0) {
      howSure.push(
        el('p', { class: 'hint learn-sources-label' }, [t('learn.sources')]),
        el('ul', { class: 'learn-sources', 'data-testid': 'learn-sources' }, sources),
      );
    }
    nodes.push(...section('learn.howSure', el('div', {}, howSure)));

    return el(
      'article',
      { class: 'learn-entry', 'data-testid': 'learn-entry', 'data-part-id': entry.id },
      nodes.filter((node): node is HTMLElement => node !== undefined),
    );
  };

  // Back leaves the scene: "Showing it…" no longer applies.
  window.addEventListener('popstate', () => {
    for (const status of root.querySelectorAll('[data-testid="learn-status"]')) {
      status.textContent = '';
    }
  });
  render(store.getState().learn);
  store.subscribe((state, previous) => {
    if (state.learn !== previous.learn) render(state.learn);
  });
  return [root];
}

function sourceAnchor(href: string, text: string): HTMLElement {
  return el('li', { class: 'learn-source' }, [
    el('a', { href, target: '_blank', rel: 'noopener', class: 'learn-source-link' }, [text]),
  ]);
}

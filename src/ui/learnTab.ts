import { REPO_URL } from '../app/buildInfo';
import type { Store } from '../app/store';
import { openScene } from '../app/urlSync';
import {
  learnEntry,
  NOT_DRAWN,
  sourceLink,
  SOURCE_LANGUAGE,
  type LearnEntry,
} from '../model/glossary';
import { entryFor } from '../model/panelEntries';
import { el } from './dom';
import { t, type StringKey } from './i18n';
import type { TabId } from './panel';

/** The language of the entries; M23 passes the app's language here. */
const LANGUAGE = SOURCE_LANGUAGE;

/** The name an entry has in this language (the id itself if the entry has no text). */
function nameOf(id: string): string {
  return learnEntry(id, LANGUAGE)?.text.name ?? id;
}

function textOf(tag: 'p' | 'div', testId: string, text: string, className = ''): HTMLElement {
  return el(tag, { ...(className ? { class: className } : {}), 'data-testid': testId }, [text]);
}

/**
 * The Learn tab (PHASE4_SPEC 6.6): one entry at a time, from the glossary text (what it is called,
 * what it does, how it works on this boat, mistakes and fixes) and the registry's facts (links,
 * sources, how sure we are). It shows the entry `state.learn` names; the info card's, the Ropes
 * strip's and the Realistic strip's "More" buttons open it.
 */
export function createLearnTab(store: Store, showTab: (tab: TabId) => void): HTMLElement[] {
  const root = el('div', { class: 'learn' });

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

  const buttonRow = (label: StringKey, buttons: HTMLButtonElement[]): HTMLElement => {
    return el('div', { class: 'learn-links' }, [
      el('p', { class: 'hint learn-links-label' }, [t(label)]),
      el('div', { class: 'learn-links-row' }, buttons),
    ]);
  };

  const render = (id: string | null) => {
    const entry = id ? learnEntry(id, LANGUAGE) : undefined;
    if (!entry) {
      root.replaceChildren(textOf('p', 'learn-empty', t('learn.empty'), 'hint'));
      return;
    }
    root.replaceChildren(entryView(entry));
  };

  const entryView = (entry: LearnEntry): HTMLElement => {
    const { text } = entry;
    const nodes: (HTMLElement | undefined)[] = [];

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
      const labels = entry.boatLabels.map((label) => `“${label}”`).join(', ');
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

    if (entry.showMeQuery) {
      const query = entry.showMeQuery;
      const status = el('p', {
        class: 'hint learn-status',
        'data-testid': 'learn-status',
        'aria-live': 'polite',
      });
      nodes.push(
        el('div', { class: 'learn-show-me' }, [
          ...(text.showMe ? [textOf('p', 'learn-show-me-text', text.showMe, 'learn-text')] : []),
          button('learn-show-me', t('learn.showMe'), () => {
            openScene(store, query);
            status.textContent = t('learn.showMeDone');
          }),
          status,
        ]),
      );
    }

    if (entry.kind !== 'term' && !NOT_DRAWN.has(entry.id)) {
      nodes.push(
        el('div', { class: 'learn-links' }, [
          button('learn-show-on-boat', t('learn.showOnBoat'), () =>
            store.dispatch({ type: 'select', partId: entry.id }),
          ),
        ]),
      );
    }

    if (entry.controls.length > 0) {
      nodes.push(
        buttonRow(
          'learn.tryIt',
          entry.controls.map((controlId) =>
            button(`learn-try-${controlId}`, nameOf(controlId), () => {
              const target = entryFor(controlId);
              store.dispatch({ type: 'select', partId: target?.selectId ?? controlId });
              showTab('ropes');
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
    if (LANGUAGE !== SOURCE_LANGUAGE && text.textStatus === 'draft') {
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

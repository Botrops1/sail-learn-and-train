// M5 accessibility pass (PHASE1_SPEC 5.1, 10): checks a page as it is shown.
// - every visible control has an accessible name;
// - text is at least 13 px (secondary text; labels 15 px is checked by eye);
// - touch targets are at least 44 × 44 px, except the compact clutch drawing of Easy mode,
//   which the owner accepted narrower (ROADMAP decisions, M4a review);
// - the Tab key reaches every control in order and never gets stuck.
// Used by scripts/shots-m5.mjs; returns a list of problems (empty = fine).

/** Controls that may be smaller than 44 px (owner decision after M4a: the compact clutches). */
const SMALL_OK = ['.clutch-drawing .clutch'];

/**
 * Text that may be smaller than 13 px: the words on the clutches' stickers and bodies, drawn at
 * the clutch's size like the stickers on the boat (M4a, M4b). The same words are in each clutch's
 * accessible name and in the strip under the drawing. Listed as a question for the owner (M5).
 */
const SMALL_TEXT_OK = ['.clutch-label', '.clutch-tag', '.real-clutch-state', '.real-clutch-tag'];

export async function auditPage(page, label) {
  const found = await page.evaluate(
    ([smallOk, smallTextOk]) => {
      const problems = [];
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        const style = getComputedStyle(element);
        return style.visibility !== 'hidden' && style.display !== 'none';
      };
      const hiddenFromAll = (element) => element.closest('[aria-hidden="true"], [hidden], [inert]');
      const describe = (element) => {
        const id = element.id ? `#${element.id}` : '';
        const raw = element.getAttribute('class') ?? '';
        const cls = raw ? `.${raw.trim().split(/\s+/).join('.')}` : '';
        const test = element.getAttribute('data-testid');
        return `${element.tagName.toLowerCase()}${id}${cls}${test ? `[${test}]` : ''}`;
      };
      const nameOf = (element) => {
        const aria = element.getAttribute('aria-label');
        if (aria?.trim()) return aria.trim();
        const by = element.getAttribute('aria-labelledby');
        if (by) {
          const text = by
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? '')
            .join(' ')
            .trim();
          if (text) return text;
        }
        if (element.id) {
          const label = document.querySelector(`label[for="${element.id}"]`);
          if (label?.textContent?.trim()) return label.textContent.trim();
        }
        const wrapping = element.closest('label');
        if (wrapping?.textContent?.trim()) return wrapping.textContent.trim();
        const title = element.getAttribute('title') ?? element.querySelector('title')?.textContent;
        if (title?.trim()) return title.trim();
        if (!['INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
          const text = element.textContent?.trim();
          if (text) return text;
        }
        return '';
      };
      const controls = [
        ...document.querySelectorAll(
          'button, input, select, textarea, a[href], [role="button"], [role="tab"], [role="slider"], [role="switch"], [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((element) => visible(element) && !hiddenFromAll(element));
      for (const element of controls) {
        if (!nameOf(element)) problems.push(`no accessible name: ${describe(element)}`);
        if (smallOk.some((selector) => element.matches(selector))) continue;
        // An input inside a label is hit through the label.
        const target =
          element.tagName === 'INPUT' && element.closest('label')
            ? element.closest('label')
            : element;
        const rect = target.getBoundingClientRect();
        if (rect.width < 43.5 || rect.height < 43.5) {
          problems.push(
            `small touch target ${Math.round(rect.width)}×${Math.round(rect.height)}: ${describe(target)} "${nameOf(element).slice(0, 30)}"`,
          );
        }
      }
      // Text size: every visible element with its own text.
      const seen = new Set();
      for (const element of document.querySelectorAll('body *')) {
        if (!visible(element) || hiddenFromAll(element)) continue;
        const own = [...element.childNodes].some(
          (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
        );
        if (!own || smallTextOk.some((selector) => element.matches(selector))) continue;
        const size = parseFloat(getComputedStyle(element).fontSize);
        // SVG text is drawn in its own units: check the size it ends up on screen.
        const shown =
          element instanceof SVGElement ? element.getBoundingClientRect().height * 0.8 : size;
        if (shown < 12.5) {
          const key = `${describe(element)} ${Math.round(shown)}`;
          if (!seen.has(key)) {
            seen.add(key);
            problems.push(
              `text ${shown.toFixed(1)} px < 13 px: ${describe(element)} "${element.textContent.trim().slice(0, 30)}"`,
            );
          }
        }
      }
      return problems;
    },
    [SMALL_OK, SMALL_TEXT_OK],
  );

  // Keyboard: Tab through everything; focus must move to a named control each time.
  const tabProblems = [];
  await page.evaluate(() => document.activeElement?.blur());
  const visited = [];
  for (let i = 0; i < 150; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect();
      const style = getComputedStyle(a);
      // A focus style on the element itself, or a :focus / :focus-visible rule for it that styles
      // a part inside it (the SVG drawings ring the clutch body, the drum, the button disc).
      const focusRule = [...document.styleSheets].some((sheet) =>
        [...sheet.cssRules].some((rule) =>
          (rule.selectorText ?? '').split(',').some((selector) => {
            const head = selector.trim().split(/:focus(-visible)?/)[0];
            return /:focus/.test(selector) && head && a.matches(head);
          }),
        ),
      );
      const cls = typeof a.className === 'string' ? a.className : a.getAttribute('class');
      return {
        key: `${a.tagName}#${a.id}.${cls}@${Math.round(r.x)},${Math.round(r.y)}:${a.getAttribute('aria-label') ?? a.textContent?.trim().slice(0, 20)}`,
        outline: focusRule || style.outlineStyle !== 'none' || style.boxShadow !== 'none',
      };
    });
    if (!info) break;
    if (visited.includes(info.key)) break; // wrapped around
    visited.push(info.key);
    if (!info.outline) tabProblems.push(`no visible focus: ${info.key}`);
  }
  return [...found, ...tabProblems].map((problem) => `${label}: ${problem}`);
}

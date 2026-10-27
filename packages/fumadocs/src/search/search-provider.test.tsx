import { afterEach, beforeAll, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { SearchTrigger } from '../index.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { createSearchIndexUrl } from '../test-utils/search-index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/kit/styles.css';

/** The URL of the search index of the fixtures. */
let from = '';

beforeAll(async () => {
  from = await createSearchIndexUrl();
});

/** Report `platform` as the platform of the browser, in its client hints, as Chromium does. */
function stubPlatform(platform: 'macOS' | 'Windows'): void {
  Object.defineProperty(navigator, 'userAgentData', {
    configurable: true,
    value: { platform },
  });
}

afterEach(() => {
  Reflect.deleteProperty(navigator, 'userAgentData');
});

/** Press `key` with Control or Command on `target`, as a `keydown` that bubbles to the window. */
function pressShortcut(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

const searchDialog = page.getByRole('dialog', { name: 'Search' });

/** The dialog is still closed: give an opening a frame or two to show. */
async function expectClosed(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });
  await expect.element(searchDialog).not.toBeInTheDocument();
}

describe('the search shortcut', () => {
  it('opens the dialog with Ctrl K, and closes it again', async () => {
    stubPlatform('Windows');
    await renderDocs(<SearchTrigger />, { search: { from } });
    const trigger = page.getByRole('button', { name: 'Search' });
    await expect.element(trigger).toHaveAttribute('aria-keyshortcuts', 'Control+K');
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.keyboard('{Control>}k{/Control}');
    await expect.element(searchDialog).toBeVisible();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    const field = searchDialog.getByRole('combobox', { name: 'Search the docs' });
    await expect.element(field).toHaveFocus();

    // In the field of the dialog too.
    await userEvent.keyboard('{Control>}k{/Control}');
    await expect.element(searchDialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens it with ⌘K on Apple platforms, where Ctrl K in a text field is the field’s', async () => {
    stubPlatform('macOS');
    await renderDocs(
      <>
        <input aria-label="Notes" />
        <SearchTrigger />
      </>,
      { search: { from } },
    );
    await expect
      .element(page.getByRole('button', { name: 'Search' }))
      .toHaveAttribute('aria-keyshortcuts', 'Meta+K');
    const notes = page.getByRole('textbox', { name: 'Notes' });
    await userEvent.click(notes);

    // Ctrl K deletes to the end of the line there.
    const event = pressShortcut(notes.element(), { key: 'k', code: 'KeyK', ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    await expectClosed();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await expect.element(searchDialog).toBeVisible();
  });

  it('takes the key in the place of K on a layout without Latin letters', async () => {
    stubPlatform('Windows');
    await renderDocs(<SearchTrigger />, { search: { from } });

    // The key in the place of K on the Russian layout, a Cyrillic el.
    pressShortcut(document.body, { key: '\u043B', code: 'KeyK', ctrlKey: true });
    await expect.element(searchDialog).toBeVisible();
  });

  it('leaves alone a shortcut the page handled, a held key and other modifiers', async () => {
    stubPlatform('Windows');
    await renderDocs(
      <>
        <input
          aria-label="Editor"
          onKeyDown={(event) => {
            event.preventDefault();
          }}
        />
        <SearchTrigger />
      </>,
      { search: { from } },
    );

    const events = [
      pressShortcut(page.getByRole('textbox', { name: 'Editor' }).element(), {
        key: 'k',
        ctrlKey: true,
      }),
      pressShortcut(document.body, { key: 'k', ctrlKey: true, repeat: true }),
      pressShortcut(document.body, { key: 'k', ctrlKey: true, shiftKey: true }),
      pressShortcut(document.body, { key: 'k', ctrlKey: true, altKey: true }),
      pressShortcut(document.body, { key: 'k', ctrlKey: true, metaKey: true }),
    ];
    // The editor's own; a held key is still kept from the browser, without opening the dialog
    // again and again; the others are no shortcut.
    expect(events.map((event) => event.defaultPrevented)).toStrictEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    await expectClosed();
  });
});

import { vars } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { cleanup, render } from 'vitest-browser-react';

import { ThemeProvider, themeScript, useTheme } from '../index.ts';
import type { ThemeChoice, ThemeProviderProps } from '../index.ts';

import '@contour-ui/tokens/tokens.css';

const root = document.documentElement;

/** The theme attribute of `<html>`, `data-theme`. */
const theme = (): string | undefined => root.dataset['theme'];

/** A page load: the storage, the system and the default, and the theme they lead to. */
interface ThemeCase {
  /** The value under the storage key, `null` for none; it may be no choice at all. */
  readonly stored: string | null;
  /** The theme of the operating system. */
  readonly system: Theme;
  readonly defaultTheme: ThemeChoice;
  /** The theme `<html>` gets. */
  readonly expected: Theme;
}

/** Both the provider and the script are tested on these, so the script sets what the provider keeps. */
const THEME_CASES: readonly ThemeCase[] = [
  { stored: null, system: 'dark', defaultTheme: 'system', expected: 'dark' },
  { stored: null, system: 'light', defaultTheme: 'system', expected: 'light' },
  { stored: null, system: 'dark', defaultTheme: 'light', expected: 'light' },
  { stored: 'light', system: 'dark', defaultTheme: 'system', expected: 'light' },
  { stored: 'dark', system: 'light', defaultTheme: 'light', expected: 'dark' },
  { stored: 'system', system: 'light', defaultTheme: 'dark', expected: 'light' },
  { stored: 'system', system: 'dark', defaultTheme: 'light', expected: 'dark' },
  // A value that is no choice, such as a theme that no longer exists, is ignored.
  { stored: 'sepia', system: 'dark', defaultTheme: 'light', expected: 'light' },
  { stored: 'sepia', system: 'light', defaultTheme: 'system', expected: 'light' },
];

/** The color scheme of the operating system, as a test sets it. */
class SystemScheme extends EventTarget {
  matches: boolean;

  constructor(dark: boolean) {
    super();
    this.matches = dark;
  }

  /** Switch the color scheme and tell the listeners, as the browser does. */
  switch(dark: boolean): void {
    this.matches = dark;
    this.dispatchEvent(new Event('change'));
  }
}

/**
 * Replace `matchMedia` for one test: `(prefers-color-scheme: dark)` answers with a scheme the
 * test switches; any other query never matches.
 */
function stubSystem(system: Theme): SystemScheme {
  const scheme = new SystemScheme(system === 'dark');
  vi.stubGlobal('matchMedia', (query: string) =>
    query === '(prefers-color-scheme: dark)' ? scheme : new SystemScheme(false),
  );
  return scheme;
}

/** A `localStorage` that throws, as browsers do where storage is blocked. */
const BLOCKED_STORAGE = {
  getItem: (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
  setItem: (): never => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  },
};

/** Store `value` under the default key, as an earlier visit left it; `null` for nothing stored. */
function store(value: string | null): void {
  if (value === null) {
    localStorage.removeItem('contour-theme');
  } else {
    localStorage.setItem('contour-theme', value);
  }
}

/** Run `source` as an inline script of the page, the way the browser runs `themeScript()`. */
function runInlineScript(source: string): void {
  const script = document.createElement('script');
  script.textContent = source;
  // An inline script runs as it is inserted.
  document.head.append(script);
  script.remove();
}

/** Count the changes of the theme attribute of `<html>` from now on: call the result to read it. */
function watchTheme(): () => number {
  let changes = 0;
  const observer = new MutationObserver((records) => {
    changes += records.length;
  });
  observer.observe(root, { attributeFilter: ['data-theme'] });
  return () => {
    changes += observer.takeRecords().length;
    observer.disconnect();
    return changes;
  };
}

/** A background color token as the browser computes it under the current theme. */
function background(value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty('background-color', value);
  document.body.append(probe);
  const result = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return result;
}

/** The properties of the CSS transitions running on `element`. */
function transitionsOf(element: Element): string[] {
  return element
    .getAnimations()
    .filter((animation) => animation instanceof CSSTransition)
    .map((transition) => transition.transitionProperty);
}

const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/** What `useTheme` returns, as text, and a button for each choice. */
function ThemeProbe(): ReactElement {
  const { theme: choice, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <output aria-label="Choice">{choice ?? 'unknown'}</output>
      <output aria-label="Theme">{resolvedTheme ?? 'unknown'}</output>
      {CHOICES.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            setTheme(value);
          }}
        >
          {value}
        </button>
      ))}
      <button
        type="button"
        onClick={() => {
          // As JavaScript may call it, with a value that is no choice.
          Reflect.apply(setTheme, undefined, ['sepia']);
        }}
      >
        sepia
      </button>
    </div>
  );
}

/** A box whose background follows the theme, through a transition too slow to end in a test. */
function SlowBox(): ReactElement {
  return (
    <div
      data-testid="box"
      style={{
        blockSize: '1rem',
        backgroundColor: vars.color.bg.surface,
        transition: 'background-color 100s linear',
      }}
    />
  );
}

async function renderProvider(props: ThemeProviderProps = {}) {
  const screen = await render(
    <ThemeProvider {...props}>
      <ThemeProbe />
    </ThemeProvider>,
  );
  return {
    ...screen,
    choice: screen.getByRole('status', { name: 'Choice' }),
    resolved: screen.getByRole('status', { name: 'Theme' }),
    button: (choice: ThemeChoice) => screen.getByRole('button', { name: choice, exact: true }),
  };
}

afterEach(async () => {
  // Unmount first, so no provider sees the real globals come back.
  await cleanup();
  vi.unstubAllGlobals();
  localStorage.removeItem('contour-theme');
  localStorage.removeItem('app-theme');
  delete root.dataset['theme'];
  delete root.dataset['mode'];
});

describe('ThemeProvider', () => {
  test('follows the system theme until the user chooses, and stores nothing meanwhile', async () => {
    stubSystem('dark');
    const screen = await renderProvider();

    await expect.element(screen.choice).toHaveTextContent('system');
    await expect.element(screen.resolved).toHaveTextContent('dark');
    expect(theme()).toBe('dark');
    expect(localStorage.getItem('contour-theme')).toBeNull();
  });

  test.each(THEME_CASES)(
    'sets $expected with $stored stored, a $system system and the default $defaultTheme',
    async ({ stored, system, defaultTheme, expected }) => {
      stubSystem(system);
      store(stored);
      const screen = await renderProvider({ defaultTheme });

      await expect.element(screen.resolved).toHaveTextContent(expected);
      expect(theme()).toBe(expected);
    },
  );

  test('stores the choice in localStorage and restores it', async () => {
    stubSystem('dark');
    const first = await renderProvider();

    await userEvent.click(first.button('light'));
    await expect.poll(theme).toBe('light');
    expect(localStorage.getItem('contour-theme')).toBe('light');

    await first.unmount();
    delete root.dataset['theme'];
    const second = await renderProvider();

    await expect.element(second.choice).toHaveTextContent('light');
    expect(theme()).toBe('light');
  });

  test('ignores a value that is no choice', async () => {
    stubSystem('dark');
    const screen = await renderProvider({ defaultTheme: 'light' });

    await userEvent.click(screen.getByRole('button', { name: 'sepia' }));
    await expect.element(screen.choice).toHaveTextContent('light');
    expect(theme()).toBe('light');
    expect(localStorage.getItem('contour-theme')).toBeNull();
  });

  test('follows the system theme as it changes, while the choice is system', async () => {
    const system = stubSystem('dark');
    const screen = await renderProvider();

    system.switch(false);
    await expect.poll(theme).toBe('light');
    await expect.element(screen.resolved).toHaveTextContent('light');

    // A theme of the user's own stays whatever the system does.
    await userEvent.click(screen.button('dark'));
    await expect.poll(theme).toBe('dark');
    system.switch(true);
    system.switch(false);
    await expect.element(screen.resolved).toHaveTextContent('dark');

    await userEvent.click(screen.button('system'));
    await expect.poll(theme).toBe('light');
    await expect.element(screen.choice).toHaveTextContent('system');
  });

  test('stores under its storageKey and sets its attribute', async () => {
    stubSystem('dark');
    const screen = await renderProvider({ storageKey: 'app-theme', attribute: 'data-mode' });

    expect(root.dataset['mode']).toBe('dark');
    await userEvent.click(screen.button('light'));
    await expect.poll(() => root.dataset['mode']).toBe('light');
    expect(localStorage.getItem('app-theme')).toBe('light');
    expect(localStorage.getItem('contour-theme')).toBeNull();
    expect(theme()).toBeUndefined();
  });

  test('follows a choice made in another tab, and the default once another tab clears it', async () => {
    stubSystem('dark');
    const screen = await renderProvider();

    // Another tab writes the storage; this one hears of it through the storage event.
    localStorage.setItem('contour-theme', 'light');
    window.dispatchEvent(new StorageEvent('storage', { key: 'contour-theme', newValue: 'light' }));
    await expect.poll(theme).toBe('light');
    await expect.element(screen.choice).toHaveTextContent('light');

    localStorage.removeItem('contour-theme');
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    await expect.poll(theme).toBe('dark');
    await expect.element(screen.choice).toHaveTextContent('system');
  });

  test('keeps the choice for the page where the browser blocks the storage', async () => {
    stubSystem('dark');
    vi.stubGlobal('localStorage', BLOCKED_STORAGE);
    const screen = await renderProvider({ defaultTheme: 'light' });

    expect(theme()).toBe('light');
    await userEvent.click(screen.button('dark'));
    await expect.poll(theme).toBe('dark');
    await expect.element(screen.choice).toHaveTextContent('dark');
  });

  test('switches every color at once, with transitions off, and turns them back on', async () => {
    stubSystem('dark');
    const screen = await render(
      <ThemeProvider>
        <ThemeProbe />
        <SlowBox />
      </ThemeProvider>,
    );
    const box = screen.getByTestId('box').element();
    const sheets = document.adoptedStyleSheets.length;

    await userEvent.click(screen.getByRole('button', { name: 'light', exact: true }));
    await expect.poll(theme).toBe('light');

    expect(getComputedStyle(box).backgroundColor).toBe(background(vars.color.bg.surface));
    expect(transitionsOf(box)).toStrictEqual([]);
    expect(document.adoptedStyleSheets).toHaveLength(sheets);
    // Any other change transitions again.
    box.style.backgroundColor = 'rgb(1, 2, 3)';
    expect(transitionsOf(box)).toStrictEqual(['background-color']);
  });

  test('lets transitions run with disableTransitionOnChange={false}', async () => {
    stubSystem('dark');
    const screen = await render(
      <ThemeProvider disableTransitionOnChange={false}>
        <ThemeProbe />
        <SlowBox />
      </ThemeProvider>,
    );
    const box = screen.getByTestId('box').element();

    await userEvent.click(screen.getByRole('button', { name: 'light', exact: true }));
    await expect.poll(theme).toBe('light');

    expect(transitionsOf(box)).toStrictEqual(['background-color']);
  });

  test('keeps the theme the inline script set, without touching the attribute', async () => {
    stubSystem('dark');
    store('light');
    runInlineScript(themeScript());
    const changes = watchTheme();
    const screen = await renderProvider();

    await expect.element(screen.choice).toHaveTextContent('light');
    expect(theme()).toBe('light');
    expect(changes()).toBe(0);
  });

  test('knows no theme on the server and in hydration, then the stored one, without a mismatch', async () => {
    stubSystem('dark');
    store('light');
    const app = (
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    );
    const html = renderToString(app);
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.append(container);
    const outputs = (): Array<string | null> =>
      [...container.querySelectorAll('output')].map((output) => output.textContent);
    const rendered = outputs();
    runInlineScript(themeScript());
    const changes = watchTheme();
    const errors: unknown[] = [];
    // A mismatch would be a recoverable error: React renders the tree again in the browser.
    const reactRoot = hydrateRoot(container, app, {
      onRecoverableError: (error) => {
        errors.push(error);
      },
    });

    try {
      expect(rendered).toStrictEqual(['unknown', 'unknown']);
      await expect.poll(outputs).toStrictEqual(['light', 'light']);
      expect(errors).toStrictEqual([]);
      expect(theme()).toBe('light');
      expect(changes()).toBe(0);
    } finally {
      reactRoot.unmount();
      container.remove();
    }
  });

  test('leaves the theme to the outer provider when nested in one', async () => {
    stubSystem('dark');
    const screen = await render(
      <ThemeProvider defaultTheme="light">
        <ThemeProvider defaultTheme="dark" storageKey="app-theme" attribute="data-mode">
          <ThemeProbe />
        </ThemeProvider>
      </ThemeProvider>,
    );

    await expect.element(screen.getByRole('status', { name: 'Choice' })).toHaveTextContent('light');
    expect(theme()).toBe('light');
    expect(root.dataset['mode']).toBeUndefined();

    await userEvent.click(screen.getByRole('button', { name: 'dark', exact: true }));
    await expect.poll(theme).toBe('dark');
    expect(localStorage.getItem('contour-theme')).toBe('dark');
    expect(localStorage.getItem('app-theme')).toBeNull();
  });
});

describe('useTheme', () => {
  test('throws outside a ThemeProvider', () => {
    expect(() => renderToString(<ThemeProbe />)).toThrow(
      'useTheme: render the component inside <ThemeProvider>.',
    );
  });
});

describe('themeScript', () => {
  test.each(THEME_CASES)(
    'sets $expected with $stored stored, a $system system and the default $defaultTheme',
    ({ stored, system, defaultTheme, expected }) => {
      stubSystem(system);
      store(stored);
      runInlineScript(themeScript({ defaultTheme }));

      expect(theme()).toBe(expected);
    },
  );

  test('reads its storageKey and sets its attribute', () => {
    stubSystem('dark');
    localStorage.setItem('app-theme', 'light');
    store('dark');
    runInlineScript(themeScript({ storageKey: 'app-theme', attribute: 'data-mode' }));

    expect(root.dataset['mode']).toBe('light');
    expect(theme()).toBeUndefined();
  });

  test('applies the default where the browser blocks the storage', () => {
    stubSystem('light');
    vi.stubGlobal('localStorage', BLOCKED_STORAGE);

    runInlineScript(themeScript());
    expect(theme()).toBe('light');
    runInlineScript(themeScript({ defaultTheme: 'dark' }));
    expect(theme()).toBe('dark');
  });

  test('resolves the system theme to the default of the stylesheet without matchMedia', () => {
    vi.stubGlobal('matchMedia', undefined);

    runInlineScript(themeScript());
    expect(theme()).toBe('dark');
  });

  test('keeps a `</script>` in its settings from ending the script element', () => {
    stubSystem('dark');
    const storageKey = '</script><script>alert(1)</script>';
    const source = themeScript({ storageKey });
    const parsed = new DOMParser().parseFromString(`<script>${source}</script>`, 'text/html');

    expect(parsed.querySelectorAll('script')).toHaveLength(1);
    expect(parsed.querySelector('script')?.textContent).toBe(source);
    localStorage.setItem(storageKey, 'light');
    try {
      runInlineScript(source);
      expect(theme()).toBe('light');
    } finally {
      localStorage.removeItem(storageKey);
    }
  });
});

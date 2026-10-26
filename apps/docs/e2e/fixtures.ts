import { expect, test as base } from '@playwright/test';
import type { Page, Response } from '@playwright/test';

export { expect };

interface ConsoleOptions {
  /**
   * Console errors and warnings the test expects, such as the browser's report of a 404
   * response: any other one fails it.
   */
  readonly expectedConsole: readonly RegExp[];
}

interface ConsoleFixtures {
  /** Fails the test on an uncaught error in the page, or an unexpected console error or warning. */
  readonly consoleCheck: undefined;
}

/** Playwright's `test`, failing on errors in the page: hydration mismatches show up there. */
export const test = base.extend<ConsoleFixtures & ConsoleOptions>({
  expectedConsole: [[], { option: true }],
  consoleCheck: [
    async ({ page, expectedConsole }, use) => {
      const problems: string[] = [];
      page.on('console', (message) => {
        const type = message.type();
        const text = message.text();
        if (
          (type === 'error' || type === 'warning') &&
          !expectedConsole.some((pattern) => pattern.test(text))
        ) {
          problems.push(`${type}: ${text}`);
        }
      });
      page.on('pageerror', (error) => {
        problems.push(`uncaught: ${error.message}`);
      });
      await use(undefined);
      expect(problems, 'errors in the browser console').toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Open `url` once React has hydrated it. `page.goto` returns on `load`, before React hydrates
 * the prerendered HTML, and input sent before that is lost. A hydrated page requests nothing
 * more, so a quiet network means the page responds.
 */
export function openPage(page: Page, url: string): Promise<Response | null> {
  return page.goto(url, { waitUntil: 'networkidle' });
}

/** Reload the page, and wait for the hydration as {@link openPage} does. */
export function reloadPage(page: Page): Promise<Response | null> {
  return page.reload({ waitUntil: 'networkidle' });
}

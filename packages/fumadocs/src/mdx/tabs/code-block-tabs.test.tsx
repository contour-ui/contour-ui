import { vars } from '@contour-ui/tokens';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { CodeExample, INSTALL_CODE } from '../../test-utils/mdx.tsx';
import { FrameworkTabs, PackageInstall } from '../../test-utils/tabs.tsx';
import { Prose, Tab, Tabs } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../../styles.css';
import '@contour-ui/react/styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** The vertical middle of an element on the page. */
function middle(element: Element): number {
  const { top, height } = element.getBoundingClientRect();
  return top + height / 2;
}

/** The only element of `selector` in `scope`, the document by default. */
function only(selector: string, scope: ParentNode = document): HTMLElement {
  const [element, ...others] = scope.querySelectorAll<HTMLElement>(selector);
  if (element === undefined || others.length > 0) {
    throw new Error(
      `${String(others.length + (element === undefined ? 0 : 1))} elements match ${selector}.`,
    );
  }
  return element;
}

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('CodeBlockTabs', () => {
  it('shows the code of the default tab, then of the tab the reader selects', async () => {
    await render(<PackageInstall packages="@contour-ui/react" />);
    const tabs = page.getByRole('tab');

    await expect.element(tabs.nth(0)).toHaveTextContent('npm');
    expect(tabs.elements().map((element) => element.textContent)).toStrictEqual([
      'npm',
      'pnpm',
      'yarn',
      'bun',
    ]);
    await expect.element(page.getByText('npm install @contour-ui/react')).toBeVisible();

    await userEvent.click(page.getByRole('tab', { name: 'pnpm' }));
    await expect.element(page.getByText('pnpm add @contour-ui/react')).toBeVisible();
    await expect.element(page.getByText('npm install @contour-ui/react')).not.toBeVisible();
  });

  it('draws one frame, the code under the row of triggers without a border of its own', async () => {
    await render(<PackageInstall packages="@contour-ui/react" />);
    await expect.element(page.getByRole('tab', { name: 'npm' })).toBeVisible();
    const frame = getComputedStyle(only('.contour-docs-code-tabs'));
    const shown = only('.contour-docs-code-tabs__content:not([hidden]) > .contour-code-block');

    // A probe without a border style computes no border width: its width tells the length.
    expect(frame.borderTopWidth).toBe(computed('width', vars['border-width'].default));
    expect(frame.backgroundColor).toBe(computed('background-color', vars.color.bg.inset));
    expect(getComputedStyle(shown).borderTopWidth).toBe('0px');
    // The code starts at a panel's inset: the copy button is in the row of triggers.
    expect(getComputedStyle(only('pre', shown)).paddingTop).toBe(
      computed('padding-top', vars.space['panel-inset']),
    );
  });

  it('keeps the copy button of the code shown, at the end of the row of triggers', async () => {
    await render(<PackageInstall packages="@contour-ui/react" />);
    const copy = page.getByRole('button', { name: 'Copy code' });
    await expect.element(copy).toBeVisible();
    // The buttons of the hidden tabs are hidden with them.
    expect(page.getByRole('button', { name: 'Copy code', includeHidden: true }).all()).toHaveLength(
      4,
    );
    const button = copy.element();
    const last = page.getByRole('tab').last().element();

    expect(Math.abs(middle(button) - middle(last))).toBeLessThanOrEqual(1);
    expect(last.getBoundingClientRect().right).toBeLessThan(button.getBoundingClientRect().left);
    expect(button.closest('.contour-docs-code-tabs__content')).not.toBeNull();
  });

  it('leads from the trigger to the copy button and the code, in the Tab order', async () => {
    await render(<PackageInstall packages="@contour-ui/react" />);
    await userEvent.click(page.getByRole('tab', { name: 'yarn' }));

    await userEvent.tab();
    await expect.element(page.getByRole('button', { name: 'Copy code' })).toHaveFocus();
    await userEvent.tab();
    expect(document.activeElement).toBe(
      only('.contour-docs-code-tabs__content:not([hidden]) .contour-code-block__content'),
    );
  });

  it('keeps the header of a code block with a title, with its copy button, under the row', async () => {
    await render(<FrameworkTabs />);
    await userEvent.click(page.getByRole('tab', { name: 'Next.js' }));
    const figure = page.getByRole('figure', { name: 'app/layout.tsx' });

    await expect.element(figure).toBeVisible();
    const copy = figure.getByRole('button', { name: 'Copy code' }).element();
    expect(copy.closest('figcaption')).not.toBeNull();
    expect(middle(copy)).toBeGreaterThan(
      middle(page.getByRole('tab', { name: 'Next.js' }).element()),
    );
  });

  it('selects the same tab in the blocks of its group, and remembers it', async () => {
    await render(
      <>
        <FrameworkTabs groupId="framework" persist />
        <FrameworkTabs groupId="framework" persist />
      </>,
    );

    await userEvent.click(page.getByRole('tab', { name: 'Next.js' }).first());
    await expect
      .element(page.getByRole('tab', { name: 'Next.js' }).last())
      .toHaveAttribute('aria-selected', 'true');
    expect(localStorage.getItem('framework')).toBe('Next.js');
  });
});

describe('a code block alone in a tab of Tabs', () => {
  it('fills the panel, and its copy button moves up to the row of triggers', async () => {
    await render(
      <Prose>
        <Tabs items={['pnpm', 'npm']}>
          <Tab>
            <CodeExample lines={INSTALL_CODE} />
          </Tab>
          <Tab>
            <p>Text</p>
          </Tab>
        </Tabs>
      </Prose>,
    );
    const copy = page.getByRole('button', { name: 'Copy code' });
    await expect.element(copy).toBeVisible();
    const panel = only('.contour-docs-tabs__content:not([hidden])');

    expect(getComputedStyle(panel).paddingTop).toBe('0px');
    expect(getComputedStyle(only('.contour-code-block')).borderTopWidth).toBe('0px');
    expect(
      Math.abs(middle(copy.element()) - middle(page.getByRole('tab', { name: 'pnpm' }).element())),
    ).toBeLessThanOrEqual(1);

    // A panel of text keeps its inset.
    await userEvent.click(page.getByRole('tab', { name: 'npm' }));
    expect(getComputedStyle(only('.contour-docs-tabs__content:not([hidden])')).paddingTop).toBe(
      computed('padding-top', vars.space['panel-inset']),
    );
  });
});

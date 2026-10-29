import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Tab, Tabs, TabsContent, TabsList, TabsTrigger } from '../index.ts';
import type { TabsProps } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../../styles.css';
import '@contour-ui/kit/styles.css';

/** The tab `name` of the list labeled `list`, or of the page. */
const tab = (name: string, list?: string) =>
  (list === undefined ? page : page.getByRole('tablist', { name: list })).getByRole('tab', {
    name,
    exact: true,
  });

const PACKAGE_MANAGERS = ['npm', 'pnpm', 'yarn'];

/** Tabs of package managers, a panel each, with the props given. */
function Managers({ items = PACKAGE_MANAGERS, ...props }: TabsProps) {
  return (
    <Tabs items={items} {...props}>
      {items.map((item) => (
        <Tab key={item} value={item}>
          {`Install with ${item}`}
        </Tab>
      ))}
    </Tabs>
  );
}

/** Leave the address as the test found it: no fragment, no state. */
function clearAddress(): void {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  clearAddress();
  vi.restoreAllMocks();
});

describe('Tabs', () => {
  it('makes a trigger of each item, and shows the panel of the first one', async () => {
    await render(<Managers />);

    await expect.element(tab('npm')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByText('Install with npm')).toBeVisible();
    await expect.element(page.getByText('Install with pnpm')).not.toBeVisible();

    await userEvent.click(tab('pnpm'));
    await expect.element(page.getByRole('tabpanel')).toHaveTextContent('Install with pnpm');
    await expect.element(page.getByText('Install with npm')).not.toBeVisible();
  });

  it('selects the item of defaultIndex, or of defaultValue, at first', async () => {
    await render(
      <>
        <Managers label="By index" defaultIndex={2} />
        <Managers label="By value" defaultValue="pnpm" />
      </>,
    );

    await expect.element(tab('yarn', 'By index')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('pnpm', 'By value')).toHaveAttribute('aria-selected', 'true');
  });

  it('names the list of tabs with its label', async () => {
    await render(<Managers label="Package manager" />);

    await expect.element(page.getByRole('tablist', { name: 'Package manager' })).toBeVisible();
    await expect.element(page.getByText('Package manager')).toHaveClass('contour-docs-tabs__label');
  });

  it('gives a Tab without value the item of its place', async () => {
    await render(
      <Tabs items={['First', 'Second']}>
        <Tab>One</Tab>
        <Tab>Two</Tab>
      </Tabs>,
    );

    await userEvent.click(tab('Second'));
    await expect.element(page.getByRole('tabpanel')).toHaveTextContent('Two');
  });

  it('asks for a value where a Tab has none to take', () => {
    expect(() =>
      renderToString(
        <Tabs>
          <Tab>One</Tab>
        </Tabs>,
      ),
    ).toThrow(/give it a value/u);
  });

  it('builds tabs part by part without items', async () => {
    await render(
      <Tabs defaultValue="b">
        <TabsList aria-label="Letters">
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Letter a</TabsContent>
        <TabsContent value="b">Letter b</TabsContent>
      </Tabs>,
    );

    await expect.element(tab('B', 'Letters')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByText('Letter b')).toBeVisible();
    await expect.element(page.getByText('Letter a')).not.toBeVisible();
  });

  it('follows the arrow keys, as Kit tabs do', async () => {
    await render(<Managers />);
    await userEvent.click(tab('npm'));

    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tab('pnpm')).toHaveFocus();
    await expect.element(tab('pnpm')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Tabs of a group', () => {
  it('select the same tab together, and those without it keep theirs', async () => {
    await render(
      <>
        <Managers label="First" groupId="manager" />
        <Managers label="Second" groupId="manager" items={['pnpm', 'npm']} />
        <Managers label="Other" groupId="manager" items={['bun', 'deno']} />
        <Managers label="Alone" />
      </>,
    );
    await expect.element(tab('pnpm', 'Second')).toHaveAttribute('aria-selected', 'true');

    // The second has no yarn: it keeps its tab.
    await userEvent.click(tab('yarn', 'First'));
    await expect.element(tab('yarn', 'First')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('pnpm', 'Second')).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(tab('npm', 'First'));
    await expect.element(tab('npm', 'Second')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('bun', 'Other')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('npm', 'Alone')).toHaveAttribute('aria-selected', 'true');

    // Any of them leads.
    await userEvent.click(tab('pnpm', 'Second'));
    await expect.element(tab('pnpm', 'First')).toHaveAttribute('aria-selected', 'true');
  });

  it('follow the keyboard too', async () => {
    await render(
      <>
        <Managers label="First" groupId="manager" />
        <Managers label="Second" groupId="manager" />
      </>,
    );
    await userEvent.click(tab('npm', 'First'));

    await userEvent.keyboard('{End}');
    await expect.element(tab('yarn', 'Second')).toHaveAttribute('aria-selected', 'true');
  });

  it('remember the tab for the session, and across visits with persist', async () => {
    await render(
      <>
        <Managers label="Session" groupId="session-group" />
        <Managers label="Visits" groupId="visit-group" persist />
      </>,
    );

    await userEvent.click(tab('pnpm', 'Session'));
    await userEvent.click(tab('yarn', 'Visits'));
    expect(sessionStorage.getItem('session-group')).toBe('pnpm');
    expect(localStorage.getItem('session-group')).toBeNull();
    expect(sessionStorage.getItem('visit-group')).toBe('yarn');
    expect(localStorage.getItem('visit-group')).toBe('yarn');
  });

  it('start on the tab the session remembers, before the one of earlier visits', async () => {
    sessionStorage.setItem('manager', 'pnpm');
    localStorage.setItem('manager', 'yarn');
    localStorage.setItem('remembered', 'yarn');
    await render(
      <>
        <Managers label="Session" groupId="manager" persist />
        <Managers label="Visits" groupId="remembered" persist />
        <Managers label="Without persist" groupId="remembered" />
      </>,
    );

    await expect.element(tab('pnpm', 'Session')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('yarn', 'Visits')).toHaveAttribute('aria-selected', 'true');
    await expect.element(tab('npm', 'Without persist')).toHaveAttribute('aria-selected', 'true');
  });

  it('ignore a remembered tab they do not have', async () => {
    sessionStorage.setItem('manager', 'deno');
    await render(<Managers groupId="manager" />);

    await expect.element(tab('npm')).toHaveAttribute('aria-selected', 'true');
  });

  it('work where the browser blocks the storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    await render(
      <>
        <Managers label="First" groupId="manager" persist />
        <Managers label="Second" groupId="manager" persist />
      </>,
    );

    await userEvent.click(tab('yarn', 'First'));
    await expect.element(tab('yarn', 'Second')).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Tabs and the address', () => {
  it('open the tab whose id the address names, and scroll the tabs into view', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    window.history.replaceState(null, '', '#install-yarn');
    const screen = await render(
      <Tabs items={['npm', 'yarn']}>
        <Tab id="install-npm">npm install</Tab>
        <Tab id="install-yarn">yarn add</Tab>
      </Tabs>,
    );

    await expect.element(tab('yarn')).toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByText('yarn add')).toBeVisible();
    await expect
      .poll(() => scrolled.mock.contexts.at(-1))
      .toBe(screen.container.querySelector('.contour-docs-tabs'));
  });

  it('open the tab that holds the element the address points at, as it changes', async () => {
    const scrolled = vi.spyOn(Element.prototype, 'scrollIntoView');
    await render(
      <Tabs items={['npm', 'yarn']}>
        <Tab>npm install</Tab>
        <Tab>
          <p id="yarn-workspaces">Workspaces</p>
        </Tab>
      </Tabs>,
    );
    await expect.element(tab('npm')).toHaveAttribute('aria-selected', 'true');

    window.location.hash = '#yarn-workspaces';
    await expect.element(tab('yarn')).toHaveAttribute('aria-selected', 'true');
    const target = document.querySelector('#yarn-workspaces');
    await expect.poll(() => scrolled.mock.contexts.at(-1)).toBe(target);
  });

  it('win over the tab the group remembers', async () => {
    sessionStorage.setItem('manager', 'npm');
    window.history.replaceState(null, '', '#install-yarn');
    await render(
      <Tabs items={['npm', 'yarn']} groupId="manager" defaultValue="yarn">
        <Tab>npm install</Tab>
        <Tab id="install-yarn">yarn add</Tab>
      </Tabs>,
    );

    await expect.element(tab('yarn')).toHaveAttribute('aria-selected', 'true');
  });

  it('write the id of the tab the reader selects, with updateAnchor, keeping the history state', async () => {
    window.history.replaceState({ router: 'state' }, '');
    await render(
      <>
        <Tabs items={['npm', 'yarn']} label="Anchored" updateAnchor>
          <Tab id="with-npm">npm install</Tab>
          <Tab id="with-yarn">yarn add</Tab>
        </Tabs>
        <Tabs items={['npm', 'yarn']} label="Plain">
          <Tab id="plain-npm">npm install</Tab>
          <Tab id="plain-yarn">yarn add</Tab>
        </Tabs>
      </>,
    );

    await userEvent.click(tab('yarn', 'Anchored'));
    expect(window.location.hash).toBe('#with-yarn');
    expect(window.history.state).toStrictEqual({ router: 'state' });

    await userEvent.click(tab('yarn', 'Plain'));
    expect(window.location.hash).toBe('#with-yarn');
  });

  it('leave the address alone for a tab without an id', async () => {
    await render(
      <Tabs items={['npm', 'yarn']} updateAnchor>
        <Tab>npm install</Tab>
        <Tab>yarn add</Tab>
      </Tabs>,
    );

    await userEvent.click(tab('yarn'));
    expect(window.location.hash).toBe('');
  });
});

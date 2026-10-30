import type { toc } from '@contour-ui/core';
import type { CSSProperties, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Toc } from '../index.ts';

interface Section extends toc.Item {
  readonly title: string;
  /** The height of the section, its heading included, in pixels. */
  readonly height: number;
}

/**
 * The sections of a test page. With 30px headings in a 300px scroll container, the observed
 * area runs from 20px to 180px: the short `install` section puts two headings in it at once.
 * Headings start at 0, 600, 700, 1300 and 1900px; the article scrolls up to 2200px.
 */
const sections: readonly Section[] = [
  { value: 'intro', depth: 2, title: 'Introduction', height: 600 },
  { value: 'install', depth: 2, title: 'Install', height: 100 },
  { value: 'npm', depth: 3, title: 'With npm', height: 600 },
  { value: 'usage', depth: 2, title: 'Usage', height: 600 },
  { value: 'api', depth: 2, title: 'API', height: 600 },
];

const items: readonly toc.Item[] = sections.map(({ value, depth }) => ({ value, depth }));

/** The element with this id; the test fails without one. */
function byId(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element === null) {
    throw new Error(`Nothing has the id ${id}.`);
  }
  return element;
}

/** The element of a toc part in `container`; the test fails without one. */
function part(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-scope="toc"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No toc ${name}.`);
  }
  return element;
}

/** The item at `index` in the root; the test fails without one. */
function itemAt(root: Element, index: number): HTMLElement {
  const item = root.querySelectorAll<HTMLElement>('li')[index];
  if (item === undefined) {
    throw new Error(`There is no item ${index}.`);
  }
  return item;
}

/** Make the page answer that the user prefers reduced motion, until the mocks are restored. */
function preferReducedMotion(): void {
  const matchMedia = window.matchMedia.bind(window);
  // A query that always matches stands in for the preference.
  vi.spyOn(window, 'matchMedia').mockImplementation((query) =>
    matchMedia(query === '(prefers-reduced-motion: reduce)' ? '(min-width: 0px)' : query),
  );
}

interface ArticleProps {
  /** A scroll container of its own (300px high), or sections in the page. */
  readonly scrolls?: boolean | undefined;
  /** The height of an introduction before the first heading, in pixels. */
  readonly lead?: number | undefined;
}

/** The sections of the page, each with a 30px heading at its top. */
function Article({ scrolls = true, lead = 0 }: ArticleProps): ReactElement {
  const content = (
    <>
      {lead > 0 ? <p style={{ height: lead, margin: 0 }}>Before the first heading.</p> : null}
      {sections.map(({ value, title, height }) => (
        <section key={value} style={{ height }}>
          <h2 id={value} style={{ height: 30, margin: 0 }}>
            {title}
          </h2>
        </section>
      ))}
    </>
  );
  return scrolls ? (
    <section
      id="article"
      aria-label="Article"
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scroll container takes focus, so the keyboard can scroll it.
      tabIndex={0}
      style={{ height: 300, overflow: 'auto' }}
    >
      {content}
    </section>
  ) : (
    <div>{content}</div>
  );
}

/** A table of contents of the sections: instant scrolling, in the article by default. */
function Contents(props: Partial<Toc.RootProps>): ReactElement {
  return (
    <Toc.Root
      items={items}
      scrollEl={() => document.querySelector<HTMLElement>('#article')}
      scrollBehavior="auto"
      style={{ position: 'relative' }}
      {...props}
    >
      <Toc.Title>On this page</Toc.Title>
      <Toc.Indicator />
      <Toc.List>
        {sections.map(({ value, depth, title }) => (
          <Toc.Item key={value} item={{ value, depth }}>
            <Toc.Link>{title}</Toc.Link>
          </Toc.Item>
        ))}
      </Toc.List>
    </Toc.Root>
  );
}

/** The table of contents next to the article. */
function Page(props: Partial<Toc.RootProps> & ArticleProps): ReactElement {
  const { scrolls, lead, ...rest } = props;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      <Contents {...rest} />
      <Article scrolls={scrolls} lead={lead} />
    </div>
  );
}

/** Scroll the article at once; the observers see it on the next frame. */
function scrollArticle(top: number): void {
  byId('article').scrollTop = top;
}

const initialUrl = location.href;

afterEach(() => {
  vi.restoreAllMocks();
  history.replaceState(history.state, '', initialUrl);
  window.scrollTo(0, 0);
});

describe('Toc', () => {
  it('renders its parts with their attributes, named by the title', async () => {
    const screen = await render(<Page />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    const link = screen.getByRole('link', { name: 'With npm' });
    const item = screen.getByRole('listitem').nth(2);

    await expect.element(nav).toHaveAttribute('data-scope', 'toc');
    await expect.element(nav).toHaveAttribute('data-part', 'root');
    await expect.element(screen.getByText('On this page')).toHaveAttribute('data-part', 'title');
    await expect.element(screen.getByRole('list')).toHaveAttribute('data-part', 'list');
    await expect.element(item).toHaveAttribute('data-part', 'item');
    await expect.element(item).toHaveAttribute('data-value', 'npm');
    await expect.element(item).toHaveAttribute('data-depth', '3');
    await expect.element(link).toHaveAttribute('data-part', 'link');
    await expect.element(link).toHaveAttribute('href', '#npm');
    const indicator = part(screen.container, 'indicator');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
  });

  it('highlights the sections in the observed area as the article scrolls', async () => {
    const screen = await render(<Page />);
    const link = (name: string) => screen.getByRole('link', { name });

    // At the top: the introduction.
    await expect.element(link('Introduction')).toHaveAttribute('data-active', '');
    await expect.element(link('Introduction')).toHaveAttribute('aria-current', 'true');
    await expect.element(screen.getByRole('listitem').first()).toHaveAttribute('data-active', '');

    // Two headings in the area: both are active, the first one is current.
    scrollArticle(560);
    await expect.element(link('With npm')).toHaveAttribute('data-active');
    await expect.element(link('Install')).toHaveAttribute('data-active');
    await expect.element(link('Install')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('With npm')).not.toHaveAttribute('aria-current');
    await expect.element(link('Introduction')).not.toHaveAttribute('data-active');

    // `install` scrolled past: only `npm` is left in the area.
    scrollArticle(680);
    await expect.element(link('Install')).not.toHaveAttribute('data-active');
    await expect.element(link('With npm')).toHaveAttribute('aria-current', 'true');
  });

  it('keeps the last heading scrolled past active, also after a jump past several', async () => {
    const screen = await render(<Page />);
    const link = (name: string) => screen.getByRole('link', { name });
    await expect.element(link('Introduction')).toHaveAttribute('data-active');

    // Into the introduction, where no heading is in the area.
    scrollArticle(300);
    await expect.element(link('Introduction')).toHaveAttribute('aria-current', 'true');

    // From the introduction to the middle of `usage` in one step: the headings in between never
    // were in the area.
    scrollArticle(1500);
    await expect.element(link('Usage')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('Introduction')).not.toHaveAttribute('data-active');

    // And back to the top.
    scrollArticle(0);
    await expect.element(link('Introduction')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('Usage')).not.toHaveAttribute('data-active');
  });

  it('activates nothing, and hides the indicator, before the first heading', async () => {
    const screen = await render(<Page lead={400} />);
    const intro = screen.getByRole('link', { name: 'Introduction' });
    const indicator = part(screen.container, 'indicator');

    // The first heading starts at 400px, below the area.
    scrollArticle(300);
    await expect.element(intro).toHaveAttribute('data-active');
    expect(indicator).not.toHaveAttribute('hidden');

    scrollArticle(0);
    await expect.element(intro).not.toHaveAttribute('data-active');
    expect(screen.container.querySelector('[data-active]')).toBeNull();
    await expect.element(indicator).toHaveAttribute('hidden');
  });

  it('places the indicator around the active items, relative to the root', async () => {
    const screen = await render(<Page />);
    const root = screen.getByRole('navigation').element();
    const indicator = part(screen.container, 'indicator');
    const installItem = itemAt(root, 1);
    const npmItem = itemAt(root, 2);
    const top = (element: Element): number =>
      element.getBoundingClientRect().top - root.getBoundingClientRect().top - root.clientTop;

    scrollArticle(560);
    await expect
      .poll(() => indicator.style.getPropertyValue('--top'))
      .toBe(`${top(installItem)}px`);
    const height = npmItem.getBoundingClientRect().bottom - installItem.getBoundingClientRect().top;
    expect(indicator.style.getPropertyValue('--height')).toBe(`${height}px`);
    expect(indicator.style.getPropertyValue('--width')).toBe(
      `${installItem.getBoundingClientRect().width}px`,
    );
    expect(indicator).not.toHaveAttribute('hidden');

    scrollArticle(1500);
    await expect
      .poll(() => indicator.style.getPropertyValue('--top'))
      .toBe(`${top(itemAt(root, 3))}px`);
  });

  it('hides the indicator while the list is not laid out, then shows it in place, not sliding', async () => {
    // As the styled Toc styles it: the indicator slides to the active items.
    const sliding: CSSProperties = {
      position: 'absolute',
      insetBlockStart: 0,
      inlineSize: 2,
      blockSize: 'var(--height)',
      translate: '0 var(--top)',
      transition: 'translate 1s linear, block-size 1s linear',
    };
    await render(
      <>
        <div id="closed" style={{ display: 'none' }}>
          <Toc.Root
            items={items}
            scrollEl={() => document.querySelector<HTMLElement>('#article')}
            style={{ position: 'relative' }}
          >
            <Toc.Indicator style={sliding} />
            <Toc.List>
              {sections.map(({ value, depth, title }) => (
                <Toc.Item key={value} item={{ value, depth }}>
                  <Toc.Link>{title}</Toc.Link>
                </Toc.Item>
              ))}
            </Toc.List>
          </Toc.Root>
        </div>
        <Article />
      </>,
    );
    const closed = byId('closed');
    const indicator = part(closed, 'indicator');
    const usage = itemAt(closed, 3);

    scrollArticle(1300);
    await expect.poll(() => usage.dataset['active']).toBe('');
    // Active, but its item has no box to measure.
    expect(indicator).toHaveAttribute('hidden');

    closed.style.display = 'block';
    await expect.poll(() => indicator.hidden).toBe(false);
    // In place at once: no transition from an earlier box.
    expect(indicator.getAnimations()).toHaveLength(0);
    expect(indicator.getBoundingClientRect().top).toBe(usage.getBoundingClientRect().top);

    // Then it slides to the next active items, as before.
    scrollArticle(1900);
    await expect.poll(() => indicator.getAnimations().length).toBeGreaterThan(0);
  });

  it('scrolls to the heading of a clicked link, focuses it and puts its id in the address', async () => {
    const screen = await render(<Page />);
    const entries = history.length;

    await userEvent.click(screen.getByRole('link', { name: 'Usage' }));
    expect(byId('article').scrollTop).toBe(1300);
    expect(location.hash).toBe('#usage');
    // Replaced, not pushed: Back leaves the page instead of walking through the headings.
    expect(history.length).toBe(entries);
    expect(document.activeElement).toBe(byId('usage'));
    expect(byId('usage')).toHaveAttribute('tabindex', '-1');
    await expect
      .element(screen.getByRole('link', { name: 'Usage' }))
      .toHaveAttribute('aria-current', 'true');

    // The heading takes focus only until it loses it.
    await userEvent.click(screen.getByRole('link', { name: 'Install' }));
    expect(byId('article').scrollTop).toBe(600);
    expect(location.hash).toBe('#install');
    expect(byId('usage')).not.toHaveAttribute('tabindex');
    expect(document.activeElement).toBe(byId('install'));
  });

  it('does nothing when a click handler prevents the default', async () => {
    const screen = await render(
      <>
        <Toc.Root items={items} scrollEl={() => document.querySelector<HTMLElement>('#article')}>
          <Toc.List>
            <Toc.Item item={{ value: 'usage', depth: 2 }}>
              <Toc.Link
                onClick={(event) => {
                  event.preventDefault();
                }}
              >
                Usage
              </Toc.Link>
            </Toc.Item>
          </Toc.List>
        </Toc.Root>
        <Article />
      </>,
    );

    await userEvent.click(screen.getByRole('link', { name: 'Usage' }));
    expect(byId('article').scrollTop).toBe(0);
    expect(location.href).toBe(initialUrl);
  });

  it('scrolls smoothly, unless the user prefers reduced motion', async () => {
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo').mockImplementation(() => {});
    const screen = await render(<Page scrollBehavior={undefined} />);

    await userEvent.click(screen.getByRole('link', { name: 'Usage' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1300, behavior: 'smooth' });

    preferReducedMotion();
    await userEvent.click(screen.getByRole('link', { name: 'API' }));
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1900, behavior: 'auto' });
  });

  it('keeps the first active item in view in its own scroll container, not scrolling the page', async () => {
    const screen = await render(
      <>
        <Article />
        {/* Far below the fold: scrolling every ancestor would scroll the page to it. */}
        <div style={{ height: 2000 }} />
        <section aria-label="Contents" style={{ height: 60, overflow: 'auto' }}>
          <Contents />
        </section>
      </>,
    );
    const panel = screen.getByRole('region', { name: 'Contents' }).element();
    const api = screen.getByRole('link', { name: 'API' });

    scrollArticle(1900);
    await expect.element(api).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => panel.scrollTop).toBeGreaterThan(0);
    const item = api.element().getBoundingClientRect();
    const box = panel.getBoundingClientRect();
    expect(item.top).toBeGreaterThanOrEqual(box.top);
    expect(item.bottom).toBeLessThanOrEqual(box.bottom);
    expect(window.scrollY).toBe(0);
  });

  it('leaves its scroll container alone without autoScroll', async () => {
    const screen = await render(
      <>
        <Article />
        <section aria-label="Contents" style={{ height: 60, overflow: 'auto' }}>
          <Contents autoScroll={false} />
        </section>
      </>,
    );
    const panel = screen.getByRole('region', { name: 'Contents' }).element();

    scrollArticle(1900);
    await expect
      .element(screen.getByRole('link', { name: 'API' }))
      .toHaveAttribute('aria-current', 'true');
    expect(panel.scrollTop).toBe(0);
  });

  it('scrolls its own scroll container to the first active item, at once, when the list is laid out', async () => {
    const scrollTo = vi.spyOn(Element.prototype, 'scrollTo');
    await render(
      <>
        <Article />
        {/* Far below the fold: scrolling every ancestor would scroll the page to it. */}
        <div style={{ height: 2000 }} />
        <div id="contents" style={{ display: 'none', height: 60, overflow: 'auto' }}>
          <Contents scrollBehavior="smooth" />
        </div>
      </>,
    );
    const contents = byId('contents');
    const api = itemAt(contents, 4);

    scrollArticle(1900);
    await expect.poll(() => api.dataset['active']).toBe('');
    expect(contents.scrollTop).toBe(0);

    contents.style.display = 'block';
    await expect.poll(() => contents.scrollTop).toBeGreaterThan(0);
    // Not smoothly, as when the active items change: nobody saw the list before.
    expect(scrollTo).toHaveBeenLastCalledWith({ top: contents.scrollTop, behavior: 'instant' });
    const item = api.getBoundingClientRect();
    const box = contents.getBoundingClientRect();
    expect(item.top).toBeGreaterThanOrEqual(box.top);
    expect(item.bottom).toBeLessThanOrEqual(box.bottom);
    expect(window.scrollY).toBe(0);
  });

  it('observes headings that scroll with the page', async () => {
    const screen = await render(<Page scrolls={false} scrollEl={undefined} />);
    const link = (name: string) => screen.getByRole('link', { name });

    byId('usage').scrollIntoView({ block: 'start' });
    await expect.element(link('Usage')).toHaveAttribute('aria-current', 'true');

    await userEvent.click(link('Install'));
    expect(byId('install').getBoundingClientRect().top).toBe(0);
    await expect.element(link('Install')).toHaveAttribute('aria-current', 'true');
  });

  it('reports the active headings, and follows them while they are controlled', async () => {
    const onActiveChange = vi.fn<(details: toc.ActiveChangeDetails) => void>();
    const screen = await render(<Page activeIds={['api']} onActiveChange={onActiveChange} />);
    const link = (name: string) => screen.getByRole('link', { name });

    await vi.waitFor(() => {
      expect(onActiveChange).toHaveBeenCalledWith({
        activeIds: ['intro'],
        activeItems: [{ value: 'intro', depth: 2 }],
      });
    });
    // Reported, not applied: the owner did not pass the ids back.
    await expect.element(link('API')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('Introduction')).not.toHaveAttribute('data-active');

    await screen.rerender(<Page activeIds={['intro']} onActiveChange={onActiveChange} />);
    await expect.element(link('Introduction')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('API')).not.toHaveAttribute('data-active');
  });

  it('observes the headings of new items', async () => {
    const onActiveChange = vi.fn<(details: toc.ActiveChangeDetails) => void>();
    const screen = await render(<Page onActiveChange={onActiveChange} />);
    const link = (name: string) => screen.getByRole('link', { name });
    await expect.element(link('Introduction')).toHaveAttribute('data-active');

    // Without the introduction, no item is in the area or above it.
    const later = items.slice(1);
    await screen.rerender(<Page items={later} onActiveChange={onActiveChange} />);
    await expect.element(link('Introduction')).not.toHaveAttribute('data-active');
    expect(onActiveChange).toHaveBeenLastCalledWith({ activeIds: [], activeItems: [] });

    scrollArticle(560);
    await expect.element(link('Install')).toHaveAttribute('aria-current', 'true');

    // The same items in a new array: nothing changes.
    onActiveChange.mockClear();
    await screen.rerender(<Page items={[...later]} onActiveChange={onActiveChange} />);
    await expect.element(link('Install')).toHaveAttribute('aria-current', 'true');
    expect(onActiveChange).not.toHaveBeenCalled();
  });

  it('finds headings whose ids a selector would have to escape', async () => {
    const screen = await render(
      <>
        <Toc.Root items={[{ value: '2.0-setup', depth: 2 }]} scrollBehavior="auto">
          <Toc.List>
            <Toc.Item item={{ value: '2.0-setup', depth: 2 }}>
              <Toc.Link>Setup</Toc.Link>
            </Toc.Item>
          </Toc.List>
        </Toc.Root>
        <div style={{ height: 1000 }} />
        <h2 id="2.0-setup">Setup</h2>
        <div style={{ height: 1000 }} />
      </>,
    );
    const link = screen.getByRole('link', { name: 'Setup' });

    await userEvent.click(link);
    expect(location.hash).toBe('#2.0-setup');
    await expect.element(link).toHaveAttribute('aria-current', 'true');
  });

  it('is named by its title only while one is mounted', async () => {
    const screen = await render(
      <Toc.Root items={items}>
        <Toc.List />
      </Toc.Root>,
    );
    await expect.element(screen.getByRole('navigation')).not.toHaveAttribute('aria-labelledby');

    await screen.rerender(
      <Toc.Root items={items}>
        <Toc.Title id="contents-title">Contents</Toc.Title>
        <Toc.List />
      </Toc.Root>,
    );
    await expect
      .element(screen.getByRole('navigation', { name: 'Contents' }))
      .toHaveAttribute('aria-labelledby', 'contents-title');
  });

  it('renders the default active ids on the server, unnamed until the title mounts', () => {
    const html = renderToStaticMarkup(<Contents defaultActiveIds={['install']} />);
    const page = new DOMParser().parseFromString(html, 'text/html');

    expect(page.querySelector('[aria-current="true"]')).toHaveTextContent('Install');
    expect(page.querySelectorAll('li[data-active]')).toHaveLength(1);
    expect(page.querySelector('nav')).not.toHaveAttribute('aria-labelledby');
  });

  it('throws when a part is rendered outside of a root, or a link outside of an item', () => {
    expect(() => renderToStaticMarkup(<Toc.List />)).toThrow(
      'Toc: render the parts inside <Toc.Root>.',
    );
    expect(() =>
      renderToStaticMarkup(
        <Toc.Root items={items}>
          <Toc.Link />
        </Toc.Root>,
      ),
    ).toThrow('Toc: render Toc.Link inside <Toc.Item>.');
  });
});

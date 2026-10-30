import { vars } from '@contour-ui/tokens';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Toc } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in pixels, as the browser computes it. */
const px = (value: string): string => computed('padding-top', value);

/** A color token as the browser computes it. */
const color = (value: string): string => computed('color', value);

/** The duration of a transition token, as the browser computes it. */
function durationOf(motion: string): string {
  const probe = document.createElement('div');
  probe.style.transition = `opacity ${motion}`;
  document.body.append(probe);
  const result = getComputedStyle(probe).transitionDuration;
  probe.remove();
  return result;
}

/** The element of a toc part in `container`; the test fails without one. */
function part(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-scope="toc"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No toc ${name}.`);
  }
  return element;
}

/** The headings: three levels, the last one short, in a scroll container 300px high. */
const sections = [
  { value: 'intro', depth: 2, title: 'Introduction' },
  { value: 'install', depth: 3, title: 'Install' },
  { value: 'npm', depth: 4, title: 'With npm' },
  { value: 'usage', depth: 2, title: 'Usage' },
] as const;

const items = sections.map(({ value, depth }) => ({ value, depth }));

interface PageProps extends Partial<Toc.RootProps> {
  /** Whether the table of contents is in a panel of its own, 60px high, that scrolls. */
  readonly panel?: boolean;
}

/** A table of contents beside its article. */
function Page({ panel = false, ...props }: PageProps): ReactElement {
  const contents = (
    <Toc.Root
      items={items}
      scrollEl={() => document.querySelector<HTMLElement>('#article')}
      scrollBehavior="auto"
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
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
      {panel ? (
        <div data-testid="panel" style={{ height: 60, overflow: 'auto' }}>
          {contents}
        </div>
      ) : (
        contents
      )}
      <section id="article" aria-label="Article" style={{ height: 300, overflow: 'auto' }}>
        {sections.map(({ value, title }) => (
          <section key={value} style={{ height: 600 }}>
            <h2 id={value} style={{ height: 30, margin: 0 }}>
              {title}
            </h2>
          </section>
        ))}
      </section>
    </div>
  );
}

const initialUrl = location.href;

afterEach(async () => {
  history.replaceState(history.state, '', initialUrl);
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

describe('Toc', () => {
  it('renders the headless parts with their classes and the user’s', async () => {
    const screen = await render(<Page className="page-contents" />);
    const nav = screen.getByRole('navigation', { name: 'On this page' });

    await expect.element(nav).toHaveAttribute('class', 'contour-toc page-contents');
    await expect.element(nav).toHaveAttribute('data-scope', 'toc');
    await expect
      .element(screen.getByText('On this page'))
      .toHaveClass('contour-toc__title', { exact: true });
    await expect.element(screen.getByRole('list')).toHaveClass('contour-toc__list');
    await expect.element(screen.getByRole('listitem').first()).toHaveClass('contour-toc__item');
    await expect
      .element(screen.getByRole('link', { name: 'Usage' }))
      .toHaveClass('contour-toc__link');
    expect(part(screen.container, 'indicator')).toHaveClass('contour-toc__indicator');
  });

  it('is styled with semantic tokens: muted links, the active ones in the default color', async () => {
    const screen = await render(<Page />);
    const nav = screen.getByRole('navigation');
    const intro = screen.getByRole('link', { name: 'Introduction' });
    const usage = screen.getByRole('link', { name: 'Usage' });
    // The pointer stays where earlier tests on the page left it; over a link, it would give the
    // link the default color.
    await userEvent.unhover(usage);

    await expect.element(intro).toHaveAttribute('data-active');
    await expect.element(intro).toHaveStyle({ color: color(vars.color.fg.default) });
    await expect.element(usage).toHaveStyle({
      color: color(vars.color.fg.muted),
      textDecorationLine: 'none',
      paddingTop: px(vars.space['control-gap']),
      paddingLeft: px(vars.space['panel-inset']),
    });
    await expect.element(nav).toHaveStyle({
      color: color(vars.color.fg.muted),
      fontSize: px(vars.text.body.fontSize),
      position: 'relative',
    });
    await expect.element(screen.getByText('On this page')).toHaveStyle({
      color: color(vars.color.fg.default),
      fontSize: px(vars.text.label.fontSize),
      fontWeight: computed('font-weight', vars.text.label.fontWeight),
    });
    await expect.element(screen.getByRole('list')).toHaveStyle({
      listStyleType: 'none',
      paddingLeft: '0px',
      borderLeftStyle: 'solid',
      borderLeftWidth: px(vars['border-width'].default),
      borderLeftColor: color(vars.color.border.default),
    });

    await userEvent.hover(usage);
    await expect.element(usage).toHaveStyle({ color: color(vars.color.fg.default) });
  });

  it('makes the heading of a clicked link current, with the indicator beside it', async () => {
    const screen = await render(<Page />);
    const link = (name: string) => screen.getByRole('link', { name });
    await expect.element(link('Introduction')).toHaveAttribute('aria-current', 'true');

    await userEvent.click(link('Usage'));
    expect(location.hash).toBe('#usage');
    await expect.element(link('Usage')).toHaveAttribute('aria-current', 'true');
    await expect.element(link('Introduction')).not.toHaveAttribute('data-active');
    expect(part(screen.container, 'indicator')).toBeVisible();
  });

  it('keeps the first active link in view in a panel that scrolls, not the page', async () => {
    const screen = await render(<Page panel />);
    const usage = screen.getByRole('link', { name: 'Usage' });
    const panel = screen.getByTestId('panel').element();
    const article = screen.getByRole('region', { name: 'Article' }).element();

    article.scrollTop = article.scrollHeight;
    await expect.element(usage).toHaveAttribute('aria-current', 'true');
    await expect
      .poll(() => usage.element().getBoundingClientRect().bottom)
      .toBeLessThanOrEqual(panel.getBoundingClientRect().bottom);
    expect(window.scrollY).toBe(0);
  });

  it('indents each level below an h2 by one step', async () => {
    const screen = await render(<Page />);
    const item = (name: string) => screen.getByRole('listitem').filter({ hasText: name });

    await expect.element(item('Introduction')).toHaveStyle({ paddingLeft: '0px' });
    await expect
      .element(item('Install'))
      .toHaveStyle({ paddingLeft: px(vars.space['panel-inset']) });
    await expect
      .element(item('With npm'))
      .toHaveStyle({ paddingLeft: px(`calc(2 * ${vars.space['panel-inset']})`) });
  });

  it('draws the indicator over the line, along the active items', async () => {
    const screen = await render(<Page />);
    const nav = screen.getByRole('navigation').element();
    const indicator = part(screen.container, 'indicator');
    const item = screen.getByRole('listitem').first().element();

    await expect.poll(() => indicator.hidden).toBe(false);
    const style = getComputedStyle(indicator);
    expect(style.position).toBe('absolute');
    expect(style.backgroundColor).toBe(computed('background-color', vars.color.accent.fill));
    expect(style.width).toBe(px(vars['border-width'].focus));
    // Over the line at the start of the list, as tall as the active item and level with it.
    const box = indicator.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    expect(box.left).toBe(nav.getBoundingClientRect().left);
    expect(box.top).toBeCloseTo(rect.top, 1);
    expect(box.height).toBeCloseTo(rect.height, 1);
  });

  it('slides the indicator, and moves it at once when the user prefers reduced motion', async () => {
    const screen = await render(<Page />);
    const indicator = part(screen.container, 'indicator');
    const duration = durationOf(vars.motion.feedback);

    expect(getComputedStyle(indicator).transitionProperty).toBe('translate, block-size');
    expect(getComputedStyle(indicator).transitionDuration).toBe(`${duration}, ${duration}`);

    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await expect.poll(() => getComputedStyle(indicator).transitionDuration).toBe('0s');
  });

  it('shows the focus ring inside a link on keyboard focus', async () => {
    const screen = await render(<Page />);
    const intro = screen.getByRole('link', { name: 'Introduction' });

    await userEvent.keyboard('{Tab}');
    await expect.element(intro).toHaveFocus();
    await expect.element(intro).toHaveStyle({
      outlineStyle: 'solid',
      outlineColor: color(vars.color.border.focus),
      outlineWidth: px(vars['border-width'].focus),
      // Negative, so it is computed as a margin: a padding cannot be.
      outlineOffset: computed('margin-top', `calc(-1 * ${vars['border-width'].focus})`),
    });
  });
});

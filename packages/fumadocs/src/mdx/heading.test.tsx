import { vars } from '@contour-ui/tokens';
import type { ComponentProps, ComponentType } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { getMdxComponents } from './get-mdx-components.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/kit/styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** The decorative hash inside a heading. */
function hashOf(element: Element): SVGSVGElement {
  const hash = element.querySelector('svg');
  if (hash === null) {
    throw new Error('The heading has no hash');
  }
  return hash;
}

/** The heading component of a Markdown level, as MDX finds it in the map. */
function heading(level: 1 | 2 | 3 | 4 | 5 | 6): ComponentType<ComponentProps<'h2'>> {
  const Heading = getMdxComponents()[`h${level}`];
  if (typeof Heading !== 'function') {
    throw new TypeError(`No component for h${level}`);
  }
  return Heading as ComponentType<ComponentProps<'h2'>>;
}

describe('Markdown headings', () => {
  it('render each level as its element, with a link to itself', async () => {
    const levels = [1, 2, 3, 4, 5, 6] as const;
    const screen = await render(
      <>
        {levels.map((level) => {
          const Heading = heading(level);
          return (
            <Heading key={level} id={`level-${level}`}>
              Level {level}
            </Heading>
          );
        })}
      </>,
    );

    for (const level of levels) {
      const element = screen.getByRole('heading', { level, name: `Level ${level}` });
      const link = element.getByRole('link', { name: `Level ${level}` });

      expect(element.element().tagName).toBe(`H${level}`);
      expect(element.element()).toHaveAttribute('id', `level-${level}`);
      expect(element.element()).toHaveClass('contour-docs-heading', { exact: true });
      expect(link.element()).toHaveAttribute('href', `#level-${level}`);
      expect(link.element()).toHaveClass('contour-docs-heading__link', { exact: true });
    }
  });

  it('keep the props of the heading and hide the hash from assistive technology', async () => {
    const H2 = heading(2);
    const screen = await render(
      <H2 id="usage" className="custom" data-level="2">
        Usage
      </H2>,
    );
    const element = screen.getByRole('heading', { level: 2, name: 'Usage' }).element();
    const hash = hashOf(element);

    expect(element).toHaveClass('contour-docs-heading custom', { exact: true });
    expect(element).toHaveAttribute('data-level', '2');
    expect(hash).toHaveClass('contour-docs-heading__hash');
    expect(hash).toHaveAttribute('aria-hidden', 'true');
  });

  it('stay plain headings without an id', async () => {
    const H3 = heading(3);
    const screen = await render(<H3 className="custom">No anchor</H3>);
    const element = screen.getByRole('heading', { level: 3, name: 'No anchor' }).element();

    expect(element).toHaveClass('custom', { exact: true });
    expect(element.querySelector('a')).toBeNull();
    expect(element.querySelector('svg')).toBeNull();
  });

  it('show the hash while the heading is hovered', async () => {
    const H2 = heading(2);
    const screen = await render(<H2 id="hover">Hover</H2>);
    const element = screen.getByRole('heading', { name: 'Hover' });
    const hash = hashOf(element.element());
    await userEvent.unhover(element);
    await expect.poll(() => getComputedStyle(hash).opacity).toBe('0');

    await userEvent.hover(element);
    await expect.poll(() => getComputedStyle(hash).opacity).toBe('1');
    await userEvent.unhover(element);
  });

  it('keep the sticky bars of the layout free above them when jumped to', async () => {
    const H2 = heading(2);
    const screen = await render(
      <div
        style={{
          ['--contour-docs-header-height' as string]: '48px',
          ['--contour-docs-toc-bar-height' as string]: '40px',
        }}
      >
        <H2 id="jump">Jump</H2>
      </div>,
    );
    const margin = computed('padding-top', `calc(48px + 40px + ${vars.space['section-gap']})`);

    await expect
      .element(screen.getByRole('heading', { name: 'Jump' }))
      .toHaveStyle({ scrollMarginTop: margin });
  });

  it('keep the section gap free above them outside the layout', async () => {
    const H2 = heading(2);
    const screen = await render(<H2 id="alone">Alone</H2>);

    await expect
      .element(screen.getByRole('heading', { name: 'Alone' }))
      .toHaveStyle({ scrollMarginTop: computed('padding-top', vars.space['section-gap']) });
  });
});

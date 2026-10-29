import { Card } from '@contour-ui/react';
import { vars } from '@contour-ui/tokens';
import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Preview } from './preview.tsx';
import { Prose } from './prose.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
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

/** A length token in px. */
const px = (value: string): string => computed('padding-top', value);

/** The block margins of an element, top then bottom. */
function marginsOf(element: Element | null): [string, string] {
  if (element === null) {
    throw new Error('No element');
  }
  const style = getComputedStyle(element);
  return [style.marginTop, style.marginBottom];
}

describe('Prose', () => {
  it('renders a `div` with its class and the given props', async () => {
    const screen = await render(
      <Prose className="custom" data-testid="prose">
        <p>Text</p>
      </Prose>,
    );
    const prose = screen.getByTestId('prose');

    await expect.element(prose).toHaveClass('contour-docs-prose custom', { exact: true });
    expect(prose.element().tagName).toBe('DIV');
  });

  it('sets the reading font and spaces the blocks, but not the outer edges', async () => {
    const screen = await render(
      <Prose data-testid="prose">
        <p>First</p>
        <p>Second</p>
        <ul>
          <li>Item</li>
        </ul>
      </Prose>,
    );
    const gap = px(vars.space['section-gap']);
    const prose = screen.getByTestId('prose');

    await expect.element(prose).toHaveStyle({
      color: computed('color', vars.color.fg.default),
      fontSize: computed('font-size', vars.text.prose.fontSize),
    });
    expect(marginsOf(screen.getByText('First').element())).toStrictEqual(['0px', gap]);
    expect(marginsOf(screen.getByText('Second').element())).toStrictEqual([gap, gap]);
    expect(marginsOf(screen.getByRole('list').element())).toStrictEqual([gap, '0px']);
  });

  it('leaves the components inside it their own styles', async () => {
    const screen = await render(
      <Prose>
        <Card.Root>
          <Card.Body>
            <Card.Title>Session</Card.Title>
            <Card.Description>48 kHz, 24-bit</Card.Description>
          </Card.Body>
        </Card.Root>
      </Prose>,
    );

    // Prose spaces the block after a heading, but Kit ranks above it.
    expect(marginsOf(screen.getByText('48 kHz, 24-bit').element())).toStrictEqual(['0px', '0px']);
  });

  it('leaves alone everything inside `contour-docs-not-prose`', async () => {
    const screen = await render(
      <Prose>
        <ul data-testid="styled">
          <li>Styled</li>
        </ul>
        <div className="contour-docs-not-prose" data-testid="opt-out">
          <ul data-testid="unstyled">
            <li>Unstyled</li>
          </ul>
        </div>
        <p>After</p>
      </Prose>,
    );
    const styled = getComputedStyle(screen.getByTestId('styled').element());
    const unstyled = getComputedStyle(screen.getByTestId('unstyled').element());
    const indent = px(`calc(${vars.space['section-gap']} + ${vars.space['group-gap']})`);

    expect(styled.paddingInlineStart).toBe(indent);
    // The browser's defaults.
    expect(unstyled.paddingInlineStart).toBe('40px');
    expect(unstyled.marginTop).toBe(unstyled.fontSize);
    // The opt-out element itself is spaced as a block.
    expect(marginsOf(screen.getByTestId('opt-out').element())).toStrictEqual([
      px(vars.space['section-gap']),
      px(vars.space['section-gap']),
    ]);
  });
});

describe('Preview', () => {
  it('frames live examples outside Prose, side by side', async () => {
    const screen = await render(
      <Prose>
        <p>Before</p>
        <Preview className="custom" data-testid="preview">
          <figure data-testid="example">Example</figure>
          <p>Second example</p>
        </Preview>
      </Prose>,
    );
    const preview = screen.getByTestId('preview');

    await expect
      .element(preview)
      .toHaveClass('contour-docs-preview contour-docs-not-prose custom', { exact: true });
    await expect.element(preview).toHaveStyle({
      display: 'flex',
      flexWrap: 'wrap',
      paddingTop: px(`calc(2 * ${vars.space['panel-inset']})`),
      backgroundColor: computed('background-color', vars.color.bg.canvas),
      marginTop: px(vars.space['section-gap']),
    });
    // The gap spaces the examples: no margins of their own, not even the browser's.
    expect(marginsOf(screen.getByTestId('example').element())).toStrictEqual(['0px', '0px']);
    expect(marginsOf(screen.getByText('Second example').element())).toStrictEqual(['0px', '0px']);
  });
});

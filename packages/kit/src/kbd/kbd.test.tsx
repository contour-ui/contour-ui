import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Kbd } from '../index.ts';

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

describe('Kbd', () => {
  it('renders a `<kbd>` with its class and attributes, `md` by default', async () => {
    const screen = await render(<Kbd className="shortcut">K</Kbd>);
    const key = screen.getByText('K');

    expect(key.element().tagName).toBe('KBD');
    await expect.element(key).toHaveAttribute('class', 'contour-kbd shortcut');
    await expect.element(key).toHaveAttribute('data-scope', 'kbd');
    await expect.element(key).toHaveAttribute('data-part', 'root');
    await expect.element(key).toHaveAttribute('data-size', 'md');
  });

  it('is styled with semantic tokens', async () => {
    const screen = await render(<Kbd>K</Kbd>);
    const key = screen.getByText('K');
    const surface = computed('background-color', vars.color.bg.surface);

    // The token resolves to a real color (tokens.css is loaded), and the kit uses it.
    expect(surface).toMatch(/^oklch\(/u);
    await expect.element(key).toHaveStyle({
      backgroundColor: surface,
      color: computed('color', vars.color.fg.muted),
      // `toHaveStyle` resolves the expected widths on a probe element: without a style, they are 0.
      borderTopStyle: 'solid',
      borderTopColor: computed('color', vars.color.border.default),
      borderTopWidth: computed('padding-top', vars['border-width'].default),
      borderTopLeftRadius: computed('padding-top', vars.radius.control),
      fontFamily: computed('font-family', vars.text.label.fontFamily),
    });
  });

  it('has a bottom edge twice as thick as the others', async () => {
    const screen = await render(<Kbd>K</Kbd>);
    const border = vars['border-width'].default;

    await expect.element(screen.getByText('K')).toHaveStyle({
      borderTopStyle: 'solid',
      borderBottomStyle: 'solid',
      borderTopWidth: computed('padding-top', border),
      borderBottomWidth: computed('padding-top', `calc(2 * ${border})`),
    });
  });

  it.each([
    ['sm', vars.size['icon-md']],
    ['md', vars.size['icon-lg']],
  ] as const)('puts a single character on a square key in size %s', async (size, height) => {
    const screen = await render(
      <>
        <Kbd size={size}>K</Kbd>
        <Kbd size={size}>Shift</Kbd>
      </>,
    );
    const key = screen.getByText('K');
    const single = key.element().getBoundingClientRect();
    const word = screen.getByText('Shift').element().getBoundingClientRect();

    await expect.element(key).toHaveAttribute('data-size', size);
    expect(`${single.height}px`).toBe(computed('height', height));
    expect(single.width).toBe(single.height);
    // A longer label widens the key instead of overflowing it.
    expect(word.height).toBe(single.height);
    expect(word.width).toBeGreaterThan(single.width);
  });

  it('passes its ref and props on to the `<kbd>`', async () => {
    const ref = createRef<HTMLElement>();
    const screen = await render(
      <Kbd ref={ref} title="Command">
        ⌘
      </Kbd>,
    );
    const key = screen.getByText('⌘');

    expect(ref.current).toBe(key.element());
    await expect.element(key).toHaveAttribute('title', 'Command');
  });
});
